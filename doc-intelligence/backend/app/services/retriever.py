"""Retriever using Gemini REST API for concise markdown answers with fast fallback."""
from __future__ import annotations

import logging
import re

import anyio
import httpx
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue, ScoredPoint

from app.config import (
    CHAT_CONTEXT_CHAR_LIMIT,
    CHAT_TABLE_CITATION_LIMIT,
    GEMINI_QA_MODEL,
    NO_CONTEXT_ANSWER,
    PAYLOAD_CHUNK_INDEX,
    PAYLOAD_DOC_ID,
    PAYLOAD_PAGE_NUMBER,
    PAYLOAD_SOURCE_FILENAME,
    PAYLOAD_TEXT,
    get_settings,
)
from app.models.schemas import Citation, QueryResponse
from app.services.vectorizer import embed_query

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
_GENERATION_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite"]
_RETRY_BACKOFF = [1.5, 4.0]


class DocumentRetriever:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.qdrant = AsyncQdrantClient(url=self.settings.QDRANT_URL)

    async def query(
        self,
        question: str,
        doc_id: str | None,
        top_k: int = 4,
    ) -> QueryResponse:
        if not await self._collection_exists():
            return QueryResponse(
                answer=NO_CONTEXT_ANSWER,
                citations=[],
                model_used=GEMINI_QA_MODEL,
            )

        question_vector = embed_query(question)
        points = await self._search(question_vector, doc_id, top_k)
        citations = [_citation(point) for point in points]
        if not citations:
            return QueryResponse(
                answer=NO_CONTEXT_ANSWER,
                citations=[],
                model_used=GEMINI_QA_MODEL,
            )

        answer, model_used = await self._generate_answer(question, citations)
        return QueryResponse(answer=answer, citations=citations, model_used=model_used)

    async def _collection_exists(self) -> bool:
        collections = await self.qdrant.get_collections()
        names = {item.name for item in collections.collections}
        return self.settings.QDRANT_COLLECTION in names

    async def _search(
        self,
        question_vector: list[float],
        doc_id: str | None,
        top_k: int,
    ) -> list[ScoredPoint]:
        response = await self.qdrant.query_points(
            collection_name=self.settings.QDRANT_COLLECTION,
            query=question_vector,
            query_filter=_doc_filter(doc_id),
            limit=max(1, min(top_k, 6)),
            with_payload=True,
        )
        return response.points

    async def _generate_answer(
        self,
        question: str,
        citations: list[Citation],
    ) -> tuple[str, str]:
        if not self.settings.GEMINI_API_KEY:
            return _local_markdown_answer(question, citations), "local-extractive"

        prompt = _build_prompt(question, citations)
        async with httpx.AsyncClient(timeout=35.0) as client:
            for model in _GENERATION_MODELS:
                url = f"{GEMINI_BASE_URL}/models/{model}:generateContent"
                for attempt in range(len(_RETRY_BACKOFF) + 1):
                    if attempt:
                        await anyio.sleep(_RETRY_BACKOFF[attempt - 1])
                    try:
                        response = await client.post(
                            url,
                            params={"key": self.settings.GEMINI_API_KEY},
                            json={"contents": [{"parts": [{"text": prompt}]}]},
                        )
                    except httpx.HTTPError:
                        logger.exception("Generation request failed for %s", model)
                        break

                    if response.status_code in {429, 503} and attempt < len(_RETRY_BACKOFF):
                        logger.info("Retrying %s after temporary response %s", model, response.status_code)
                        continue
                    if response.status_code != 200:
                        logger.error(
                            "Generation error %s on %s: %s",
                            response.status_code,
                            model,
                            response.text,
                        )
                        break

                    try:
                        data = response.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    except Exception:
                        logger.exception("Unexpected Gemini response shape for %s", model)
                        break
                    return text, model

        logger.warning("Falling back to local markdown answer generation")
        return _local_markdown_answer(question, citations), "local-extractive"


def _build_prompt(question: str, citations: list[Citation]) -> str:
    context_blocks = []
    for index, citation in enumerate(citations, start=1):
        context_blocks.append(
            f"[Source {index} | {citation.source_filename} | Page {citation.page_number}]\n"
            f"{_trim_chunk(citation.chunk_text)}"
        )
    context = "\n\n".join(context_blocks)
    return (
        "You are a polished document assistant.\n"
        "Answer only from the provided context.\n"
        "Respond in clean markdown for normal users.\n"
        "Use this structure when possible:\n"
        "## Direct answer\n"
        "## Key points\n"
        "## Evidence table\n"
        "Keep the reply under 220 words unless the user explicitly asks for detail.\n"
        "Use short bullet points and a compact markdown table when evidence helps.\n"
        "If the context is incomplete, say what is missing instead of guessing.\n\n"
        f"DOCUMENT CONTEXT:\n{context}\n\n"
        f"USER QUESTION: {question}\n"
    )


def _local_markdown_answer(question: str, citations: list[Citation]) -> str:
    snippets = [_best_sentence(_trim_chunk(citation.chunk_text)) for citation in citations[:3]]
    direct_answer = " ".join(snippet for snippet in snippets if snippet) or NO_CONTEXT_ANSWER
    bullets = [
        f"- {snippet}"
        for snippet in snippets[:3]
        if snippet
    ]
    table_rows = [
        f"| {citation.page_number} | {citation.source_filename} | {_table_reason(citation.chunk_text)} |"
        for citation in citations[:CHAT_TABLE_CITATION_LIMIT]
    ]
    bullets_section = "\n".join(bullets) if bullets else "- I could not extract a stronger answer from the indexed context."
    table_section = (
        "| Page | Source | Why it matters |\n| --- | --- | --- |\n" + "\n".join(table_rows)
        if table_rows
        else ""
    )
    return (
        "## Direct answer\n"
        f"{direct_answer}\n\n"
        "## Key points\n"
        f"{bullets_section}\n\n"
        "## Evidence table\n"
        f"{table_section or 'Not enough evidence was retrieved to build a table.'}\n\n"
        f"_Generated from the best matching passages for: {question}_"
    )


def _best_sentence(text: str) -> str:
    candidates = [
        " ".join(part.split())
        for part in re.split(r"(?<=[.!?])\s+|\n+", text)
        if len(part.split()) >= 5
    ]
    if not candidates:
        return text[:180].strip()
    return candidates[0][:180].strip()


def _table_reason(text: str) -> str:
    sentence = _best_sentence(text)
    if len(sentence) <= 70:
        return sentence
    return sentence[:67].rstrip() + "..."


def _trim_chunk(text: str) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= CHAT_CONTEXT_CHAR_LIMIT:
        return cleaned
    return cleaned[: CHAT_CONTEXT_CHAR_LIMIT - 1].rstrip() + "..."


def _doc_filter(doc_id: str | None) -> Filter | None:
    if not doc_id:
        return None
    return Filter(must=[FieldCondition(key=PAYLOAD_DOC_ID, match=MatchValue(value=doc_id))])


def _citation(point: ScoredPoint) -> Citation:
    payload = point.payload or {}
    return Citation(
        page_number=int(payload.get(PAYLOAD_PAGE_NUMBER, 0)),
        chunk_index=int(payload.get(PAYLOAD_CHUNK_INDEX, 0)),
        chunk_text=str(payload.get(PAYLOAD_TEXT, "")),
        score=float(point.score),
        source_filename=str(payload.get(PAYLOAD_SOURCE_FILENAME, "")),
    )

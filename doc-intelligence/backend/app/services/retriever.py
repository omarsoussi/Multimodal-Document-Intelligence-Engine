"""Retriever using Gemini REST API for generative answers with retry logic."""
import logging
import time

import httpx
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue, ScoredPoint

from app.config import (
    GEMINI_QA_MODEL,
    GEMINI_SYSTEM_PROMPT,
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

# Ordered list of models to try — fastest/highest-quota first
_GENERATION_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
]

_MAX_RETRIES = 3
_RETRY_BACKOFF = [5, 15, 30]  # seconds between retries


class DocumentRetriever:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.qdrant = AsyncQdrantClient(url=self.settings.QDRANT_URL)

    async def query(
        self,
        question: str,
        doc_id: str | None,
        top_k: int = 5,
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
            limit=top_k,
            with_payload=True,
        )
        return response.points

    async def _generate_answer(
        self, question: str, citations: list[Citation]
    ) -> tuple[str, str]:
        """Try each generation model with retry on 429. Returns (answer, model_used)."""
        context_blocks = []
        for i, c in enumerate(citations, 1):
            context_blocks.append(
                f"[Source {i} — {c.source_filename}, Page {c.page_number}]\n{c.chunk_text}"
            )
        context = "\n\n".join(context_blocks)

        prompt = (
            f"{GEMINI_SYSTEM_PROMPT}\n\n"
            f"DOCUMENT CONTEXT:\n{context}\n\n"
            f"USER QUESTION: {question}\n\n"
            f"ANSWER:"
        )

        key = self.settings.GEMINI_API_KEY

        for model in _GENERATION_MODELS:
            url = f"{GEMINI_BASE_URL}/models/{model}:generateContent"
            for attempt, wait in enumerate([0] + _RETRY_BACKOFF):
                if wait:
                    logger.info("Rate limited — retrying %s in %ds (attempt %d)", model, wait, attempt)
                    time.sleep(wait)
                try:
                    response = httpx.post(
                        url,
                        params={"key": key},
                        json={"contents": [{"parts": [{"text": prompt}]}]},
                        timeout=90.0,
                    )
                    if response.status_code == 429:
                        # Extract suggested retry delay if provided
                        try:
                            retry_info = response.json()
                            for detail in retry_info.get("error", {}).get("details", []):
                                if "retryDelay" in detail:
                                    delay_str = detail["retryDelay"].rstrip("s")
                                    suggested = int(delay_str)
                                    logger.info("API suggests retry in %ds", suggested)
                        except Exception:
                            pass
                        if attempt < _MAX_RETRIES:
                            continue  # retry same model
                        else:
                            logger.warning("Model %s exhausted retries, trying next model", model)
                            break  # try next model

                    if response.status_code != 200:
                        logger.error("Generation error %s on %s: %s", response.status_code, model, response.text)
                        break  # non-recoverable for this model, try next

                    data = response.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    logger.info("Answer generated with model: %s", model)
                    return text, model

                except Exception:
                    logger.exception("Unexpected error calling model %s", model)
                    break  # try next model

        logger.error("All generation models failed")
        return NO_CONTEXT_ANSWER, GEMINI_QA_MODEL


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

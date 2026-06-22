from datetime import UTC, datetime
from typing import TypedDict
from uuid import uuid4

from llama_index.core.node_parser import TokenTextSplitter
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import (
    EMBEDDING_VECTOR_SIZE,
    PAYLOAD_CHUNK_INDEX,
    PAYLOAD_DOC_ID,
    PAYLOAD_PAGE_NUMBER,
    PAYLOAD_SOURCE_FILENAME,
    PAYLOAD_TEXT,
    PAYLOAD_UPLOADED_AT,
    QDRANT_UPSERT_BATCH_SIZE,
    get_settings,
)
from app.models.schemas import PageContent
from app.services.vectorizer import embed_texts


class ChunkRecord(TypedDict):
    text: str
    payload: dict[str, str | int]


class DocumentEmbedder:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.qdrant = AsyncQdrantClient(url=self.settings.QDRANT_URL)
        self.splitter = TokenTextSplitter(
            chunk_size=self.settings.CHUNK_SIZE,
            chunk_overlap=self.settings.CHUNK_OVERLAP,
        )

    async def chunk_and_embed(self, doc_id: str, pages: list[PageContent]) -> int:
        await self._ensure_collection()
        chunks = await self._build_chunks(doc_id, pages)
        if not chunks:
            return 0
        embeddings = await self._embed_texts([chunk["text"] for chunk in chunks])
        points = _points(chunks, embeddings)
        await self._upsert_batches(points)
        return len(points)

    async def _ensure_collection(self) -> None:
        collections = await self.qdrant.get_collections()
        names = {item.name for item in collections.collections}
        if self.settings.QDRANT_COLLECTION in names:
            # Check if existing collection has correct vector size; recreate if not.
            info = await self.qdrant.get_collection(self.settings.QDRANT_COLLECTION)
            existing_size = info.config.params.vectors.size
            if existing_size != EMBEDDING_VECTOR_SIZE:
                await self.qdrant.delete_collection(self.settings.QDRANT_COLLECTION)
            else:
                return
        await self.qdrant.create_collection(
            collection_name=self.settings.QDRANT_COLLECTION,
            vectors_config=VectorParams(
                size=EMBEDDING_VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )

    async def _build_chunks(self, doc_id: str, pages: list[PageContent]) -> list[ChunkRecord]:
        uploaded_at = datetime.now(UTC).isoformat()
        records: list[ChunkRecord] = []
        for page in pages:
            for chunk_text in self.splitter.split_text(page.text):
                if chunk_text.strip():
                    records.append(_chunk_record(doc_id, page, chunk_text, uploaded_at))
        return records

    async def _embed_texts(self, texts: list[str]) -> list[list[float]]:
        return embed_texts(texts)

    async def _upsert_batches(self, points: list[PointStruct]) -> None:
        for index in range(0, len(points), QDRANT_UPSERT_BATCH_SIZE):
            batch = points[index : index + QDRANT_UPSERT_BATCH_SIZE]
            await self.qdrant.upsert(
                collection_name=self.settings.QDRANT_COLLECTION,
                points=batch,
            )


def _chunk_record(
    doc_id: str,
    page: PageContent,
    chunk_text: str,
    uploaded_at: str,
) -> ChunkRecord:
    return {
        "text": chunk_text,
        "payload": {
            PAYLOAD_DOC_ID: doc_id,
            PAYLOAD_PAGE_NUMBER: page.page_number,
            PAYLOAD_CHUNK_INDEX: 0,
            PAYLOAD_TEXT: chunk_text,
            PAYLOAD_SOURCE_FILENAME: page.source,
            PAYLOAD_UPLOADED_AT: uploaded_at,
        },
    }


def _points(
    chunks: list[ChunkRecord],
    embeddings: list[list[float]],
) -> list[PointStruct]:
    points: list[PointStruct] = []
    for index, chunk in enumerate(chunks):
        payload = dict(chunk["payload"])
        payload[PAYLOAD_CHUNK_INDEX] = index
        points.append(PointStruct(id=str(uuid4()), vector=embeddings[index], payload=payload))
    return points

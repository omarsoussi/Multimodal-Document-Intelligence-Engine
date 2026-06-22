from collections import Counter
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, HTTPException
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue, Record

from app.config import (
    get_settings,
    HASH_STOP_WORDS,
    PAYLOAD_DOC_ID,
    PAYLOAD_PAGE_NUMBER,
    PAYLOAD_SOURCE_FILENAME,
    PAYLOAD_TEXT,
    PAYLOAD_UPLOADED_AT,
    RECENT_DAYS_WINDOW,
    STATS_PREFIX,
    STATS_TAG,
    TOP_DOCUMENTS_LIMIT,
    TOP_KEYWORDS_LIMIT,
)
from app.models.schemas import (
    DateCountPoint,
    DocumentStats,
    KeywordStat,
    OverviewStats,
    PageChunkStat,
    TopDocumentStat,
)

router = APIRouter(prefix=STATS_PREFIX, tags=[STATS_TAG])


@router.get("/overview", response_model=OverviewStats)
async def get_overview_stats() -> OverviewStats:
    """Return aggregate document statistics across all indexed chunks."""
    records = await _scroll_records()
    docs = _group_documents(records)
    top_documents = _top_documents(docs)
    return OverviewStats(
        total_documents=len(docs),
        total_chunks=len(records),
        total_pages=sum(item["pages"] for item in docs.values()),
        avg_chunks_per_doc=_avg_chunks(len(records), len(docs)),
        documents_by_date=_documents_by_date(docs),
        top_documents=top_documents,
        storage_used_kb=_storage_used(records),
    )


@router.get("/documents/{doc_id}", response_model=DocumentStats)
async def get_document_stats(doc_id: str) -> DocumentStats:
    """Return analytics for one indexed document."""
    records = await _scroll_records(_doc_filter(doc_id))
    if not records:
        raise HTTPException(status_code=404, detail="Document stats not found.")
    lengths = [len(_text(record)) for record in records]
    page_counts = Counter(_page_number(record) for record in records)
    filename = str((records[0].payload or {}).get(PAYLOAD_SOURCE_FILENAME, ""))
    return DocumentStats(
        doc_id=doc_id,
        filename=filename,
        total_chunks=len(records),
        total_pages=max(page_counts) if page_counts else 0,
        avg_chunk_length=round(sum(lengths) / len(lengths), 2),
        longest_chunk_length=max(lengths),
        shortest_chunk_length=min(lengths),
        chunks_per_page=_page_chunk_stats(page_counts),
        top_keywords=_top_keywords(records),
        uploaded_at=str((records[0].payload or {}).get(PAYLOAD_UPLOADED_AT, "")),
        estimated_word_count=_word_count(records),
    )


async def _scroll_records(scroll_filter: Filter | None = None) -> list[Record]:
    settings = get_settings()
    qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
    records: list[Record] = []
    offset = None
    while True:
        batch, offset = await qdrant.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=scroll_filter,
            limit=200,
            offset=offset,
            with_payload=True,
        )
        records.extend(batch)
        if offset is None:
            return records


def _group_documents(records: list[Record]) -> dict[str, dict[str, str | int]]:
    grouped: dict[str, dict[str, str | int]] = {}
    for record in records:
        doc_id = str((record.payload or {}).get(PAYLOAD_DOC_ID, ""))
        entry = grouped.setdefault(doc_id, _doc_entry(record))
        entry["chunks"] = int(entry["chunks"]) + 1
        entry["pages"] = max(int(entry["pages"]), _page_number(record))
    return grouped


def _doc_entry(record: Record) -> dict[str, str | int]:
    payload = record.payload or {}
    return {
        "filename": str(payload.get(PAYLOAD_SOURCE_FILENAME, "")),
        "chunks": 0,
        "pages": 0,
        "uploaded_at": str(payload.get(PAYLOAD_UPLOADED_AT, "")),
    }


def _top_documents(docs: dict[str, dict[str, str | int]]) -> list[TopDocumentStat]:
    ranked = sorted(docs.values(), key=lambda item: int(item["chunks"]), reverse=True)
    return [
        TopDocumentStat(
            filename=str(item["filename"]),
            chunk_count=int(item["chunks"]),
            uploaded_at=str(item["uploaded_at"]),
            pages=int(item["pages"]),
        )
        for item in ranked[:TOP_DOCUMENTS_LIMIT]
    ]


def _documents_by_date(docs: dict[str, dict[str, str | int]]) -> list[DateCountPoint]:
    today = datetime.now(UTC).date()
    counts = Counter(_date_key(str(item["uploaded_at"])) for item in docs.values())
    return [
        DateCountPoint(date=day.isoformat(), count=counts.get(day.isoformat(), 0))
        for day in _recent_days(today)
    ]


def _recent_days(today: date) -> list[date]:
    start = today - timedelta(days=RECENT_DAYS_WINDOW - 1)
    return [start + timedelta(days=offset) for offset in range(RECENT_DAYS_WINDOW)]


def _date_key(value: str) -> str:
    if not value:
        return ""
    return datetime.fromisoformat(value).date().isoformat()


def _avg_chunks(total_chunks: int, total_documents: int) -> float:
    if total_documents == 0:
        return 0.0
    return round(total_chunks / total_documents, 2)


def _storage_used(records: list[Record]) -> float:
    total_chars = sum(len(_text(record)) for record in records)
    return round(total_chars / 1024, 2)


def _page_chunk_stats(page_counts: Counter[int]) -> list[PageChunkStat]:
    return [
        PageChunkStat(page=page, chunk_count=page_counts[page])
        for page in sorted(page_counts)
    ]


def _top_keywords(records: list[Record]) -> list[KeywordStat]:
    counts = Counter(_keywords(records))
    return [
        KeywordStat(word=word, count=count)
        for word, count in counts.most_common(TOP_KEYWORDS_LIMIT)
    ]


def _keywords(records: list[Record]) -> list[str]:
    words: list[str] = []
    for record in records:
        for token in _text(record).lower().split():
            cleaned = token.strip(".,;:!?()[]{}\"'")
            if cleaned and cleaned not in HASH_STOP_WORDS:
                words.append(cleaned)
    return words


def _word_count(records: list[Record]) -> int:
    return sum(len(_text(record).split()) for record in records)


def _doc_filter(doc_id: str) -> Filter:
    return Filter(must=[FieldCondition(key=PAYLOAD_DOC_ID, match=MatchValue(value=doc_id))])


def _page_number(record: Record) -> int:
    return int((record.payload or {}).get(PAYLOAD_PAGE_NUMBER, 0))


def _text(record: Record) -> str:
    return str((record.payload or {}).get(PAYLOAD_TEXT, ""))

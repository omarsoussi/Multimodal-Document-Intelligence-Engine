from fastapi import APIRouter, HTTPException
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue, Record

from app.config import (
    PAYLOAD_DOC_ID,
    STATS_PREFIX,
    STATS_TAG,
    get_settings,
)
from app.models.schemas import DocumentStats, OverviewStats
from app.services.document_insights import build_overview, build_profiles, profile_to_stats

router = APIRouter(prefix=STATS_PREFIX, tags=[STATS_TAG])


@router.get("/overview", response_model=OverviewStats)
async def get_overview_stats() -> OverviewStats:
    records = await _scroll_records()
    profiles = build_profiles(records)
    return build_overview(profiles)


@router.get("/documents/{doc_id}", response_model=DocumentStats)
async def get_document_stats(doc_id: str) -> DocumentStats:
    records = await _scroll_records(_doc_filter(doc_id))
    profiles = build_profiles(records)
    profile = profiles.get(doc_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Document stats not found.")
    return profile_to_stats(profile)


async def _scroll_records(scroll_filter: Filter | None = None) -> list[Record]:
    settings = get_settings()
    qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
    if not await _collection_exists(qdrant):
        return []
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


async def _collection_exists(qdrant: AsyncQdrantClient) -> bool:
    settings = get_settings()
    collections = await qdrant.get_collections()
    names = {item.name for item in collections.collections}
    return settings.QDRANT_COLLECTION in names


def _doc_filter(doc_id: str) -> Filter:
    return Filter(must=[FieldCondition(key=PAYLOAD_DOC_ID, match=MatchValue(value=doc_id))])

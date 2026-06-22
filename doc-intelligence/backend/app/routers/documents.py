import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    Record,
)

from app.config import (
    DOC_ID_PATH,
    DOCUMENTS_PREFIX,
    DOCUMENTS_TAG,
    PAYLOAD_DOC_ID,
    PAYLOAD_SOURCE_FILENAME,
    PAYLOAD_UPLOADED_AT,
    ROOT_PATH,
    UPLOAD_PATH,
    get_settings,
)
from app.models.schemas import (
    DocumentDeleteResponse,
    DocumentMetadata,
    DocumentUploadResponse,
    PageContent,
    StoredFile,
)
from app.services.embedder import DocumentEmbedder
from app.services.parser import DocumentParser
from app.utils.file_handler import save_upload

router = APIRouter(prefix=DOCUMENTS_PREFIX, tags=[DOCUMENTS_TAG])
logger = logging.getLogger(__name__)


@router.post(UPLOAD_PATH, response_model=DocumentUploadResponse, status_code=201)
async def upload_document(file: UploadFile = File(...)) -> DocumentUploadResponse:
    """Upload one PDF, image, or DOCX file and return indexed document metadata."""
    stored = await save_upload(file)
    try:
        pages = await _parse_document(stored)
        chunk_count = await DocumentEmbedder().chunk_and_embed(stored.doc_id, pages)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Document upload failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return DocumentUploadResponse(
        id=stored.doc_id,
        filename=stored.filename,
        chunk_count=chunk_count,
        uploaded_at=stored.uploaded_at,
        message="Document ready",
    )


@router.get(ROOT_PATH, response_model=list[DocumentMetadata])
async def list_documents() -> list[DocumentMetadata]:
    """List all indexed documents with id, filename, chunk count, and upload time."""
    settings = get_settings()
    qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
    if not await _collection_exists(qdrant):
        return []
    records = await _scroll_records(qdrant)
    return _metadata_from_records(records)


@router.delete(DOC_ID_PATH, response_model=DocumentDeleteResponse)
async def delete_document(doc_id: str) -> DocumentDeleteResponse:
    """Delete one document and all of its vectors from Qdrant by document id."""
    settings = get_settings()
    qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
    if not await _document_exists(qdrant, doc_id):
        raise HTTPException(status_code=404, detail="Document not found.")
    await qdrant.delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=FilterSelector(filter=_doc_filter(doc_id)),
        wait=True,
    )
    return DocumentDeleteResponse(id=doc_id, deleted=True)


async def _parse_document(stored: StoredFile) -> list[PageContent]:
    parser = DocumentParser()
    if stored.file_type == "pdf":
        pages = await parser.parse_pdf(stored.path)
        return _with_source_filename(pages, stored.filename)
    if stored.file_type == "image":
        pages = await parser.parse_image(stored.path)
        return _with_source_filename(pages, stored.filename)
    pages = await parser.parse_docx(stored.path)
    return _with_source_filename(pages, stored.filename)


def _with_source_filename(pages: list[PageContent], filename: str) -> list[PageContent]:
    return [page.model_copy(update={"source": filename}) for page in pages]


async def _collection_exists(qdrant: AsyncQdrantClient) -> bool:
    settings = get_settings()
    collections = await qdrant.get_collections()
    names = {item.name for item in collections.collections}
    return settings.QDRANT_COLLECTION in names


async def _scroll_records(qdrant: AsyncQdrantClient) -> list[Record]:
    settings = get_settings()
    records: list[Record] = []
    offset = None
    while True:
        batch, offset = await qdrant.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            limit=100,
            offset=offset,
            with_payload=True,
        )
        records.extend(batch)
        if offset is None:
            return records


async def _document_exists(qdrant: AsyncQdrantClient, doc_id: str) -> bool:
    if not await _collection_exists(qdrant):
        return False
    settings = get_settings()
    records, _ = await qdrant.scroll(
        collection_name=settings.QDRANT_COLLECTION,
        scroll_filter=_doc_filter(doc_id),
        limit=1,
        with_payload=False,
    )
    return bool(records)


def _doc_filter(doc_id: str) -> Filter:
    return Filter(must=[FieldCondition(key=PAYLOAD_DOC_ID, match=MatchValue(value=doc_id))])


def _metadata_from_records(records: list[Record]) -> list[DocumentMetadata]:
    documents: dict[str, DocumentMetadata] = {}
    counts: dict[str, int] = {}
    for record in records:
        doc_id = str((record.payload or {}).get(PAYLOAD_DOC_ID, ""))
        if not doc_id:
            continue
        counts[doc_id] = counts.get(doc_id, 0) + 1
        documents[doc_id] = _metadata(record, doc_id, counts[doc_id])
    return sorted(documents.values(), key=lambda item: item.uploaded_at, reverse=True)


def _metadata(record: Record, doc_id: str, chunk_count: int) -> DocumentMetadata:
    payload = record.payload or {}
    return DocumentMetadata(
        id=doc_id,
        filename=str(payload.get(PAYLOAD_SOURCE_FILENAME, "")),
        chunk_count=chunk_count,
        uploaded_at=str(payload.get(PAYLOAD_UPLOADED_AT, "")),
    )

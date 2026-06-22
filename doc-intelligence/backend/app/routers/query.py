import logging

from fastapi import APIRouter, HTTPException

from app.config import QUERY_PREFIX, QUERY_TAG, ROOT_PATH
from app.models.schemas import QueryRequest, QueryResponse
from app.services.retriever import DocumentRetriever

router = APIRouter(prefix=QUERY_PREFIX, tags=[QUERY_TAG])
logger = logging.getLogger(__name__)


@router.post(ROOT_PATH, response_model=QueryResponse)
async def query_documents(request: QueryRequest) -> QueryResponse:
    """Answer a natural language question using indexed document chunks as context."""
    try:
        return await DocumentRetriever().query(
            question=request.question,
            doc_id=request.doc_id,
            top_k=request.top_k,
        )
    except Exception as exc:
        logger.exception("Document query failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

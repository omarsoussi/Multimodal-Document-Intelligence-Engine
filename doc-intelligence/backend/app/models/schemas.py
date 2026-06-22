from pydantic import BaseModel, Field


class PageContent(BaseModel):
    page_number: int
    text: str
    source: str


class StoredFile(BaseModel):
    doc_id: str
    filename: str
    path: str
    file_type: str
    uploaded_at: str


class DocumentMetadata(BaseModel):
    id: str
    filename: str
    chunk_count: int
    uploaded_at: str


class DocumentUploadResponse(DocumentMetadata):
    message: str


class DocumentDeleteResponse(BaseModel):
    id: str
    deleted: bool


class Citation(BaseModel):
    page_number: int
    chunk_index: int
    chunk_text: str
    score: float
    source_filename: str


class QueryRequest(BaseModel):
    question: str = Field(min_length=1)
    doc_id: str | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    model_used: str


class ErrorResponse(BaseModel):
    error: str
    detail: str

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


class ConversationMessage(BaseModel):
    role: str
    content: str
    created_at: str
    citations: list[Citation] = []


class Conversation(BaseModel):
    id: str
    title: str
    doc_id: str | None
    doc_filename: str | None
    messages: list[ConversationMessage]
    created_at: str
    updated_at: str


class ConversationSummary(BaseModel):
    id: str
    title: str
    doc_id: str | None
    doc_filename: str | None
    message_count: int
    created_at: str
    updated_at: str


class ConversationCreateRequest(BaseModel):
    doc_id: str | None = None
    doc_filename: str | None = None


class ConversationMessageRequest(BaseModel):
    question: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


class ConversationMessageResponse(BaseModel):
    conversation: Conversation
    answer: str
    citations: list[Citation]
    model_used: str


class DateCountPoint(BaseModel):
    date: str
    count: int


class TopDocumentStat(BaseModel):
    filename: str
    chunk_count: int
    uploaded_at: str
    pages: int = 0


class OverviewStats(BaseModel):
    total_documents: int
    total_chunks: int
    total_pages: int
    avg_chunks_per_doc: float
    documents_by_date: list[DateCountPoint]
    top_documents: list[TopDocumentStat]
    storage_used_kb: float


class PageChunkStat(BaseModel):
    page: int
    chunk_count: int


class KeywordStat(BaseModel):
    word: str
    count: int


class DocumentStats(BaseModel):
    doc_id: str
    filename: str
    total_chunks: int
    total_pages: int
    avg_chunk_length: float
    longest_chunk_length: int
    shortest_chunk_length: int
    chunks_per_page: list[PageChunkStat]
    top_keywords: list[KeywordStat]
    uploaded_at: str
    estimated_word_count: int


class ErrorResponse(BaseModel):
    error: str
    detail: str

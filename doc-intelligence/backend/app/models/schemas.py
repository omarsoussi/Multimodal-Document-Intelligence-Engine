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
    file_type: str = ""
    page_count: int = 0
    language: str = ""
    category: str = ""
    reading_minutes: int = 0
    summary: str = ""


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
    top_k: int = Field(default=4, ge=1, le=20)


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
    top_k: int = Field(default=4, ge=1, le=20)


class ConversationMessageResponse(BaseModel):
    conversation: Conversation
    answer: str
    citations: list[Citation]
    model_used: str


class DateCountPoint(BaseModel):
    date: str
    count: int


class BreakdownStat(BaseModel):
    label: str
    value: int


class RadarMetric(BaseModel):
    metric: str
    value: int


class MindMapNode(BaseModel):
    id: str
    label: str
    group: str
    weight: int = 1


class MindMapEdge(BaseModel):
    source: str
    target: str
    weight: int = 1


class MindMapGraph(BaseModel):
    nodes: list[MindMapNode]
    edges: list[MindMapEdge]


class DocumentSpotlight(BaseModel):
    doc_id: str
    filename: str
    file_type: str
    category: str
    language: str
    total_pages: int
    reading_minutes: int
    summary: str
    uploaded_at: str


class OverviewStats(BaseModel):
    total_documents: int
    total_languages: int
    total_categories: int
    total_reading_hours: float
    documents_by_category: list[BreakdownStat]
    documents_by_language: list[BreakdownStat]
    documents_by_format: list[BreakdownStat]
    reading_time_bands: list[BreakdownStat]
    uploads_by_date: list[DateCountPoint]
    library_highlights: list[str]
    document_spotlights: list[DocumentSpotlight]


class KeywordStat(BaseModel):
    word: str
    count: int


class DocumentStats(BaseModel):
    doc_id: str
    filename: str
    file_type: str
    detected_language: str
    detected_category: str
    uploaded_at: str
    total_pages: int
    estimated_word_count: int
    reading_minutes: int
    summary: str
    key_takeaways: list[str]
    top_keywords: list[KeywordStat]
    topic_breakdown: list[BreakdownStat]
    radar_profile: list[RadarMetric]
    mind_map: MindMapGraph


class ErrorResponse(BaseModel):
    error: str
    detail: str

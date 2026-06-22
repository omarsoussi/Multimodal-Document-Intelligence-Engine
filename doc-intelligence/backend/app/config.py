from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    API_KEY: str = "dev-secret-key"
    API_KEY_HEADER: str = "X-API-Key"
    QDRANT_URL: str = "http://qdrant:6333"
    QDRANT_COLLECTION: str = "documents"
    UPLOAD_DIR: str = "/tmp/uploads"
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64
    GEMINI_API_KEY: str = ""
    GEMINI_PROJECT_ID: str = "404808675387"
    GEMINI_LOCATION: str = "us-central1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


APP_TITLE = "Multimodal Document Intelligence Engine"
APP_VERSION = "1.0.0"
ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
AUTH_EXEMPT_PATHS = {"/docs", "/openapi.json", "/redoc"}
OPTIONS_METHOD = "OPTIONS"

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".docx"}
EXTENSION_TO_TYPE = {
    ".pdf": "pdf",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".tiff": "image",
    ".docx": "docx",
}

DOCUMENTS_PREFIX = "/documents"
QUERY_PREFIX = "/query"
CONVERSATIONS_PREFIX = "/conversations"
STATS_PREFIX = "/stats"
UPLOAD_PATH = "/upload"
ROOT_PATH = ""
DOC_ID_PATH = "/{doc_id}"
DOCUMENTS_TAG = "documents"
QUERY_TAG = "query"
CONVERSATIONS_TAG = "conversations"
STATS_TAG = "stats"
CONVERSATIONS_FILE = "conversations.json"

GEMINI_QA_MODEL = "gemini-2.0-flash"
GEMINI_EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_VECTOR_SIZE = 3072
QDRANT_UPSERT_BATCH_SIZE = 64

NO_CONTEXT_ANSWER = "I could not find relevant context in the indexed documents."
GEMINI_SYSTEM_PROMPT = (
    "You are an expert document analyst. Answer the user's question based ONLY on the "
    "provided document context. Be concise, accurate, and cite the specific page numbers "
    "when referring to information. If the context does not contain enough information "
    "to answer the question, say so clearly."
)

PAYLOAD_DOC_ID = "doc_id"
PAYLOAD_PAGE_NUMBER = "page_number"
PAYLOAD_CHUNK_INDEX = "chunk_index"
PAYLOAD_TEXT = "text"
PAYLOAD_SOURCE_FILENAME = "source_filename"
PAYLOAD_UPLOADED_AT = "uploaded_at"

PDF_TEXT_MODE = "text"
PNG_MIME_TYPE = "image/png"
JPEG_MIME_TYPE = "image/jpeg"
TIFF_MIME_TYPE = "image/tiff"
DOCX_HEADING_PREFIX = "Heading"
OCR_LANGUAGE = "eng"
HASH_TOKEN_PATTERN = r"[A-Za-z0-9]+"
HASH_STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
}
NGRAM_JOINER = " "
SENTENCE_SPLIT_PATTERN = r"(?<=[.!?])\s+|\n+"
ANSWER_SENTENCE_LIMIT = 3
MIN_SENTENCE_SCORE = 1
CONVERSATION_TITLE_LENGTH = 60
RECENT_DAYS_WINDOW = 30
TOP_DOCUMENTS_LIMIT = 5
TOP_KEYWORDS_LIMIT = 15
TOP_KEYWORDS_PANEL_LIMIT = 10
READING_WORDS_PER_MINUTE = 250


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""Gemini text embeddings via direct REST API (generativelanguage.googleapis.com/v1beta)."""
import logging
import re
import time

import httpx

from app.config import GEMINI_EMBEDDING_MODEL, get_settings

_EMBED_MAX_RETRIES = 4
_EMBED_BACKOFF = [5, 10, 20, 40]  # seconds

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def embed_text(text: str) -> list[float]:
    """Return a 3072-dimensional embedding using gemini-embedding-2 REST API."""
    return _embed(text, task_type="RETRIEVAL_DOCUMENT")


def embed_query(text: str) -> list[float]:
    """Return a 3072-dimensional embedding optimised for query/retrieval."""
    return _embed(text, task_type="RETRIEVAL_QUERY")


def _embed(text: str, task_type: str) -> list[float]:
    settings = get_settings()
    url = f"{GEMINI_BASE_URL}/models/{GEMINI_EMBEDDING_MODEL}:embedContent"
    for attempt in range(_EMBED_MAX_RETRIES + 1):
        response = httpx.post(
            url,
            params={"key": settings.GEMINI_API_KEY},
            json={
                "model": f"models/{GEMINI_EMBEDDING_MODEL}",
                "content": {"parts": [{"text": text}]},
                "taskType": task_type,
            },
            timeout=30.0,
        )
        if response.status_code == 429 and attempt < _EMBED_MAX_RETRIES:
            wait = _EMBED_BACKOFF[attempt]
            logger.warning("Embedding rate limited — retrying in %ds (attempt %d)", wait, attempt + 1)
            time.sleep(wait)
            continue
        if response.status_code != 200:
            logger.error("Embedding API error %s: %s", response.status_code, response.text)
        response.raise_for_status()
        return response.json()["embedding"]["values"]
    raise RuntimeError("Embedding failed after all retries")


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return embeddings for a batch of texts."""
    return [embed_text(t) for t in texts]


def tokenize(text: str) -> list[str]:
    """Simple tokenizer kept for compatibility."""
    tokens = re.findall(r"[A-Za-z0-9]+", text.lower())
    stop_words = {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
        "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
        "what", "when", "where", "which", "who", "why", "with",
    }
    return [t for t in tokens if t not in stop_words]

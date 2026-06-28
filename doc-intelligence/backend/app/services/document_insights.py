from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from math import ceil
from pathlib import Path
import re

from qdrant_client.models import Record

from app.config import (
    HASH_STOP_WORDS,
    PAYLOAD_DOC_ID,
    PAYLOAD_PAGE_NUMBER,
    PAYLOAD_SOURCE_FILENAME,
    PAYLOAD_TEXT,
    PAYLOAD_UPLOADED_AT,
    READING_WORDS_PER_MINUTE,
    RECENT_DAYS_WINDOW,
    TOP_DOCUMENTS_LIMIT,
    TOP_KEYWORDS_LIMIT,
)
from app.models.schemas import (
    BreakdownStat,
    DateCountPoint,
    DocumentMetadata,
    DocumentSpotlight,
    DocumentStats,
    KeywordStat,
    MindMapEdge,
    MindMapGraph,
    MindMapNode,
    OverviewStats,
    RadarMetric,
)

_TOKEN_PATTERN = re.compile(r"[A-Za-z0-9']+|[\u0600-\u06FF]+")
_SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+|\n+")
_ARABIC_PATTERN = re.compile(r"[\u0600-\u06FF]")

_LANGUAGE_HINTS = {
    "English": {"the", "and", "for", "with", "this", "from", "will", "document"},
    "French": {"les", "des", "pour", "avec", "dans", "cette", "rapport", "sante"},
    "Arabic": {"من", "في", "على", "هذا", "هذه", "الى", "عن", "مع"},
    "Spanish": {"para", "este", "esta", "con", "documento", "salud", "educacion"},
}

_CATEGORY_KEYWORDS = {
    "Education": {"student", "students", "school", "university", "course", "curriculum", "teacher", "education", "learning", "exam"},
    "Health": {"patient", "patients", "hospital", "clinic", "medical", "health", "diagnosis", "treatment", "care", "medicine"},
    "Finance": {"invoice", "payment", "budget", "cost", "revenue", "expense", "bank", "financial", "tax", "price"},
    "Legal": {"contract", "agreement", "clause", "law", "legal", "compliance", "terms", "policy", "license", "regulation"},
    "Technology": {"system", "software", "api", "platform", "model", "data", "cloud", "application", "database", "integration"},
    "Research": {"study", "method", "analysis", "results", "abstract", "experiment", "dataset", "findings", "reference", "hypothesis"},
    "Business": {"client", "strategy", "proposal", "market", "sales", "customer", "business", "roadmap", "growth", "operations"},
    "Government": {"ministry", "public", "citizen", "authority", "national", "municipal", "government", "policy", "service", "state"},
}

_ACTION_HINTS = {"must", "should", "need", "plan", "review", "submit", "prepare", "schedule", "approve", "follow"}
_EVIDENCE_HINTS = {"table", "figure", "appendix", "study", "results", "analysis", "evidence", "reference", "dataset"}


@dataclass
class DocumentProfile:
    doc_id: str
    filename: str
    uploaded_at: str
    file_type: str
    page_count: int = 0
    chunk_count: int = 0
    texts: list[str] = field(default_factory=list)
    summary: str = ""
    language: str = "Unknown"
    category: str = "General"
    reading_minutes: int = 0
    estimated_word_count: int = 0
    keywords: list[tuple[str, int]] = field(default_factory=list)
    headings: list[str] = field(default_factory=list)
    takeaways: list[str] = field(default_factory=list)
    topic_breakdown: list[BreakdownStat] = field(default_factory=list)
    radar_profile: list[RadarMetric] = field(default_factory=list)
    mind_map: MindMapGraph = field(
        default_factory=lambda: MindMapGraph(nodes=[], edges=[])
    )

    @property
    def combined_text(self) -> str:
        return "\n".join(self.texts).strip()


def build_profiles(records: list[Record]) -> dict[str, DocumentProfile]:
    profiles: dict[str, DocumentProfile] = {}
    for record in records:
        payload = record.payload or {}
        doc_id = str(payload.get(PAYLOAD_DOC_ID, "")).strip()
        if not doc_id:
            continue
        filename = str(payload.get(PAYLOAD_SOURCE_FILENAME, "")).strip()
        profile = profiles.setdefault(
            doc_id,
            DocumentProfile(
                doc_id=doc_id,
                filename=filename,
                uploaded_at=str(payload.get(PAYLOAD_UPLOADED_AT, "")),
                file_type=_file_type(filename),
            ),
        )
        profile.chunk_count += 1
        profile.page_count = max(profile.page_count, _page_number(record))
        text = _text(record)
        if text:
            profile.texts.append(text)
    for doc_id, profile in profiles.items():
        profiles[doc_id] = _finalize_profile(profile)
    return profiles


def profile_to_metadata(profile: DocumentProfile) -> DocumentMetadata:
    return DocumentMetadata(
        id=profile.doc_id,
        filename=profile.filename,
        chunk_count=profile.chunk_count,
        uploaded_at=profile.uploaded_at,
        file_type=profile.file_type,
        page_count=profile.page_count,
        language=profile.language,
        category=profile.category,
        reading_minutes=profile.reading_minutes,
        summary=profile.summary,
    )


def profile_to_stats(profile: DocumentProfile) -> DocumentStats:
    return DocumentStats(
        doc_id=profile.doc_id,
        filename=profile.filename,
        file_type=profile.file_type,
        detected_language=profile.language,
        detected_category=profile.category,
        uploaded_at=profile.uploaded_at,
        total_pages=profile.page_count,
        estimated_word_count=profile.estimated_word_count,
        reading_minutes=profile.reading_minutes,
        summary=profile.summary,
        key_takeaways=profile.takeaways,
        top_keywords=[
            KeywordStat(word=word, count=count)
            for word, count in profile.keywords[:TOP_KEYWORDS_LIMIT]
        ],
        topic_breakdown=profile.topic_breakdown,
        radar_profile=profile.radar_profile,
        mind_map=profile.mind_map,
    )


def build_overview(profiles: dict[str, DocumentProfile]) -> OverviewStats:
    items = list(profiles.values())
    category_counts = Counter(item.category for item in items)
    language_counts = Counter(item.language for item in items)
    format_counts = Counter(item.file_type.upper() for item in items)
    reading_bands = Counter(_reading_band(item.reading_minutes) for item in items)
    uploads_by_date = _uploads_by_date(items)
    sorted_recent = sorted(items, key=lambda item: item.uploaded_at, reverse=True)
    spotlights = [
        DocumentSpotlight(
            doc_id=item.doc_id,
            filename=item.filename,
            file_type=item.file_type.upper(),
            category=item.category,
            language=item.language,
            total_pages=item.page_count,
            reading_minutes=item.reading_minutes,
            summary=item.summary,
            uploaded_at=item.uploaded_at,
        )
        for item in sorted_recent[:TOP_DOCUMENTS_LIMIT]
    ]
    return OverviewStats(
        total_documents=len(items),
        total_languages=len(language_counts),
        total_categories=len(category_counts),
        total_reading_hours=round(sum(item.reading_minutes for item in items) / 60, 1),
        documents_by_category=_breakdown(category_counts),
        documents_by_language=_breakdown(language_counts),
        documents_by_format=_breakdown(format_counts),
        reading_time_bands=_breakdown(reading_bands),
        uploads_by_date=uploads_by_date,
        library_highlights=_library_highlights(items, category_counts, language_counts),
        document_spotlights=spotlights,
    )


def _finalize_profile(profile: DocumentProfile) -> DocumentProfile:
    text = _normalize_text(profile.combined_text)
    tokens = _tokens(text)
    keywords = _keyword_counts(tokens)
    headings = _extract_headings(text)
    summary_sentences = _rank_sentences(text, keywords, limit=3)
    summary = _trim_text(" ".join(summary_sentences), 360) or "No readable summary available yet."
    profile.estimated_word_count = len(tokens)
    profile.reading_minutes = (
        max(1, ceil(profile.estimated_word_count / READING_WORDS_PER_MINUTE))
        if profile.estimated_word_count
        else 0
    )
    profile.summary = summary
    profile.language = _detect_language(text, tokens)
    profile.category = _classify_category(text, profile.filename)
    profile.keywords = keywords
    profile.headings = headings
    profile.takeaways = _takeaways(summary_sentences, headings)
    profile.topic_breakdown = [
        BreakdownStat(label=word.title(), value=count)
        for word, count in keywords[:6]
    ]
    profile.radar_profile = _radar_profile(text, headings, profile.estimated_word_count)
    profile.mind_map = _mind_map(profile.filename, headings, keywords, profile.category)
    return profile


def _detect_language(text: str, tokens: list[str]) -> str:
    if not text:
        return "Unknown"
    if _ARABIC_PATTERN.search(text):
        return "Arabic"
    counts = Counter(tokens)
    scores = {
        language: sum(counts.get(hint, 0) for hint in hints)
        for language, hints in _LANGUAGE_HINTS.items()
    }
    language, score = max(scores.items(), key=lambda item: item[1], default=("English", 0))
    return language if score > 0 else "English"


def _classify_category(text: str, filename: str) -> str:
    lowered = f"{filename.lower()} {text.lower()[:12000]}"
    scores = {
        category: sum(lowered.count(keyword) for keyword in keywords)
        for category, keywords in _CATEGORY_KEYWORDS.items()
    }
    category, score = max(scores.items(), key=lambda item: item[1], default=("General", 0))
    return category if score > 0 else "General"


def _keyword_counts(tokens: list[str]) -> list[tuple[str, int]]:
    counts = Counter(
        token
        for token in tokens
        if token not in HASH_STOP_WORDS and len(token) > 2 and not token.isdigit()
    )
    return counts.most_common(TOP_KEYWORDS_LIMIT)


def _extract_headings(text: str) -> list[str]:
    headings: list[str] = []
    for line in text.splitlines():
        clean = " ".join(line.split()).strip(" -:")
        if not clean or len(clean) > 70:
            continue
        if clean.isupper() or re.match(r"^(\d+[\.\)])\s+\w+", clean):
            headings.append(clean.title())
            continue
        words = clean.split()
        if 1 < len(words) <= 8 and all(word[:1].isupper() for word in words if word):
            headings.append(clean)
    return _unique_preserve_order(headings)[:6]


def _rank_sentences(
    text: str,
    keywords: list[tuple[str, int]],
    limit: int,
) -> list[str]:
    sentences = [
        " ".join(sentence.split())
        for sentence in _SENTENCE_SPLIT_PATTERN.split(text)
        if len(sentence.split()) >= 5
    ]
    if not sentences:
        return []
    keyword_weights = {word: count for word, count in keywords[:8]}
    scored: list[tuple[int, int, str]] = []
    for index, sentence in enumerate(sentences[:24]):
        sentence_tokens = _tokens(sentence.lower())
        weight = sum(keyword_weights.get(token, 0) for token in sentence_tokens)
        if index < 2:
            weight += 2
        if len(sentence) > 200:
            weight -= 1
        scored.append((weight, -index, sentence))
    selected = [
        sentence
        for _, _, sentence in sorted(scored, reverse=True)[:limit]
    ]
    ordered = [sentence for sentence in sentences if sentence in selected]
    return ordered[:limit]


def _takeaways(summary_sentences: list[str], headings: list[str]) -> list[str]:
    takeaways = [sentence for sentence in summary_sentences[:2]]
    if headings:
        takeaways.append(f"Main structure: {', '.join(headings[:3])}.")
    return _unique_preserve_order([_trim_text(item, 140) for item in takeaways if item])[:3]


def _radar_profile(text: str, headings: list[str], word_count: int) -> list[RadarMetric]:
    sentence_count = max(1, len([item for item in _SENTENCE_SPLIT_PATTERN.split(text) if item.strip()]))
    numeric_tokens = len(re.findall(r"\b\d[\d,./%-]*\b", text))
    actions = sum(text.lower().count(word) for word in _ACTION_HINTS)
    evidence = sum(text.lower().count(word) for word in _EVIDENCE_HINTS)
    avg_sentence_words = word_count / sentence_count if sentence_count else 0
    metrics = {
        "Structure": min(100, 18 * len(headings) + 20),
        "Data": min(100, numeric_tokens * 6 + 18),
        "Action": min(100, actions * 10 + 12),
        "Evidence": min(100, evidence * 9 + 16),
        "Clarity": max(28, min(100, int(118 - (avg_sentence_words * 2.3)))),
    }
    return [RadarMetric(metric=label, value=value) for label, value in metrics.items()]


def _mind_map(
    filename: str,
    headings: list[str],
    keywords: list[tuple[str, int]],
    category: str,
) -> MindMapGraph:
    root_id = "root"
    root_label = Path(filename).stem[:28] or category
    branch_labels = headings[:4] or [item[0].title() for item in keywords[:4]] or [category]
    leaf_terms = [item[0].title() for item in keywords[4:12]]
    nodes = [MindMapNode(id=root_id, label=root_label, group="root", weight=3)]
    edges: list[MindMapEdge] = []
    leaf_index = 0
    for index, label in enumerate(branch_labels):
        branch_id = f"branch-{index}"
        nodes.append(MindMapNode(id=branch_id, label=_trim_text(label, 26), group="branch", weight=2))
        edges.append(MindMapEdge(source=root_id, target=branch_id, weight=2))
        for _ in range(2):
            if leaf_index >= len(leaf_terms):
                break
            leaf_id = f"leaf-{index}-{leaf_index}"
            nodes.append(
                MindMapNode(
                    id=leaf_id,
                    label=_trim_text(leaf_terms[leaf_index], 22),
                    group="leaf",
                    weight=1,
                )
            )
            edges.append(MindMapEdge(source=branch_id, target=leaf_id, weight=1))
            leaf_index += 1
    return MindMapGraph(nodes=nodes, edges=edges)


def _uploads_by_date(items: list[DocumentProfile]) -> list[DateCountPoint]:
    today = datetime.now(UTC).date()
    start = today - timedelta(days=RECENT_DAYS_WINDOW - 1)
    counts = Counter(_date_key(item.uploaded_at) for item in items)
    return [
        DateCountPoint(
            date=(start + timedelta(days=offset)).isoformat(),
            count=counts.get((start + timedelta(days=offset)).isoformat(), 0),
        )
        for offset in range(RECENT_DAYS_WINDOW)
    ]


def _library_highlights(
    items: list[DocumentProfile],
    category_counts: Counter[str],
    language_counts: Counter[str],
) -> list[str]:
    if not items:
        return ["Upload a file to unlock document insights."]
    dominant_category, category_count = category_counts.most_common(1)[0]
    dominant_language, language_count = language_counts.most_common(1)[0]
    longest = max(items, key=lambda item: item.reading_minutes)
    newest = max(items, key=lambda item: item.uploaded_at)
    return [
        f"{dominant_category} leads the library with {category_count} document(s).",
        f"{dominant_language} appears in {language_count} document(s).",
        f"{longest.filename} is the deepest read at about {longest.reading_minutes} minute(s).",
        f"Most recently indexed: {newest.filename}.",
    ]


def _breakdown(counter: Counter[str]) -> list[BreakdownStat]:
    return [
        BreakdownStat(label=label, value=value)
        for label, value in counter.most_common()
        if label
    ]


def _reading_band(reading_minutes: int) -> str:
    if reading_minutes <= 2:
        return "Quick reads"
    if reading_minutes <= 8:
        return "Focused reads"
    return "Deep dives"


def _date_key(value: str) -> str:
    if not value:
        return ""
    return datetime.fromisoformat(value).date().isoformat()


def _file_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower().lstrip(".")
    return suffix or "file"


def _page_number(record: Record) -> int:
    return int((record.payload or {}).get(PAYLOAD_PAGE_NUMBER, 0))


def _text(record: Record) -> str:
    return str((record.payload or {}).get(PAYLOAD_TEXT, "")).strip()


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\x00", " ")).strip()


def _tokens(text: str) -> list[str]:
    return [token.lower() for token in _TOKEN_PATTERN.findall(text)]


def _trim_text(text: str, max_chars: int) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[: max_chars - 1].rstrip() + "..."


def _unique_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for value in values:
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(value)
    return unique

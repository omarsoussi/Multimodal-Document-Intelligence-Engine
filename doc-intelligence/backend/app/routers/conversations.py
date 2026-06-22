import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import anyio
from fastapi import APIRouter, HTTPException

from app.config import (
    CONVERSATIONS_FILE,
    CONVERSATIONS_PREFIX,
    CONVERSATIONS_TAG,
    CONVERSATION_TITLE_LENGTH,
    get_settings,
)
from app.models.schemas import (
    Conversation,
    ConversationCreateRequest,
    ConversationMessage,
    ConversationMessageRequest,
    ConversationMessageResponse,
    ConversationSummary,
)
from app.services.retriever import DocumentRetriever

router = APIRouter(prefix=CONVERSATIONS_PREFIX, tags=[CONVERSATIONS_TAG])
_store_lock = asyncio.Lock()


@router.post("", response_model=Conversation, status_code=201)
async def create_conversation(request: ConversationCreateRequest) -> Conversation:
    """Create a new persisted conversation scoped to one document or all documents."""
    async with _store_lock:
        conversations = await _read_store()
        conversation = _new_conversation(request)
        conversations.append(conversation)
        await _write_store(conversations)
    return conversation


@router.get("", response_model=list[ConversationSummary])
async def list_conversations() -> list[ConversationSummary]:
    """List saved conversations sorted by most recent update time."""
    conversations = await _read_store()
    sorted_items = sorted(conversations, key=lambda item: item.updated_at, reverse=True)
    return [_summary(item) for item in sorted_items]


@router.get("/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str) -> Conversation:
    """Return one full conversation with all stored messages."""
    conversations = await _read_store()
    conversation = _find_conversation(conversations, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conversation


@router.post("/{conversation_id}/messages", response_model=ConversationMessageResponse)
async def append_conversation_message(
    conversation_id: str,
    request: ConversationMessageRequest,
) -> ConversationMessageResponse:
    """Append a user message and generated assistant reply to one conversation."""
    async with _store_lock:
        conversations = await _read_store()
        conversation = _find_conversation(conversations, conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        result = await DocumentRetriever().query(request.question, conversation.doc_id, request.top_k)
        _append_messages(conversation, request.question, result.answer, result.citations)
        await _write_store(conversations)
    return ConversationMessageResponse(
        conversation=conversation,
        answer=result.answer,
        citations=result.citations,
        model_used=result.model_used,
    )


@router.delete("/{conversation_id}", response_model=dict[str, bool | str])
async def delete_conversation(conversation_id: str) -> dict[str, bool | str]:
    """Delete one persisted conversation by id."""
    async with _store_lock:
        conversations = await _read_store()
        remaining = [item for item in conversations if item.id != conversation_id]
        if len(remaining) == len(conversations):
            raise HTTPException(status_code=404, detail="Conversation not found.")
        await _write_store(remaining)
    return {"id": conversation_id, "deleted": True}


def _new_conversation(request: ConversationCreateRequest) -> Conversation:
    now = _timestamp()
    return Conversation(
        id=str(uuid4()),
        title="New chat",
        doc_id=request.doc_id,
        doc_filename=request.doc_filename,
        messages=[],
        created_at=now,
        updated_at=now,
    )


def _summary(conversation: Conversation) -> ConversationSummary:
    return ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        doc_id=conversation.doc_id,
        doc_filename=conversation.doc_filename,
        message_count=len(conversation.messages),
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


def _find_conversation(
    conversations: list[Conversation],
    conversation_id: str,
) -> Conversation | None:
    return next((item for item in conversations if item.id == conversation_id), None)


def _append_messages(
    conversation: Conversation,
    question: str,
    answer: str,
    citations: list,
) -> None:
    created_at = _timestamp()
    conversation.messages.extend(
        [
            ConversationMessage(role="user", content=question, created_at=created_at),
            ConversationMessage(
                role="assistant",
                content=answer,
                created_at=_timestamp(),
                citations=citations,
            ),
        ]
    )
    if conversation.title == "New chat":
        conversation.title = question[:CONVERSATION_TITLE_LENGTH].strip() or "New chat"
    conversation.updated_at = _timestamp()


async def _read_store() -> list[Conversation]:
    path = _store_path()
    if not await anyio.to_thread.run_sync(path.exists):
        return []
    content = await anyio.to_thread.run_sync(path.read_text)
    if not content.strip():
        return []
    data = json.loads(content)
    return [Conversation.model_validate(item) for item in data]


async def _write_store(conversations: list[Conversation]) -> None:
    path = _store_path()
    await anyio.to_thread.run_sync(_ensure_parent_dir, path)
    payload = json.dumps([item.model_dump() for item in conversations], indent=2)
    await anyio.to_thread.run_sync(path.write_text, payload)


def _store_path() -> Path:
    settings = get_settings()
    return Path(settings.UPLOAD_DIR) / CONVERSATIONS_FILE


def _timestamp() -> str:
    return datetime.now(UTC).isoformat()


def _ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import anyio
from fastapi import HTTPException, UploadFile, status

from app.config import (
    ALLOWED_EXTENSIONS,
    EXTENSION_TO_TYPE,
    MAX_UPLOAD_BYTES,
    get_settings,
)
from app.models.schemas import StoredFile


def detect_file_type(filename: str) -> str:
    extension = _file_extension(filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {extension or 'unknown'}",
        )
    return EXTENSION_TO_TYPE[extension]


async def save_upload(upload: UploadFile) -> StoredFile:
    filename = _clean_filename(upload.filename)
    file_type = detect_file_type(filename)
    content = await upload.read()
    _validate_size(content)

    settings = get_settings()
    extension = _file_extension(filename)
    doc_id = str(uuid4())
    target = Path(settings.UPLOAD_DIR) / f"{doc_id}{extension}"
    target.parent.mkdir(parents=True, exist_ok=True)
    await anyio.to_thread.run_sync(target.write_bytes, content)

    return StoredFile(
        doc_id=doc_id,
        filename=filename,
        path=str(target),
        file_type=file_type,
        uploaded_at=datetime.now(UTC).isoformat(),
    )


def _clean_filename(filename: str | None) -> str:
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must include a filename.",
        )
    return Path(filename).name


def _file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def _validate_size(content: bytes) -> None:
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded files must be 20MB or smaller.",
        )

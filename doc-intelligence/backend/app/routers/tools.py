from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.config import TOOLS_PREFIX, TOOLS_TAG
from app.services.document_tools import (
    DocumentToolsService,
    GeneratedFile,
    cleanup_directory,
)

router = APIRouter(prefix=TOOLS_PREFIX, tags=[TOOLS_TAG])


@router.post("/pdf-to-docx")
async def pdf_to_docx(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> FileResponse:
    return await _file_response(
        background_tasks,
        await DocumentToolsService().pdf_to_docx(file),
    )


@router.post("/docx-to-pdf")
async def docx_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> FileResponse:
    return await _file_response(
        background_tasks,
        await DocumentToolsService().docx_to_pdf(file),
    )


@router.post("/compress-pdf")
async def compress_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> FileResponse:
    return await _file_response(
        background_tasks,
        await DocumentToolsService().compress_pdf(file),
    )


@router.post("/split-pdf")
async def split_pdf(
    background_tasks: BackgroundTasks,
    ranges: str = Form(...),
    file: UploadFile = File(...),
) -> FileResponse:
    return await _file_response(
        background_tasks,
        await DocumentToolsService().split_pdf(file, ranges),
    )


async def _file_response(
    background_tasks: BackgroundTasks,
    generated: GeneratedFile,
) -> FileResponse:
    background_tasks.add_task(cleanup_directory, Path(generated.cleanup_dir))
    return FileResponse(
        path=generated.path,
        filename=generated.filename,
        media_type=generated.media_type,
    )

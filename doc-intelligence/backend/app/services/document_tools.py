from __future__ import annotations

from dataclasses import dataclass
import shutil
import subprocess
import tempfile
from pathlib import Path
from zipfile import ZipFile

import anyio
import fitz
from fastapi import HTTPException, UploadFile, status

from app.config import SOFFICE_BINARY

_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
_PDF_MIME = "application/pdf"
_ZIP_MIME = "application/zip"


@dataclass
class GeneratedFile:
    path: Path
    filename: str
    media_type: str
    cleanup_dir: Path


class DocumentToolsService:
    async def pdf_to_docx(self, upload: UploadFile) -> GeneratedFile:
        temp_dir, source = await _save_temp_upload(upload, {".pdf"})
        output = await anyio.to_thread.run_sync(
            _convert_with_soffice,
            source,
            temp_dir,
            "docx",
            ".docx",
        )
        return GeneratedFile(
            path=output,
            filename=f"{source.stem}.docx",
            media_type=_DOCX_MIME,
            cleanup_dir=temp_dir,
        )

    async def docx_to_pdf(self, upload: UploadFile) -> GeneratedFile:
        temp_dir, source = await _save_temp_upload(upload, {".docx"})
        output = await anyio.to_thread.run_sync(
            _convert_with_soffice,
            source,
            temp_dir,
            "pdf:writer_pdf_Export",
            ".pdf",
        )
        return GeneratedFile(
            path=output,
            filename=f"{source.stem}.pdf",
            media_type=_PDF_MIME,
            cleanup_dir=temp_dir,
        )

    async def compress_pdf(self, upload: UploadFile) -> GeneratedFile:
        temp_dir, source = await _save_temp_upload(upload, {".pdf"})
        output = temp_dir / f"{source.stem}-compressed.pdf"
        await anyio.to_thread.run_sync(_compress_pdf, source, output)
        return GeneratedFile(
            path=output,
            filename=output.name,
            media_type=_PDF_MIME,
            cleanup_dir=temp_dir,
        )

    async def split_pdf(self, upload: UploadFile, ranges: str) -> GeneratedFile:
        temp_dir, source = await _save_temp_upload(upload, {".pdf"})
        archive = await anyio.to_thread.run_sync(_split_pdf, source, temp_dir, ranges)
        return GeneratedFile(
            path=archive,
            filename=archive.name,
            media_type=_ZIP_MIME,
            cleanup_dir=temp_dir,
        )


async def _save_temp_upload(
    upload: UploadFile,
    allowed_extensions: set[str],
) -> tuple[Path, Path]:
    filename = Path(upload.filename or "").name
    suffix = Path(filename).suffix.lower()
    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {suffix or 'unknown'}",
        )
    temp_dir = Path(tempfile.mkdtemp(prefix="doc-tools-"))
    source = temp_dir / filename
    content = await upload.read()
    await anyio.to_thread.run_sync(source.write_bytes, content)
    return temp_dir, source


def _convert_with_soffice(
    source: Path,
    output_dir: Path,
    convert_to: str,
    expected_suffix: str,
) -> Path:
    result = subprocess.run(
        [
            SOFFICE_BINARY,
            "--headless",
            "--convert-to",
            convert_to,
            "--outdir",
            str(output_dir),
            str(source),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.stderr.strip() or "Document conversion failed.",
        )
    output = output_dir / f"{source.stem}{expected_suffix}"
    if not output.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Conversion finished without producing an output file.",
        )
    return output


def _compress_pdf(source: Path, output: Path) -> None:
    document = fitz.open(source)
    try:
        document.save(
            output,
            garbage=4,
            clean=True,
            deflate=True,
            linear=True,
        )
    finally:
        document.close()


def _split_pdf(source: Path, output_dir: Path, ranges: str) -> Path:
    document = fitz.open(source)
    try:
        selections = _parse_ranges(ranges, document.page_count)
        created_files: list[Path] = []
        for index, (start_page, end_page) in enumerate(selections, start=1):
            part_path = output_dir / f"{source.stem}-part-{index}.pdf"
            split_document = fitz.open()
            try:
                split_document.insert_pdf(document, from_page=start_page - 1, to_page=end_page - 1)
                split_document.save(part_path)
            finally:
                split_document.close()
            created_files.append(part_path)
        archive = output_dir / f"{source.stem}-split.zip"
        with ZipFile(archive, "w") as bundle:
            for file_path in created_files:
                bundle.write(file_path, arcname=file_path.name)
        return archive
    finally:
        document.close()


def _parse_ranges(ranges: str, total_pages: int) -> list[tuple[int, int]]:
    if not ranges.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter at least one page range, for example 1-3,5,8-10.",
        )
    parsed: list[tuple[int, int]] = []
    for part in ranges.split(","):
        item = part.strip()
        if not item:
            continue
        try:
            if "-" in item:
                start_raw, end_raw = item.split("-", 1)
                start_page = int(start_raw)
                end_page = int(end_raw)
            else:
                start_page = int(item)
                end_page = start_page
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid page range '{item}'. Use formats like 1-3 or 5.",
            ) from exc
        if start_page < 1 or end_page < start_page or end_page > total_pages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid page range '{item}' for a {total_pages}-page document.",
            )
        parsed.append((start_page, end_page))
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid page ranges were provided.",
        )
    return parsed


def cleanup_directory(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)

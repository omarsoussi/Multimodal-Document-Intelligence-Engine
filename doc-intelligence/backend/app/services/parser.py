import io
from pathlib import Path

import anyio
import fitz
from docx import Document as DocxDocument
from PIL import Image
import pytesseract

from app.config import (
    DOCX_HEADING_PREFIX,
    OCR_LANGUAGE,
    PDF_TEXT_MODE,
)
from app.models.schemas import PageContent


class DocumentParser:
    async def parse_pdf(self, path: str) -> list[PageContent]:
        document = fitz.open(path)
        source = Path(path).name
        pages: list[PageContent] = []
        try:
            for index, page in enumerate(document, start=1):
                text = page.get_text(PDF_TEXT_MODE).strip()
                if not text:
                    text = await self._extract_page_image(page)
                pages.append(PageContent(page_number=index, text=text, source=source))
        finally:
            document.close()
        return pages

    async def parse_image(self, path: str) -> list[PageContent]:
        file_path = Path(path)
        text = await anyio.to_thread.run_sync(_ocr_image_file, file_path)
        return [PageContent(page_number=1, text=text, source=file_path.name)]

    async def parse_docx(self, path: str) -> list[PageContent]:
        document = await anyio.to_thread.run_sync(DocxDocument, path)
        source = Path(path).name
        lines = _docx_lines(document)
        text = "\n\n".join(lines)
        return [PageContent(page_number=1, text=text, source=source)]

    async def _extract_page_image(self, page: fitz.Page) -> str:
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        content = pixmap.tobytes("png")
        return await anyio.to_thread.run_sync(_ocr_image_bytes, content)


def _ocr_image_file(path: Path) -> str:
    with Image.open(path) as image:
        return pytesseract.image_to_string(image, lang=OCR_LANGUAGE).strip()


def _ocr_image_bytes(content: bytes) -> str:
    with Image.open(io.BytesIO(content)) as image:
        return pytesseract.image_to_string(image, lang=OCR_LANGUAGE).strip()


def _docx_lines(document: object) -> list[str]:
    lines: list[str] = []
    heading = ""
    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue
        style_name = paragraph.style.name if paragraph.style else ""
        if style_name.startswith(DOCX_HEADING_PREFIX):
            heading = text
            lines.append(text)
            continue
        lines.append(f"{heading}\n{text}" if heading else text)
    return lines

"""
Product extraction from grocery prospekt PDFs.

Strategy: pdfplumber first (fast text extraction), Docling OCR fallback (slow).
Grocery flyer PDFs from Scene7/Lidl typically have embedded text layers,
so pdfplumber is usually sufficient and runs in seconds vs minutes for Docling.
"""
import asyncio
import logging
import os
import re
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

PRICE_RE = re.compile(r"(?:CHF\s*)?(\d{1,3}[.,]\d{2})")
DISCOUNT_RE = re.compile(r"[-–]?\s*(\d{1,2})\s*%")
PRICE_MIN = 0.10
PRICE_MAX = 500.0


def _parse_products_from_text(text: str, retailer: str) -> list[dict]:
    """Parse products with prices from extracted text (pdfplumber or Docling)."""
    products = []
    seen: set[str] = set()

    for line in text.split("\n"):
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("|") or len(line) < 5:
            continue

        price_match = PRICE_RE.search(line)
        if not price_match:
            continue

        price = float(price_match.group(1).replace(",", "."))
        if not (PRICE_MIN <= price <= PRICE_MAX):
            continue

        name = line[:price_match.start()].strip()
        name = re.sub(r"\s+", " ", name)
        name = re.sub(r"[*_#|>-]+", "", name).strip()

        if not name or len(name) < 3 or name.lower() in seen:
            continue

        seen.add(name.lower())

        discount = None
        discount_match = DISCOUNT_RE.search(line)
        if discount_match:
            discount = float(discount_match.group(1))

        products.append({
            "retailer": retailer,
            "name": name,
            "price": price,
            "discount_pct": discount,
            "category": "offer",
        })

    return products


def _extract_with_pdfplumber(file_path: str) -> str:
    """Extract text from PDF using pdfplumber (fast, works on embedded text)."""
    try:
        import pdfplumber
    except ImportError:
        return ""

    text_parts = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")

    return "\n".join(text_parts)


def _extract_with_docling(file_path: str) -> str:
    """Extract text from PDF/image using Docling OCR (slow, for scanned docs)."""
    try:
        from docling.document_converter import DocumentConverter
    except ImportError:
        logger.warning("Docling not available")
        return ""

    try:
        converter = DocumentConverter()
        result = converter.convert(file_path)
        return result.document.export_to_markdown()
    except Exception as e:
        logger.error(f"Docling extraction failed: {e}")
        return ""


def extract_products_from_file(file_path: str | Path, retailer: str) -> list[dict]:
    """Extract products from a PDF file.

    Strategy: try pdfplumber first (fast text extraction for PDFs with
    embedded text). If pdfplumber finds fewer than 3 products, fall back
    to Docling OCR (slow but handles scanned/image PDFs).
    """
    file_path = str(file_path)

    # Step 1: Try pdfplumber (fast — seconds)
    text = _extract_with_pdfplumber(file_path)
    products = _parse_products_from_text(text, retailer)

    if len(products) >= 3:
        logger.info(
            f"pdfplumber: {len(products)} products from {Path(file_path).name}"
        )
        return products

    # Step 2: Fallback to Docling OCR (slow — minutes on CPU)
    logger.info(
        f"pdfplumber found only {len(products)} products, trying Docling OCR..."
    )
    md = _extract_with_docling(file_path)
    if md:
        docling_products = _parse_products_from_text(md, retailer)
        if len(docling_products) > len(products):
            logger.info(
                f"Docling: {len(docling_products)} products from "
                f"{Path(file_path).name}"
            )
            return docling_products

    logger.info(
        f"PDF extraction: {len(products)} products from {Path(file_path).name}"
    )
    return products


async def _extract_in_thread(data: bytes, retailer: str, suffix: str) -> list[dict]:
    """Write data to temp file, run extraction in a thread, then clean up."""
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        tmp.write(data)
        tmp.flush()
        tmp.close()
        return await asyncio.to_thread(extract_products_from_file, tmp.name, retailer)
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


async def extract_products_from_pdf_bytes(
    pdf_bytes: bytes, retailer: str, filename: str = "prospekt.pdf"
) -> list[dict]:
    """Extract products from PDF bytes (downloaded via HTTP)."""
    suffix = Path(filename).suffix or ".pdf"
    return await _extract_in_thread(pdf_bytes, retailer, suffix)


async def extract_products_from_image_bytes(
    image_bytes: bytes, retailer: str, filename: str = "page.jpg"
) -> list[dict]:
    """Extract products from a flyer page image using Docling OCR."""
    suffix = Path(filename).suffix or ".jpg"
    return await _extract_in_thread(image_bytes, retailer, suffix)

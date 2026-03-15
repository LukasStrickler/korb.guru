"""
Product extraction using Docling.
Converts grocery prospekt PDFs and page images to structured product data.
"""
import asyncio
import logging
import os
import re
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

PRICE_RE = re.compile(r"(\d+[.,]\d{2})")
PRICE_MIN = 0.10
PRICE_MAX = 500.0


def _parse_products_from_markdown(md: str, retailer: str) -> list[dict]:
    """Parse products with prices from Docling-generated markdown."""
    products = []
    seen: set[str] = set()

    for line in md.split("\n"):
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("|"):
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
        products.append({
            "retailer": retailer,
            "name": name,
            "price": price,
            "category": "offer",
        })

    return products


def _get_converter():
    """Get Docling DocumentConverter, or None if unavailable."""
    try:
        from docling.document_converter import DocumentConverter
        return DocumentConverter()
    except ImportError:
        logger.warning("Docling not available, skipping extraction")
        return None


def extract_products_from_file(file_path: str | Path, retailer: str) -> list[dict]:
    """Extract products from a PDF or image file using Docling."""
    converter = _get_converter()
    if not converter:
        return []

    try:
        result = converter.convert(str(file_path))
        md = result.document.export_to_markdown()
        products = _parse_products_from_markdown(md, retailer)
        logger.info(f"Docling extracted {len(products)} products from {Path(file_path).name}")
        return products
    except Exception as e:
        logger.error(f"Docling extraction failed for {file_path}: {e}")
        return []


async def _extract_in_thread(data: bytes, retailer: str, suffix: str) -> list[dict]:
    """Write data to temp file, run blocking Docling extraction in a thread, then clean up."""
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        tmp.write(data)
        tmp.flush()
        tmp.close()
        # Run the blocking Docling call in a thread to avoid blocking the event loop
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

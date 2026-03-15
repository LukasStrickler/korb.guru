"""
Request handlers for each Swiss retailer.
Uses Crawlee for web scraping and Docling for PDF extraction.
Issuu publications are downloaded as page images and processed via Docling OCR.
"""
import asyncio
import logging
import re
from datetime import date

import httpx

from src.pdf_extract import extract_products_from_pdf_bytes, extract_products_from_image_bytes

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "de-CH,de;q=0.9",
}

PRICE_RE = re.compile(r"(\d+[.,]\d{2})")
PRICE_MIN = 0.10
PRICE_MAX = 500.0

# Issuu page image URL pattern — each page is available as a JPEG
ISSUU_IMAGE_URL = "https://image.isu.pub/{username}/{slug}/jpg/page_{page}.jpg"
ISSUU_MAX_PAGES = 16  # cap page downloads per publication


def _parse_price(text: str) -> float | None:
    """Extract and validate price from text."""
    match = PRICE_RE.search(text.replace("CHF", "").replace("Fr.", "").strip())
    if match:
        price = float(match.group(1).replace(",", "."))
        if PRICE_MIN <= price <= PRICE_MAX:
            return price
    return None


async def _scrape_issuu_publication(
    username: str, slug: str, retailer: str, max_pages: int = ISSUU_MAX_PAGES
) -> list[dict]:
    """Download Issuu publication page images and extract products via Docling.

    Issuu hosts each page as a JPEG at a predictable URL pattern.
    We download pages sequentially until we get a 404 or hit max_pages,
    then run Docling OCR on each image to extract product names and prices.
    """
    products = []

    async with httpx.AsyncClient(headers=HEADERS, timeout=60.0) as client:
        # First verify the publication exists
        pub_url = f"https://issuu.com/{username}/docs/{slug}"
        try:
            head = await client.head(pub_url, follow_redirects=True)
            if head.status_code >= 400:
                logger.info(f"Issuu publication not found: {pub_url}")
                return []
        except Exception:
            logger.warning(f"Could not reach Issuu: {pub_url}")
            return []

        logger.info(f"Downloading Issuu pages: {username}/{slug}")

        for page_num in range(1, max_pages + 1):
            img_url = ISSUU_IMAGE_URL.format(
                username=username, slug=slug, page=page_num
            )
            try:
                resp = await client.get(img_url)
                if resp.status_code == 404:
                    logger.info(f"  Page {page_num}: 404 — end of publication")
                    break
                if not resp.is_success:
                    continue

                page_products = await extract_products_from_image_bytes(
                    resp.content, retailer, f"page_{page_num}.jpg"
                )
                products.extend(page_products)
                logger.info(f"  Page {page_num}: {len(page_products)} products")

            except Exception as e:
                logger.warning(f"  Page {page_num} failed: {e}")

            await asyncio.sleep(1.5)  # Rate limit Issuu page downloads

    logger.info(f"Issuu {username}/{slug}: {len(products)} products total")
    return products


# ---------------------------------------------------------------------------
# Aldi — PDF download + Docling extraction
# ---------------------------------------------------------------------------
async def scrape_aldi(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Download Aldi weekly PDF flyer and extract products with Docling."""
    today = date.today()
    kw = today.isocalendar()[1]
    pdf_url = f"https://s7g10.scene7.com/is/content/aldi/AW_KW{kw}_Sp01_DE_FINAL"

    async with httpx.AsyncClient(headers=HEADERS, timeout=60.0) as client:
        try:
            resp = await client.get(pdf_url)
            if not resp.is_success:
                logger.warning(f"No Aldi PDF for KW{kw} (HTTP {resp.status_code})")
                return []

            products = await extract_products_from_pdf_bytes(resp.content, "aldi")
            logger.info(f"Aldi: {len(products)} products from KW{kw} PDF")
            return products[:max_items]

        except Exception as e:
            logger.error(f"Aldi scraping failed: {e}")
            return []


# ---------------------------------------------------------------------------
# Migros — Issuu PDF + HTML aktionen page
# ---------------------------------------------------------------------------
async def scrape_migros(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Scrape Migros from Issuu Wochenflyer (Docling OCR) + aktionen HTML page."""
    products = []

    # 1. Download Issuu Wochenflyer page images → Docling extraction
    today = date.today()
    kw = today.isocalendar()[1]
    year = today.year
    # Migros publishes on Issuu as m-magazin
    # Pattern: migros-wochenflyer-{KW:02d}-{YEAR}-d-{region_code}
    region_code = {"zurich": "zh", "bern": "be", "basel": "bs"}.get(region, "aa")
    issuu_slug = f"migros-wochenflyer-{kw:02d}-{year}-d-{region_code}"
    logger.info(f"Migros: downloading Issuu KW{kw:02d} ({issuu_slug})")

    issuu_products = await _scrape_issuu_publication("m-magazin", issuu_slug, "migros")
    products.extend(issuu_products)

    # 2. Scrape HTML aktionen page via Playwright (through Crawlee)
    try:
        from crawlee.crawlers import PlaywrightCrawler, PlaywrightCrawlingContext

        found_products: list[dict] = []

        crawler = PlaywrightCrawler(
            max_requests_per_crawl=1,
            headless=True,
            request_handler_timeout=60,
        )

        @crawler.router.default_handler
        async def migros_handler(context: PlaywrightCrawlingContext) -> None:
            context.log.info(f"Scraping Migros aktionen: {context.request.url}")
            await context.page.wait_for_timeout(3000)

            items = await context.page.evaluate("""() => {
                const results = [];
                const cards = document.querySelectorAll(
                    '[class*="product-card"], [class*="ProductCard"], [class*="offer-card"], article[class*="product"]'
                );
                cards.forEach(card => {
                    if (card.closest('nav, footer, header')) return;
                    const nameEl = card.querySelector(
                        '[class*="product-name"], [class*="ProductName"], h2, h3, [class*="title"]'
                    );
                    const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
                    const imgEl = card.querySelector('img');
                    const discountEl = card.querySelector('[class*="discount"], [class*="badge"]');
                    const name = nameEl?.textContent?.trim();
                    const priceText = priceEl?.textContent?.trim();
                    const img = imgEl?.src || imgEl?.getAttribute('data-src');
                    const discount = discountEl?.textContent?.trim();
                    if (name && name.length > 2) {
                        results.push({name, price: priceText || '', img: img || '', discount: discount || ''});
                    }
                });
                return results;
            }""")

            seen: set[str] = set()
            for item in items:
                name = item["name"]
                if name.lower() in seen:
                    continue
                seen.add(name.lower())

                price = _parse_price(item.get("price", ""))
                discount = None
                dm = re.search(r"(\d{1,2})\s*%", item.get("discount", ""))
                if dm:
                    discount = float(dm.group(1))

                found_products.append({
                    "retailer": "migros",
                    "name": name,
                    "price": price,
                    "discount_pct": discount,
                    "image_url": item.get("img") or None,
                    "category": "offer",
                    "region": region,
                })

        await crawler.run(["https://www.migros.ch/de/aktionen.html"])
        products.extend(found_products)

    except Exception as e:
        logger.error(f"Migros scraping failed: {e}")

    logger.info(f"Migros: {len(products)} products total")
    return products[:max_items]


# ---------------------------------------------------------------------------
# Coop — ePaper PDF + HTML aktionen page
# ---------------------------------------------------------------------------
async def scrape_coop(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Scrape Coop aktionen page via Crawlee Playwright."""
    products = []

    try:
        from crawlee.crawlers import PlaywrightCrawler, PlaywrightCrawlingContext

        found_products: list[dict] = []

        crawler = PlaywrightCrawler(
            max_requests_per_crawl=1,
            headless=True,
            request_handler_timeout=60,
        )

        @crawler.router.default_handler
        async def coop_handler(context: PlaywrightCrawlingContext) -> None:
            context.log.info(f"Scraping Coop aktionen: {context.request.url}")
            await context.page.wait_for_timeout(3000)

            items = await context.page.evaluate("""() => {
                const results = [];
                const cards = document.querySelectorAll(
                    '[class*="product"], [class*="Product"], [class*="offer"], article'
                );
                cards.forEach(card => {
                    if (card.closest('nav, footer, header')) return;
                    const nameEl = card.querySelector(
                        '[class*="product-name"], [class*="productName"], h3, h4, [class*="title"]'
                    );
                    const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
                    const imgEl = card.querySelector('img');
                    const name = nameEl?.textContent?.trim();
                    const priceText = priceEl?.textContent?.trim();
                    const img = imgEl?.src || imgEl?.getAttribute('data-src');
                    if (name && name.length > 2) {
                        results.push({name, price: priceText || '', img: img || ''});
                    }
                });
                return results;
            }""")

            seen: set[str] = set()
            for item in items:
                name = item["name"]
                if name.lower() in seen:
                    continue
                seen.add(name.lower())

                found_products.append({
                    "retailer": "coop",
                    "name": name,
                    "price": _parse_price(item.get("price", "")),
                    "image_url": item.get("img") or None,
                    "category": "offer",
                    "region": region,
                })

        await crawler.run(["https://www.coop.ch/de/aktionen.html"])
        products.extend(found_products)

    except Exception as e:
        logger.error(f"Coop scraping failed: {e}")

    logger.info(f"Coop: {len(products)} products")
    return products[:max_items]


# ---------------------------------------------------------------------------
# Denner — HTML aktionen + Issuu PDF
# ---------------------------------------------------------------------------
async def scrape_denner(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Scrape Denner aktionen page via Crawlee BeautifulSoup."""
    products = []

    try:
        from crawlee.crawlers import BeautifulSoupCrawler, BeautifulSoupCrawlingContext

        found_products: list[dict] = []

        crawler = BeautifulSoupCrawler(
            max_requests_per_crawl=1,
            request_handler_timeout=30,
        )

        @crawler.router.default_handler
        async def denner_handler(context: BeautifulSoupCrawlingContext) -> None:
            context.log.info(f"Scraping Denner: {context.request.url}")
            soup = context.soup
            main = soup.find("main") or soup
            seen: set[str] = set()

            for el in main.select(
                "[class*='product-card'], [class*='product-tile'], "
                "[class*='promotion-item'], [class*='ProductCard']"
            ):
                name_el = el.select_one(
                    "[class*='product-name'], [class*='product-title'], h3, h4"
                )
                price_el = el.select_one("[class*='price']")
                img_el = el.select_one("img")

                name = name_el.get_text(strip=True) if name_el else ""
                if not name or len(name) < 3 or name.lower() in seen:
                    continue
                seen.add(name.lower())

                price = _parse_price(price_el.get_text(strip=True)) if price_el else None
                img_url = None
                if img_el:
                    img_url = img_el.get("src") or img_el.get("data-src")

                found_products.append({
                    "retailer": "denner",
                    "name": name,
                    "price": price,
                    "image_url": img_url,
                    "category": "offer",
                    "region": region,
                })

        await crawler.run([
            "https://www.denner.ch/de/aktionen-und-sortiment/aktuelle-aktionen"
        ])
        products.extend(found_products)

    except Exception as e:
        logger.error(f"Denner HTML scraping failed: {e}")

    # 2. Download Denner Issuu Wochenprospekt → Docling extraction
    today = date.today()
    kw = today.isocalendar()[1]
    year = today.year
    # Denner publishes on Issuu as denner-ch, pattern: {YEAR}-{KW:02d}-de
    issuu_slug = f"{year}-{kw:02d}-de"
    logger.info(f"Denner: downloading Issuu KW{kw:02d} ({issuu_slug})")

    try:
        issuu_products = await _scrape_issuu_publication(
            "denner-ch", issuu_slug, "denner"
        )
        # Deduplicate against HTML products
        existing_names = {p["name"].lower() for p in products}
        for p in issuu_products:
            if p["name"].lower() not in existing_names:
                products.append(p)
                existing_names.add(p["name"].lower())
    except Exception as e:
        logger.warning(f"Denner Issuu extraction failed: {e}")

    logger.info(f"Denner: {len(products)} products total")
    return products[:max_items]


# ---------------------------------------------------------------------------
# Lidl — Playwright PDF discovery + Docling extraction
# ---------------------------------------------------------------------------
async def scrape_lidl(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Discover Lidl PDF links via Crawlee Playwright, extract with Docling."""
    products = []

    try:
        from crawlee.crawlers import PlaywrightCrawler, PlaywrightCrawlingContext

        pdf_urls_found: list[str] = []

        crawler = PlaywrightCrawler(
            max_requests_per_crawl=1,
            headless=True,
            request_handler_timeout=60,
        )

        @crawler.router.default_handler
        async def lidl_handler(context: PlaywrightCrawlingContext) -> None:
            context.log.info(f"Scraping Lidl PDFs: {context.request.url}")
            await context.page.wait_for_timeout(3000)

            links = await context.page.evaluate("""() => {
                const results = [];
                document.querySelectorAll('a[href*=".pdf"]').forEach(a => {
                    results.push(a.href);
                });
                document.querySelectorAll('[data-href*=".pdf"], [download]').forEach(el => {
                    const href = el.getAttribute('data-href') || el.getAttribute('href');
                    if (href) results.push(href);
                });
                return results;
            }""")

            for link in links:
                if link and link not in pdf_urls_found:
                    pdf_urls_found.append(link)

        await crawler.run([
            "https://www.lidl.ch/c/de-CH/werbeprospekte-als-pdf/s10019683"
        ])

        # Download and extract PDFs with Docling
        if pdf_urls_found:
            async with httpx.AsyncClient(headers=HEADERS, timeout=60.0) as client:
                for url in pdf_urls_found[:3]:
                    try:
                        resp = await client.get(url)
                        if resp.is_success:
                            pdf_products = await extract_products_from_pdf_bytes(
                                resp.content, "lidl"
                            )
                            products.extend(pdf_products)
                            if len(products) >= max_items:
                                break
                    except Exception as e:
                        logger.warning(f"Lidl PDF download failed: {e}")
        else:
            logger.warning("No Lidl PDF URLs found")

    except Exception as e:
        logger.error(f"Lidl scraping failed: {e}")

    logger.info(f"Lidl: {len(products)} products")
    return products[:max_items]

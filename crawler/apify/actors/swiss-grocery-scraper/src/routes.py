"""
Request handlers for each Swiss retailer.

Scraping strategies — PDF-first approach (verified March 2026):
- Aldi:   PDF download from Scene7 CDN → Docling OCR
- Lidl:   Leaflets API pdfUrl → Docling OCR (fallback: API product links)
- Coop:   ePaper PDF download → Docling OCR (fallback: Playwright HTML)
- Denner: BeautifulSoup on SSR HTML (.product-item selectors)
- Migros: Playwright on /de/offers/home (article[mo-basic-product-card])

Denner & Migros have no accessible PDF source (Issuu blocked from datacenter IPs).
"""

import logging
import re
from datetime import date, timedelta

import httpx

from src.pdf_extract import extract_products_from_pdf_bytes

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "de-CH,de;q=0.9",
}

PRICE_RE = re.compile(r"(\d+[.,]\d{2})")
PRICE_MIN = 0.10
PRICE_MAX = 500.0


def _parse_price(text: str) -> float | None:
    """Extract and validate price from text."""
    match = PRICE_RE.search(text.replace("CHF", "").replace("Fr.", "").strip())
    if match:
        price = float(match.group(1).replace(",", "."))
        if PRICE_MIN <= price <= PRICE_MAX:
            return price
    return None


def _parse_discount(text: str) -> float | None:
    """Extract discount percentage from text like '38%', '½ PREIS', '50% ab 2'."""
    if not text:
        return None
    if "½" in text or "1/2" in text:
        return 50.0
    m = re.search(r"(\d{1,2})\s*%", text)
    return float(m.group(1)) if m else None


# ---------------------------------------------------------------------------
# Aldi — PDF download + Docling extraction
# ---------------------------------------------------------------------------
async def scrape_aldi(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Download Aldi weekly PDF flyer and extract products with Docling."""
    today = date.today()
    kw = today.isocalendar()[1]

    # Aldi Suisse uses multiple URL patterns for weekly flyers
    pdf_urls = [
        f"https://s7g10.scene7.com/is/content/aldi/AW_KW{kw}_Sp01_DE_FINAL",
        f"https://s7g10.scene7.com/is/content/aldi/AW_KW{kw:02d}_Sp01_DE_FINAL",
        f"https://s7g10.scene7.com/is/content/aldi/AW_KW{kw}_DE",
    ]

    async with httpx.AsyncClient(headers=HEADERS, timeout=60.0) as client:
        for pdf_url in pdf_urls:
            try:
                resp = await client.get(pdf_url)
                if resp.is_success and len(resp.content) > 1000:
                    products = await extract_products_from_pdf_bytes(
                        resp.content, "aldi"
                    )
                    logger.info(
                        f"Aldi: {len(products)} products from KW{kw} PDF ({pdf_url})"
                    )
                    return products[:max_items]
            except Exception as e:
                logger.warning(f"Aldi PDF attempt failed ({pdf_url}): {e}")

    logger.warning(f"No Aldi PDF found for KW{kw}")
    return []


# ---------------------------------------------------------------------------
# Migros — Playwright scraping of offers page
# ---------------------------------------------------------------------------
async def scrape_migros(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Scrape Migros offers via Playwright on /de/offers/home.

    Migros is an Angular SPA that loads product data via authenticated API.
    We use Playwright to render the page and extract from the DOM.
    Selectors: article[mo-basic-product-card], mo-product-name, mo-product-price.
    """
    try:
        from crawlee.crawlers import PlaywrightCrawler, PlaywrightCrawlingContext

        found_products: list[dict] = []

        crawler = PlaywrightCrawler(
            max_requests_per_crawl=1,
            headless=True,
            request_handler_timeout=timedelta(seconds=90),
        )

        @crawler.router.default_handler
        async def migros_handler(context: PlaywrightCrawlingContext) -> None:
            context.log.info(f"Scraping Migros offers: {context.request.url}")
            # Wait for product cards to render (Angular SPA)
            await context.page.wait_for_timeout(5000)

            # Scroll to trigger lazy loading
            for _ in range(3):
                await context.page.evaluate("window.scrollBy(0, 1000)")
                await context.page.wait_for_timeout(1500)

            items = await context.page.evaluate("""() => {
                const results = [];
                const cards = document.querySelectorAll(
                    'article[mo-basic-product-card]'
                );
                cards.forEach(card => {
                    // Name: mo-product-name > .name + .desc
                    const brand = card.querySelector('mo-product-name .name')
                        ?.textContent?.trim() || '';
                    const desc = card.querySelector(
                        'mo-product-name .desc span[data-testid]'
                    )?.textContent?.trim() || '';
                    const name = (brand ? brand + ' ' : '') + desc;

                    // Price
                    const currentPrice = card.querySelector(
                        '[data-testid="current-price"]'
                    )?.textContent?.trim() || '';
                    const originalPrice = card.querySelector(
                        '[data-testid="original-price"]'
                    )?.textContent?.trim() || '';

                    // Discount badge
                    const badge = card.querySelector(
                        'span[data-cy*="PERCENTAGE"] span[data-testid="description"]'
                    )?.textContent?.trim() || '';

                    // Image
                    const img = card.querySelector(
                        'mo-product-image-universal img'
                    )?.src || '';

                    if (name && name.length > 2) {
                        results.push({
                            name, price: currentPrice,
                            originalPrice, discount: badge, img
                        });
                    }
                });
                return results;
            }""")

            context.log.info(f"Found {len(items)} Migros products")

            seen: set[str] = set()
            for item in items:
                name = item["name"]
                if name.lower() in seen:
                    continue
                seen.add(name.lower())

                found_products.append(
                    {
                        "retailer": "migros",
                        "name": name,
                        "price": _parse_price(item.get("price", "")),
                        "discount_pct": _parse_discount(item.get("discount", "")),
                        "image_url": item.get("img") or None,
                        "category": "offer",
                        "region": region,
                    }
                )

        await crawler.run(["https://www.migros.ch/de/offers/home"])
        logger.info(f"Migros: {len(found_products)} products")
        return found_products[:max_items]

    except Exception as e:
        logger.error(f"Migros scraping failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Coop — ePaper PDF download → Docling extraction
# ---------------------------------------------------------------------------
async def scrape_coop(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Scrape Coop via ePaper PDF download from epaper.coopzeitung.ch.

    Strategy:
    1. Navigate to ePaper storefront with Playwright
    2. Find and click the PDF download button for the Prospektbeilagen
    3. Download PDF → extract products with Docling OCR
    4. The ePaper storefront (1101) has weekly Coopzeitung with Prospektbeilagen
    """
    try:
        from crawlee.crawlers import PlaywrightCrawler, PlaywrightCrawlingContext

        found_products: list[dict] = []

        crawler = PlaywrightCrawler(
            max_requests_per_crawl=1,
            headless=True,
            request_handler_timeout=timedelta(seconds=120),
        )

        @crawler.router.default_handler
        async def coop_handler(context: PlaywrightCrawlingContext) -> None:
            page = context.page
            context.log.info(f"Scraping Coop ePaper: {context.request.url}")

            # Handle cookie consent — decline all
            try:
                decline_btn = page.locator(
                    'button:has-text("Alles ablehnen"), '
                    'button:has-text("Alle ablehnen")'
                )
                if await decline_btn.count() > 0:
                    await decline_btn.first.click()
                    await page.wait_for_timeout(1000)
            except Exception:
                pass

            await page.wait_for_timeout(3000)

            # Look for PDF download links in the page
            pdf_urls: list[str] = []

            # Intercept PDF responses
            def on_response(response):
                ct = response.headers.get("content-type", "")
                if "pdf" in ct or response.url.endswith(".pdf"):
                    pdf_urls.append(response.url)

            page.on("response", on_response)

            # Try clicking download button for Prospektbeilagen
            beilagen = page.locator(
                'a:has-text("Prospektbeilagen"), '
                'a:has-text("Aktionen"), '
                '[class*="supplement"]'
            )
            if await beilagen.count() > 0:
                await beilagen.first.click()
                await page.wait_for_timeout(3000)

            # Try clicking the download button
            download_btn = page.locator(
                'button:has-text("herunterladen"), '
                'a:has-text("herunterladen"), '
                'button:has-text("Download"), '
                'a[download]'
            )
            if await download_btn.count() > 0:
                try:
                    async with page.expect_download(timeout=15000) as dl_info:
                        await download_btn.first.click()
                    download = await dl_info.value
                    # Read the downloaded file content
                    pdf_path = await download.path()
                    if pdf_path:
                        from pathlib import Path as _Path
                        pdf_bytes = _Path(pdf_path).read_bytes()
                        if len(pdf_bytes) > 1000:
                            products = await extract_products_from_pdf_bytes(
                                pdf_bytes, "coop", "coop-zeitung.pdf"
                            )
                            found_products.extend(products)
                            context.log.info(
                                f"Coop: {len(products)} products from ePaper PDF"
                            )
                            return
                except Exception as e:
                    context.log.warning(f"Coop PDF download failed: {e}")

            # Also check for any intercepted PDF URLs
            if pdf_urls:
                async with httpx.AsyncClient(
                    headers=HEADERS, timeout=60.0
                ) as client:
                    for url in pdf_urls[:2]:
                        try:
                            resp = await client.get(url)
                            if resp.is_success and len(resp.content) > 1000:
                                products = await extract_products_from_pdf_bytes(
                                    resp.content, "coop", "coop-prospekt.pdf"
                                )
                                found_products.extend(products)
                                context.log.info(
                                    f"Coop: {len(products)} products from "
                                    f"intercepted PDF"
                                )
                                if found_products:
                                    return
                        except Exception as e:
                            context.log.warning(f"Coop PDF fetch failed: {e}")

            context.log.warning("Coop: no PDF found, no products extracted")

        await crawler.run(
            ["https://epaper.coopzeitung.ch/storefront/1101"]
        )
        logger.info(f"Coop: {len(found_products)} products")
        return found_products[:max_items]

    except Exception as e:
        logger.error(f"Coop scraping failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Denner — BeautifulSoup HTML scraping (SSR / Nuxt)
# ---------------------------------------------------------------------------
async def scrape_denner(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Scrape Denner aktionen page via BeautifulSoup.

    Denner uses Nuxt 3 with SSR — product data is in the initial HTML.
    Selectors: .product-item, .product-item__title, .price-tag__price,
    .price-tag__discount, .product-item__image.
    """
    try:
        from crawlee.crawlers import BeautifulSoupCrawler, BeautifulSoupCrawlingContext

        found_products: list[dict] = []

        crawler = BeautifulSoupCrawler(
            max_requests_per_crawl=1,
            request_handler_timeout=timedelta(seconds=30),
        )

        @crawler.router.default_handler
        async def denner_handler(context: BeautifulSoupCrawlingContext) -> None:
            context.log.info(f"Scraping Denner: {context.request.url}")
            soup = context.soup
            seen: set[str] = set()

            for item in soup.select(".product-item"):
                name_el = item.select_one(".product-item__title")
                name = name_el.get_text(strip=True) if name_el else ""
                if not name or len(name) < 3 or name.lower() in seen:
                    continue
                seen.add(name.lower())

                # Price: .price-tag__price contains "2.99statt 4.85*"
                # We need to extract just the first price
                price_el = item.select_one(".price-tag__price")
                price = None
                if price_el:
                    price_text = price_el.get_text(strip=True)
                    # Extract first price (current price) before "statt"
                    price_match = PRICE_RE.search(price_text)
                    if price_match:
                        price = float(price_match.group(1).replace(",", "."))
                        if not (PRICE_MIN <= price <= PRICE_MAX):
                            price = None

                # Discount percentage
                discount_el = item.select_one(".price-tag__discount")
                discount = None
                if discount_el:
                    discount = _parse_discount(discount_el.get_text(strip=True))

                # Image
                img_el = item.select_one(".product-item__image")
                img_url = None
                if img_el:
                    img_url = img_el.get("src") or img_el.get("data-src")

                # Subline (description/weight)
                subline_el = item.select_one(".product-item__subline")
                subline = subline_el.get_text(strip=True) if subline_el else ""

                found_products.append(
                    {
                        "retailer": "denner",
                        "name": f"{name} ({subline})" if subline else name,
                        "price": price,
                        "discount_pct": discount,
                        "image_url": img_url,
                        "category": "offer",
                        "region": region,
                    }
                )

        await crawler.run(
            ["https://www.denner.ch/de/aktionen-und-sortiment/aktuelle-aktionen"]
        )

        logger.info(f"Denner: {len(found_products)} products")
        return found_products[:max_items]

    except Exception as e:
        logger.error(f"Denner scraping failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Lidl — Leaflets API (product names) + PDF download for prices
# ---------------------------------------------------------------------------
async def scrape_lidl(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Scrape Lidl via the Leaflets API with PDF price enrichment.

    Strategy:
    1. Fetch flyer listing page to discover current flyer slugs
    2. Query Leaflets API for each slug → get product names + pdfUrl
    3. Download PDF → try to extract prices via pdfplumber
    4. Merge: API provides accurate names, PDF provides prices
    """
    products: list[dict] = []

    async with httpx.AsyncClient(headers=HEADERS, timeout=120.0) as client:
        resp = await client.get(
            "https://www.lidl.ch/c/de-CH/werbeprospekte-als-pdf/s10019683"
        )
        if not resp.is_success:
            logger.warning(f"Lidl flyer page: HTTP {resp.status_code}")
            return []

        slugs = re.findall(r"/prospekt/([^/]+)/ar/", resp.text)
        seen_slugs: list[str] = []
        for s in slugs:
            if s not in seen_slugs:
                seen_slugs.append(s)
        slugs = seen_slugs

        if not slugs:
            kw = date.today().isocalendar()[1]
            slugs = [f"lidl-aktuell-kw{kw}", f"lidl-aktuell-kw{kw:02d}"]

        logger.info(f"Lidl: found {len(slugs)} flyer slugs: {slugs[:5]}")

        seen: set[str] = set()
        for slug in slugs[:3]:
            try:
                api_url = (
                    f"https://endpoints.leaflets.schwarz/v4/flyer"
                    f"?flyer_identifier={slug}&region_id=0&region_code=0"
                )
                api_resp = await client.get(api_url)
                if not api_resp.is_success:
                    continue

                data = api_resp.json()
                flyer = data.get("flyer", data)

                # Try PDF extraction for prices
                pdf_prices: dict[str, float] = {}
                pdf_url = flyer.get("pdfUrl")
                if pdf_url:
                    try:
                        logger.info(f"Lidl: downloading PDF for '{slug}'")
                        pdf_resp = await client.get(pdf_url)
                        if pdf_resp.is_success and len(pdf_resp.content) > 1000:
                            pdf_products = await extract_products_from_pdf_bytes(
                                pdf_resp.content, "lidl", f"lidl-{slug}.pdf"
                            )
                            for pp in pdf_products:
                                if pp.get("price") and pp.get("name"):
                                    pdf_prices[pp["name"].lower()] = pp["price"]
                            logger.info(
                                f"Lidl: extracted {len(pdf_prices)} prices from PDF"
                            )
                    except Exception as e:
                        logger.warning(f"Lidl PDF download failed: {e}")

                # Extract product names from API (accurate names)
                pages = flyer.get("pages", [])
                for page in pages:
                    for link in page.get("links", []):
                        if link.get("displayType") != "product":
                            continue
                        title = link.get("title", "").strip()
                        if not title or len(title) < 3 or title.lower() in seen:
                            continue
                        seen.add(title.lower())

                        # Try to match price from PDF extraction
                        price = pdf_prices.get(title.lower())

                        products.append(
                            {
                                "retailer": "lidl",
                                "name": title,
                                "price": price,
                                "discount_pct": None,
                                "image_url": None,
                                "category": "flyer",
                                "region": "national",
                            }
                        )

                logger.info(
                    f"Lidl flyer '{slug}': {sum(1 for p in products if p.get('price'))} "
                    f"with prices out of {len(products)} products"
                )

            except Exception as e:
                logger.warning(f"Lidl flyer '{slug}' failed: {e}")

    logger.info(f"Lidl: {len(products)} products total")
    return products[:max_items]

"""
Request handlers for each Swiss retailer.

Scraping strategies (verified March 2026):
- Denner: BeautifulSoup on SSR HTML (.product-item selectors)
- Coop:   Playwright on /de/aktionen/aktuelle-aktionen/c/m_1011 (a.productTile)
- Migros: Playwright on /de/offers/home (article[mo-basic-product-card])
- Lidl:   Leaflets API (endpoints.leaflets.schwarz) + product page HTML
- Aldi:   PDF download + Docling OCR (fallback)
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
# Coop — Playwright scraping of aktionen page
# ---------------------------------------------------------------------------
async def scrape_coop(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Scrape Coop aktionen via Playwright.

    Coop uses SAP Hybris with SpeedKit lazy loading. Products are in
    a.productTile elements with data-udo-price and data-udo-coupon attributes.
    The correct URL is /de/aktionen/aktuelle-aktionen/c/m_1011 (NOT .html).
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
        async def coop_handler(context: PlaywrightCrawlingContext) -> None:
            context.log.info(f"Scraping Coop aktionen: {context.request.url}")
            await context.page.wait_for_timeout(3000)

            # Scroll down to trigger SpeedKit lazy loading of product carousels
            for _ in range(5):
                await context.page.evaluate("window.scrollBy(0, 1500)")
                await context.page.wait_for_timeout(1500)
            # Scroll back up so all tiles are accessible
            await context.page.evaluate("window.scrollTo(0, 0)")
            await context.page.wait_for_timeout(1000)

            items = await context.page.evaluate("""() => {
                const results = [];
                const tiles = document.querySelectorAll('a.productTile');
                tiles.forEach(tile => {
                    const name = tile.querySelector(
                        '.productTile-details__name-value'
                    )?.textContent?.trim() || '';

                    // data-udo-price on dd element inside tile
                    const priceEl = tile.querySelector('[data-udo-price]');
                    const price = priceEl
                        ? priceEl.getAttribute('data-udo-price') : '';

                    // data-udo-coupon for discount
                    const couponEl = tile.querySelector('[data-udo-coupon]');
                    const discount = couponEl
                        ? couponEl.getAttribute('data-udo-coupon') : '';

                    // Old price
                    const oldPriceEl = tile.querySelector(
                        '.productTile__price-value-lead-price-old'
                    );
                    const oldPrice = oldPriceEl
                        ? oldPriceEl.textContent?.trim() : '';

                    // Image (lazy loaded)
                    const imgEl = tile.querySelector(
                        'img.product-listing__thumbnail__image'
                    );
                    const img = imgEl
                        ? (imgEl.getAttribute('data-src')
                            || imgEl.src || '') : '';

                    // Product ID
                    const pid = tile.getAttribute('data-productid') || '';

                    if (name && name.length > 2) {
                        results.push({
                            name, price, discount, oldPrice, img, pid
                        });
                    }
                });
                return results;
            }""")

            context.log.info(f"Found {len(items)} Coop products")

            seen: set[str] = set()
            for item in items:
                name = item["name"]
                if name.lower() in seen:
                    continue
                seen.add(name.lower())

                price = None
                if item.get("price"):
                    try:
                        price = float(item["price"])
                    except ValueError:
                        price = _parse_price(item["price"])

                img_url = item.get("img") or None
                if img_url and img_url.startswith("//"):
                    img_url = "https:" + img_url

                found_products.append(
                    {
                        "retailer": "coop",
                        "name": name,
                        "price": price,
                        "discount_pct": _parse_discount(item.get("discount", "")),
                        "image_url": img_url,
                        "category": "offer",
                        "region": region,
                    }
                )

        await crawler.run(
            ["https://www.coop.ch/de/aktionen/aktuelle-aktionen/c/m_1011"]
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
# Lidl — Leaflets API + product page scraping
# ---------------------------------------------------------------------------
async def scrape_lidl(max_items: int = 200, region: str = "zurich") -> list[dict]:
    """Scrape Lidl via the Leaflets API for flyer products.

    Lidl's flyer viewer uses a public JSON API at endpoints.leaflets.schwarz
    that returns structured product data (names, links, positions on pages).
    We also scrape the product listing page for additional items.
    """
    products: list[dict] = []

    # 1. Scrape flyer pages via Leaflets API
    try:
        await _scrape_lidl_flyers(products, max_items)
    except Exception as e:
        logger.warning(f"Lidl flyer API failed: {e}")

    # 2. Scrape product offers page via Playwright
    if len(products) < max_items:
        try:
            await _scrape_lidl_offers_page(products, max_items, region)
        except Exception as e:
            logger.warning(f"Lidl offers page failed: {e}")

    logger.info(f"Lidl: {len(products)} products total")
    return products[:max_items]


async def _scrape_lidl_flyers(products: list[dict], max_items: int) -> None:
    """Fetch Lidl flyer data from the Leaflets API."""
    async with httpx.AsyncClient(headers=HEADERS, timeout=30.0) as client:
        # First get the flyer listing page to find current flyer slugs
        resp = await client.get(
            "https://www.lidl.ch/c/de-CH/werbeprospekte-als-pdf/s10019683"
        )
        if not resp.is_success:
            logger.warning(f"Lidl flyer page: HTTP {resp.status_code}")
            return

        # Extract flyer identifiers from the page HTML
        slugs = re.findall(
            r'data-track-name="([^"]+)"[^>]*data-track-type="flyer"', resp.text
        )
        if not slugs:
            # Fallback: try common slug patterns
            kw = date.today().isocalendar()[1]
            slugs = [f"lidl-aktuell-kw{kw}", f"lidl-aktuell-kw{kw:02d}"]

        logger.info(f"Lidl: found {len(slugs)} flyer slugs: {slugs[:5]}")

        seen: set[str] = set()
        for slug in slugs[:3]:  # max 3 flyers
            try:
                api_url = (
                    f"https://endpoints.leaflets.schwarz/v4/flyer"
                    f"?flyer_identifier={slug}&region_id=0&region_code=0"
                )
                api_resp = await client.get(api_url)
                if not api_resp.is_success:
                    continue

                flyer = api_resp.json()
                pages = flyer.get("pages", [])

                for page in pages:
                    for link in page.get("links", []):
                        if link.get("displayType") != "product":
                            continue
                        title = link.get("title", "").strip()
                        if not title or len(title) < 3 or title.lower() in seen:
                            continue
                        seen.add(title.lower())

                        products.append(
                            {
                                "retailer": "lidl",
                                "name": title,
                                "price": None,  # Flyer API doesn't include prices
                                "discount_pct": None,
                                "image_url": None,
                                "category": "flyer",
                                "region": "national",
                            }
                        )

                        if len(products) >= max_items:
                            return

                logger.info(
                    f"Lidl flyer '{slug}': "
                    f"{sum(len(p.get('links', [])) for p in pages)} product links"
                )

            except Exception as e:
                logger.warning(f"Lidl flyer '{slug}' failed: {e}")


async def _scrape_lidl_offers_page(
    products: list[dict], max_items: int, region: str
) -> None:
    """Scrape Lidl product offers page via Playwright."""
    from crawlee.crawlers import PlaywrightCrawler, PlaywrightCrawlingContext

    existing_names = {p["name"].lower() for p in products}

    crawler = PlaywrightCrawler(
        max_requests_per_crawl=1,
        headless=True,
        request_handler_timeout=timedelta(seconds=60),
    )

    @crawler.router.default_handler
    async def lidl_handler(context: PlaywrightCrawlingContext) -> None:
        context.log.info(f"Scraping Lidl offers: {context.request.url}")
        await context.page.wait_for_timeout(3000)

        # Scroll to load more products
        for _ in range(3):
            await context.page.evaluate("window.scrollBy(0, 1000)")
            await context.page.wait_for_timeout(1000)

        items = await context.page.evaluate("""() => {
            const results = [];
            const tiles = document.querySelectorAll('.product-grid-box');
            tiles.forEach(tile => {
                const name = tile.querySelector(
                    '.product-grid-box__title'
                )?.textContent?.trim() || '';

                const price = tile.querySelector(
                    '.ods-price__value'
                )?.textContent?.trim() || '';

                const oldPrice = tile.querySelector(
                    '.ods-price__stroke-price s'
                )?.textContent?.trim() || '';

                const discount = tile.querySelector(
                    '.ods-price__box-content-text-el'
                )?.textContent?.trim() || '';

                const img = tile.querySelector(
                    '.odsc-image-gallery__image'
                )?.src || '';

                if (name && name.length > 2) {
                    results.push({name, price, oldPrice, discount, img});
                }
            });
            return results;
        }""")

        context.log.info(f"Found {len(items)} Lidl products on offers page")

        for item in items:
            name = item["name"]
            if name.lower() in existing_names:
                continue
            existing_names.add(name.lower())

            products.append(
                {
                    "retailer": "lidl",
                    "name": name,
                    "price": _parse_price(item.get("price", "")),
                    "discount_pct": _parse_discount(item.get("discount", "")),
                    "image_url": item.get("img") or None,
                    "category": "offer",
                    "region": region,
                }
            )

    await crawler.run(["https://www.lidl.ch/h/de-CH/unsere-highlights/h10007395"])

"""
Apify Crawler Orchestrator

Runs the custom swiss-grocery-scraper Actor for all 5 Swiss retailers:
Aldi, Migros, Coop, Denner, Lidl.

Usage:
    python -m crawler.apify.orchestrator
    python -m crawler.apify.orchestrator --chain=aldi
    python -m crawler.apify.orchestrator --ingest
"""
import argparse
import logging
import time

from apify_client import ApifyClient

from crawler.apify.config import (
    APIFY_TOKEN,
    ALL_RETAILERS,
    CUSTOM_ACTOR_ID,
    CUSTOM_ACTOR_INPUT,
    MAX_RETRIES,
    ACTOR_TIMEOUT_SECS,
)
from crawler.apify.ingest.pipeline import ingest_items
from crawler.apify.ingest.transform import normalize_items

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("apify-orchestrator")


def run_actor_with_retry(
    client: ApifyClient,
    actor_id: str,
    run_input: dict,
    retries: int = MAX_RETRIES,
) -> list[dict]:
    """Run an Apify Actor with retry logic."""
    for attempt in range(1, retries + 1):
        try:
            logger.info(f"Running Actor '{actor_id}' (attempt {attempt}/{retries})...")
            start = time.time()

            run = client.actor(actor_id).call(
                run_input=run_input,
                timeout_secs=ACTOR_TIMEOUT_SECS,
            )
            items = client.dataset(run["defaultDatasetId"]).list_items().items
            elapsed = round(time.time() - start, 1)
            logger.info(f"  Got {len(items)} items in {elapsed}s")
            return items

        except Exception as e:
            logger.warning(f"  Attempt {attempt} failed: {e}")
            if attempt < retries:
                wait = 5 * attempt
                logger.info(f"  Retrying in {wait}s...")
                time.sleep(wait)
            else:
                logger.error(f"  All {retries} attempts failed for '{actor_id}'")
                raise RuntimeError(
                    f"Actor '{actor_id}' failed after {retries} attempts"
                ) from e


def main():
    parser = argparse.ArgumentParser(description="Apify Crawler Orchestrator")
    parser.add_argument("--chain", type=str, help=f"Run single chain only ({'/'.join(ALL_RETAILERS)})")
    parser.add_argument("--ingest", action="store_true", help="Ingest results to Qdrant")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be run without executing")
    args = parser.parse_args()

    if not APIFY_TOKEN:
        logger.error("APIFY_TOKEN not set. Export it or add to .env")
        return

    client = ApifyClient(APIFY_TOKEN)

    print("\n" + "=" * 55)
    print("  Apify Crawler Orchestrator")
    print("=" * 55 + "\n")

    # Determine which retailers to scrape
    if args.chain:
        if args.chain not in ALL_RETAILERS:
            logger.error(f"Unknown chain '{args.chain}'. Available: {ALL_RETAILERS}")
            return
        retailers = [args.chain]
    else:
        retailers = ALL_RETAILERS

    if args.dry_run:
        print("DRY RUN - would execute:")
        print(f"  - Actor: {CUSTOM_ACTOR_ID}")
        print(f"  - Retailers: {retailers}")
        print(f"  - Max items per retailer: {CUSTOM_ACTOR_INPUT['maxItems']}")
        return

    # Build input for this run
    run_input = {**CUSTOM_ACTOR_INPUT, "retailers": retailers}

    items = run_actor_with_retry(client, CUSTOM_ACTOR_ID, run_input)
    normalized = normalize_items(items, "custom")

    print(f"\nTotal items collected: {len(normalized)}")

    if args.ingest and normalized:
        print(f"\nIngesting {len(normalized)} items to Qdrant...")
        ingest_items(normalized)
        print("Ingestion complete.")
    elif not normalized:
        print("\nNo items to ingest.")


if __name__ == "__main__":
    main()

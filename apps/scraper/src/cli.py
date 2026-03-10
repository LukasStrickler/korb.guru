"""CLI entrypoint for Korb scraper."""

import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError

import click

from .ingestion import (
    DEFAULT_FASTAPI_INGEST_URL,
    post_records_to_endpoint,
    run_mock_ingestion,
    serialize_records,
    write_records_to_file,
)


@click.command()
@click.option(
    "--format",
    type=click.Choice(["json", "jsonl"]),
    default="json",
    help="Output format (json or jsonl)",
)
@click.option(
    "--limit",
    type=int,
    default=5,
    help="Maximum number of records to output",
)
@click.option(
    "--sink",
    type=click.Choice(["stdout", "file", "fastapi", "convex"]),
    default="stdout",
    help="Output sink for mock ingestion records",
)
@click.option(
    "--output-file",
    type=click.Path(path_type=Path, dir_okay=False),
    default=None,
    help="Target file when --sink file",
)
@click.option(
    "--endpoint-url",
    type=str,
    default=None,
    help="Target URL when --sink fastapi or --sink convex",
)
@click.option(
    "--api-token",
    type=str,
    default=None,
    help="Optional bearer token used for HTTP sinks",
)
def main(
    format: str,
    limit: int,
    sink: str,
    output_file: Path | None,
    endpoint_url: str | None,
    api_token: str | None,
) -> None:
    """Run the Korb recipe scraper.

    Outputs recipe and user data to one of the configured sinks.
    """
    records = run_mock_ingestion(limit=limit)

    if sink == "stdout":
        click.echo(serialize_records(records, output_format=format))
        return

    if sink == "file":
        target_file = output_file or Path(f"mock-ingestion.{format}")
        written_path = write_records_to_file(
            records,
            output_file=target_file,
            output_format=format,
        )
        click.echo(
            json.dumps(
                {
                    "sink": sink,
                    "records": len(records),
                    "outputFile": str(written_path),
                },
                indent=2,
            )
        )
        return

    resolved_endpoint = endpoint_url
    if sink == "fastapi" and resolved_endpoint is None:
        resolved_endpoint = DEFAULT_FASTAPI_INGEST_URL

    if resolved_endpoint is None:
        raise click.UsageError("--endpoint-url is required when --sink convex")

    # Prefer --api-token; else server-only env (not exposed to client)
    ingest_token = (
        api_token
        or os.environ.get("INGEST_API_KEY")
        or os.environ.get("SCRAPER_INGEST_API_TOKEN")
    )

    try:
        result = post_records_to_endpoint(
            records,
            endpoint_url=resolved_endpoint,
            sink=sink,
            api_token=ingest_token,
        )
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        raise click.ClickException(
            f"Failed to send records to {resolved_endpoint}: {exc}"
        ) from exc

    click.echo(
        json.dumps(
            {
                "sink": sink,
                "records": len(records),
                **result,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

"""Mock ingestion module for recipe and user data."""

import json
from pathlib import Path
from typing import Any
from urllib import request

Record = dict[str, Any]

DEFAULT_FASTAPI_INGEST_URL = "http://127.0.0.1:8001/ingest"


def get_mock_recipes() -> list[Record]:
    """Return mock recipe data for testing and development."""
    return [
        {
            "id": "recipe-001",
            "title": "Classic Spaghetti Carbonara",
            "userId": "user-001",
            "ingredients": [
                {"name": "spaghetti", "amount": "400g"},
                {"name": "guanciale", "amount": "200g"},
                {"name": "eggs", "amount": "4"},
                {"name": "pecorino romano", "amount": "100g"},
                {"name": "black pepper", "amount": "to taste"},
            ],
            "instructions": [
                "Cook spaghetti in salted boiling water",
                "Crisp guanciale in a pan",
                "Mix eggs with pecorino",
                "Combine pasta with guanciale off heat",
                "Add egg mixture and toss quickly",
            ],
            "source": "mock",
            "tags": ["pasta", "italian", "quick"],
        },
        {
            "id": "recipe-002",
            "title": "Thai Green Curry",
            "userId": "user-002",
            "ingredients": [
                {"name": "coconut milk", "amount": "400ml"},
                {"name": "green curry paste", "amount": "3 tbsp"},
                {"name": "chicken breast", "amount": "500g"},
                {"name": "bamboo shoots", "amount": "100g"},
                {"name": "thai basil", "amount": "handful"},
            ],
            "instructions": [
                "Fry curry paste in coconut cream",
                "Add sliced chicken and cook through",
                "Pour in remaining coconut milk",
                "Add bamboo shoots and simmer",
                "Finish with thai basil",
            ],
            "source": "mock",
            "tags": ["curry", "thai", "spicy"],
        },
        {
            "id": "recipe-003",
            "title": "Classic Greek Salad",
            "userId": "user-001",
            "ingredients": [
                {"name": "cucumber", "amount": "2"},
                {"name": "tomatoes", "amount": "4"},
                {"name": "red onion", "amount": "1"},
                {"name": "feta cheese", "amount": "200g"},
                {"name": "kalamata olives", "amount": "100g"},
                {"name": "olive oil", "amount": "4 tbsp"},
            ],
            "instructions": [
                "Chop vegetables into chunks",
                "Slice red onion thinly",
                "Top with feta block",
                "Add olives around",
                "Drizzle with olive oil",
            ],
            "source": "mock",
            "tags": ["salad", "greek", "vegetarian"],
        },
    ]


def get_mock_users() -> list[Record]:
    """Return mock user data for testing and development."""
    return [
        {
            "id": "user-001",
            "email": "alice@example.com",
            "name": "Alice Chen",
            "preferences": {
                "dietary": ["vegetarian"],
                "cuisines": ["italian", "greek"],
            },
        },
        {
            "id": "user-002",
            "email": "bob@example.com",
            "name": "Bob Martinez",
            "preferences": {
                "dietary": [],
                "cuisines": ["thai", "mexican", "indian"],
            },
        },
    ]


def run_mock_ingestion(limit: int = 5) -> list[Record]:
    """Run mock ingestion and return records.

    Returns a mix of recipe and user records, limited to the specified count.
    Each record includes a 'type' field to distinguish between record types.

    Args:
        limit: Maximum number of records to return

    Returns:
        List of record dictionaries suitable for JSON serialization
    """
    records: list[Record] = []

    # Add recipes with type marker
    for recipe in get_mock_recipes():
        records.append({**recipe, "type": "recipe"})

    # Add users with type marker
    for user in get_mock_users():
        records.append({**user, "type": "user"})

    return records[:limit]


def serialize_records(records: list[Record], output_format: str = "json") -> str:
    if output_format == "jsonl":
        return "\n".join(json.dumps(record) for record in records)

    return json.dumps(records, indent=2)


def write_records_to_file(
    records: list[Record],
    output_file: Path,
    output_format: str = "json",
) -> Path:
    payload = serialize_records(records, output_format=output_format)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(f"{payload}\n", encoding="utf-8")
    return output_file


def post_records_to_endpoint(
    records: list[Record],
    endpoint_url: str,
    sink: str,
    api_token: str | None = None,
    timeout_seconds: int = 10,
) -> dict[str, Any]:
    body = {
        "source": "scraper",
        "sink": sink,
        "recordCount": len(records),
        "records": records,
    }
    headers = {"Content-Type": "application/json"}
    if api_token:
        headers["Authorization"] = f"Bearer {api_token}"

    http_request = request.Request(
        endpoint_url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    with request.urlopen(http_request, timeout=timeout_seconds) as response:
        response_text = response.read().decode("utf-8").strip()

    response_body: Any
    if response_text:
        try:
            response_body = json.loads(response_text)
        except json.JSONDecodeError:
            response_body = {"raw": response_text}
    else:
        response_body = {}

    return {
        "status_code": response.status,
        "endpoint": endpoint_url,
        "response": response_body,
    }

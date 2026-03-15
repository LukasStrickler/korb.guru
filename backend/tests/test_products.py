"""Tests for product endpoints: search, compare, deals."""
import uuid

import pytest
from qdrant_client import models

from tests.conftest import _fake_embed_text, VECTOR_SIZE


@pytest.fixture()
def seeded_products(qdrant_memory):
    """Insert test products into in-memory Qdrant."""
    products = [
        {"name": "Emmentaler Käse", "retailer": "migros", "price": 4.50, "discount_pct": 20.0, "category": "dairy"},
        {"name": "Bio Milch 1L", "retailer": "coop", "price": 1.80, "discount_pct": 0, "category": "dairy"},
        {"name": "Rüebli 1kg", "retailer": "aldi", "price": 1.20, "discount_pct": 15.0, "category": "vegetables"},
        {"name": "Poulet Brust", "retailer": "denner", "price": 8.90, "discount_pct": 25.0, "category": "meat"},
    ]
    points = []
    for p in products:
        dense = _fake_embed_text(p["name"])
        points.append(models.PointStruct(
            id=str(uuid.uuid4()),
            vector={"dense": dense, "sparse": models.SparseVector(indices=[0], values=[1.0])},
            payload=p,
        ))
    qdrant_memory.upsert(collection_name="products", points=points)
    return products


def test_search_products(auth_client, test_household, seeded_products):
    resp = auth_client.get("/api/v1/products/search?q=Käse")
    assert resp.status_code == 200
    results = resp.json()
    assert isinstance(results, list)


def test_search_with_retailer_filter(auth_client, test_household, seeded_products):
    resp = auth_client.get("/api/v1/products/search?q=Milch&retailers=coop")
    assert resp.status_code == 200


def test_search_with_max_price(auth_client, test_household, seeded_products):
    resp = auth_client.get("/api/v1/products/search?q=food&max_price=2.00")
    assert resp.status_code == 200


def test_compare_products(auth_client, test_household, seeded_products):
    resp = auth_client.get("/api/v1/products/compare?ingredient=Milch")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_deals(auth_client, test_household, seeded_products):
    resp = auth_client.get("/api/v1/products/deals")
    assert resp.status_code == 200
    results = resp.json()
    assert isinstance(results, list)

"""Tests for recipe endpoints: create, list, swipe, recommendations, discover, metrics."""
import uuid


RECIPE_BODY = {
    "title": "Chicken Alfredo",
    "description": "Creamy pasta with chicken",
    "cost": 12.50,
    "time_minutes": 30,
    "type": "protein",
    "ingredients": [
        {"name": "Chicken breast", "quantity": "500", "unit": "g"},
        {"name": "Pasta", "quantity": "250", "unit": "g"},
        {"name": "Cream", "quantity": "200", "unit": "ml"},
    ],
}


def test_create_recipe(auth_client, test_household):
    resp = auth_client.post("/api/v1/recipes", json=RECIPE_BODY)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Chicken Alfredo"
    assert data["cost"] == 12.50
    assert len(data["ingredients"]) == 3


def test_list_recipes(auth_client, test_household):
    auth_client.post("/api/v1/recipes", json=RECIPE_BODY)
    auth_client.post("/api/v1/recipes", json={
        **RECIPE_BODY, "title": "Veggie Stir Fry", "type": "veggie",
    })
    resp = auth_client.get("/api/v1/recipes")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_recipe_by_id(auth_client, test_household):
    create_resp = auth_client.post("/api/v1/recipes", json=RECIPE_BODY)
    recipe_id = create_resp.json()["id"]
    resp = auth_client.get(f"/api/v1/recipes/{recipe_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Chicken Alfredo"


def test_get_recipe_not_found(auth_client, test_household):
    resp = auth_client.get(f"/api/v1/recipes/{uuid.uuid4()}")
    assert resp.status_code == 404


def test_swipe_accept(auth_client, test_household):
    create_resp = auth_client.post("/api/v1/recipes", json=RECIPE_BODY)
    recipe_id = create_resp.json()["id"]
    resp = auth_client.post(f"/api/v1/recipes/{recipe_id}/swipe", json={"action": "accept"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_swipe_reject(auth_client, test_household):
    create_resp = auth_client.post("/api/v1/recipes", json=RECIPE_BODY)
    recipe_id = create_resp.json()["id"]
    resp = auth_client.post(f"/api/v1/recipes/{recipe_id}/swipe", json={"action": "reject"})
    assert resp.status_code == 200


def test_swipe_not_found(auth_client, test_household):
    resp = auth_client.post(f"/api/v1/recipes/{uuid.uuid4()}/swipe", json={"action": "accept"})
    assert resp.status_code == 404


def test_recommendations_cold_start(auth_client, test_household):
    """Recommendations with no swipe history should return results (fallback)."""
    resp = auth_client.get("/api/v1/recipes/recommendations")
    assert resp.status_code == 200
    # May be empty if no recipes exist in Qdrant, that's fine
    assert isinstance(resp.json(), list)


def test_recommendations_with_swipes(auth_client, test_household):
    """After swiping, recommendations should still return 200."""
    # Create and swipe on a recipe
    create_resp = auth_client.post("/api/v1/recipes", json=RECIPE_BODY)
    recipe_id = create_resp.json()["id"]
    auth_client.post(f"/api/v1/recipes/{recipe_id}/swipe", json={"action": "accept"})

    resp = auth_client.get("/api/v1/recipes/recommendations")
    assert resp.status_code == 200


def test_discover_cold_start(auth_client, test_household):
    """Discovery with no context should fallback to vector search."""
    resp = auth_client.get("/api/v1/recipes/discover")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_discover_with_query(auth_client, test_household):
    """Discovery with a text query."""
    auth_client.post("/api/v1/recipes", json=RECIPE_BODY)
    resp = auth_client.get("/api/v1/recipes/discover?q=chicken")
    assert resp.status_code == 200


def test_discovery_metrics_cold_start(auth_client, test_household):
    """Metrics should show cold_start phase with no swipes."""
    resp = auth_client.get("/api/v1/recipes/discovery-metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_swipes"] == 0
    assert data["phase"] == "cold_start"


def test_discovery_metrics_after_swipes(auth_client, test_household):
    """After swipes, phase should advance from cold_start."""
    recipes = []
    for i in range(6):
        r = auth_client.post("/api/v1/recipes", json={
            **RECIPE_BODY,
            "title": f"Recipe {i}",
            "cost": 5.0 + i,
        })
        recipes.append(r.json()["id"])

    # Swipe accept on first 4, reject on last 2
    for rid in recipes[:4]:
        auth_client.post(f"/api/v1/recipes/{rid}/swipe", json={"action": "accept"})
    for rid in recipes[4:]:
        auth_client.post(f"/api/v1/recipes/{rid}/swipe", json={"action": "reject"})

    resp = auth_client.get("/api/v1/recipes/discovery-metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_swipes"] == 6
    assert data["phase"] in ("learning", "personalized")
    assert data["context_pairs_available"] > 0


def test_search_recipes(auth_client, test_household):
    auth_client.post("/api/v1/recipes", json=RECIPE_BODY)
    resp = auth_client.get("/api/v1/recipes/search?q=chicken")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

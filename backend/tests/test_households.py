"""Tests for household endpoints: create, join, get, members."""
from app.services.auth_service import create_access_token


def test_create_household(auth_client):
    resp = auth_client.post("/api/v1/households", json={"name": "Zürich WG"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Zürich WG"
    assert "invite_code" in data


def test_create_household_already_in_one(auth_client, test_household):
    resp = auth_client.post("/api/v1/households", json={"name": "Another"})
    assert resp.status_code == 400


def test_join_household(client, test_household, test_user_2):
    token = create_access_token({"sub": str(test_user_2.id)})
    client.headers["Authorization"] = f"Bearer {token}"
    resp = client.post("/api/v1/households/join", json={
        "invite_code": test_household.invite_code,
    })
    assert resp.status_code == 200
    assert resp.json()["name"] == test_household.name


def test_join_invalid_code(auth_client):
    resp = auth_client.post("/api/v1/households/join", json={
        "invite_code": "invalid-code",
    })
    assert resp.status_code == 404


def test_get_household(auth_client, test_household):
    resp = auth_client.get("/api/v1/households")
    assert resp.status_code == 200
    assert resp.json()["name"] == test_household.name


def test_get_household_not_in_one(auth_client):
    resp = auth_client.get("/api/v1/households")
    assert resp.status_code == 404


def test_get_members(client, test_household, test_user, test_user_2, session):
    # Join user2 to the household
    test_user_2.household_id = test_household.id
    session.add(test_user_2)
    session.commit()

    token = create_access_token({"sub": str(test_user.id)})
    client.headers["Authorization"] = f"Bearer {token}"
    resp = client.get("/api/v1/households/members")
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 2
    usernames = {m["username"] for m in members}
    assert "testuser" in usernames
    assert "user2" in usernames

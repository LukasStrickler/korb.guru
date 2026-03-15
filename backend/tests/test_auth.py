"""Tests for auth endpoints: register, login, /me."""


def test_register_success(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "new@korb.guru",
        "username": "newuser",
        "password": "Secure1Pass",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client):
    body = {"email": "dup@korb.guru", "username": "user1", "password": "Secure1Pass"}
    client.post("/api/v1/auth/register", json=body)
    resp = client.post("/api/v1/auth/register", json={
        **body, "username": "user2",
    })
    assert resp.status_code == 409


def test_register_weak_password_no_uppercase(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "weak@korb.guru",
        "username": "weakuser",
        "password": "nouppercase1",
    })
    assert resp.status_code == 422


def test_register_weak_password_no_digit(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "weak@korb.guru",
        "username": "weakuser",
        "password": "NoDigitHere",
    })
    assert resp.status_code == 422


def test_register_password_too_short(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "short@korb.guru",
        "username": "shortpw",
        "password": "Ab1",
    })
    assert resp.status_code == 422


def test_login_success(client):
    client.post("/api/v1/auth/register", json={
        "email": "login@korb.guru",
        "username": "loginuser",
        "password": "Secure1Pass",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "login@korb.guru",
        "password": "Secure1Pass",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json={
        "email": "wrong@korb.guru",
        "username": "wrongpw",
        "password": "Secure1Pass",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "wrong@korb.guru",
        "password": "WrongPass1",
    })
    assert resp.status_code == 401


def test_login_nonexistent_email(client):
    resp = client.post("/api/v1/auth/login", json={
        "email": "ghost@korb.guru",
        "password": "Whatever1",
    })
    assert resp.status_code == 401


def test_get_me_authenticated(auth_client, test_user):
    resp = auth_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == test_user.email
    assert data["username"] == test_user.username


def test_get_me_no_token(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 403  # HTTPBearer returns 403 when no token

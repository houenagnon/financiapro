import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User


@pytest.fixture
def economat(db):
    return User.objects.create_user(
        "central@test.local",
        "Passw0rd!Test",
        first_name="Centre",
        last_name="Économat",
        role=User.Role.ECONOMAT_CENTRAL,
    )


@pytest.fixture
def econome(db, economat):
    return User.objects.create_user(
        "econome@test.local",
        "Passw0rd!Test",
        first_name="Jean",
        last_name="Économe",
        role=User.Role.ECONOME_PRINCIPAL,
        created_by=economat,
    )


@pytest.fixture
def client_for():
    def _client(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _client


class TestAuthFlow:
    def test_login_returns_tokens(self, db, economat):
        client = APIClient()
        response = client.post(
            "/api/auth/login/",
            {"email": "central@test.local", "password": "Passw0rd!Test"},
        )
        assert response.status_code == 200
        assert {"access", "refresh"} <= response.data.keys()

    def test_me_returns_current_user(self, economat, client_for):
        response = client_for(economat).get("/api/auth/me/")
        assert response.status_code == 200
        assert response.data["email"] == "central@test.local"
        assert response.data["role"] == "ECONOMAT_CENTRAL"

    def test_me_requires_auth(self, db):
        assert APIClient().get("/api/auth/me/").status_code == 401


class TestUserCreationHierarchy:
    def test_economat_can_create_econome(self, economat, client_for):
        response = client_for(economat).post(
            "/api/users/",
            {
                "email": "nouveau@test.local",
                "password": "Passw0rd!Test",
                "first_name": "Nouveau",
                "last_name": "Compte",
                "role": "ECONOME_PRINCIPAL",
            },
        )
        assert response.status_code == 201
        created = User.objects.get(email="nouveau@test.local")
        assert created.created_by == economat

    def test_econome_cannot_create_econome(self, econome, client_for):
        response = client_for(econome).post(
            "/api/users/",
            {
                "email": "interdit@test.local",
                "password": "Passw0rd!Test",
                "first_name": "Interdit",
                "last_name": "Compte",
                "role": "ECONOME_PRINCIPAL",
            },
        )
        assert response.status_code == 400

    def test_econome_can_create_assistant(self, econome, client_for):
        response = client_for(econome).post(
            "/api/users/",
            {
                "email": "assistant@test.local",
                "password": "Passw0rd!Test",
                "first_name": "Aline",
                "last_name": "Assistante",
                "role": "ASSISTANT",
            },
        )
        assert response.status_code == 201

    def test_assistant_cannot_list_users(self, econome, client_for):
        assistant = User.objects.create_user(
            "asst@test.local",
            "Passw0rd!Test",
            first_name="A",
            last_name="B",
            role=User.Role.ASSISTANT,
            created_by=econome,
        )
        assert client_for(assistant).get("/api/users/").status_code == 403


class TestUserScoping:
    def test_economat_sees_all_users(self, economat, econome, client_for):
        response = client_for(economat).get("/api/users/")
        assert response.data["count"] == 2

    def test_econome_sees_only_own_scope(self, economat, econome, client_for):
        response = client_for(econome).get("/api/users/")
        emails = {u["email"] for u in response.data["results"]}
        assert "central@test.local" not in emails
        assert "econome@test.local" in emails


class TestErrorFormat:
    def test_validation_error_format(self, economat, client_for):
        response = client_for(economat).post("/api/users/", {"email": "pas-un-email"})
        assert response.status_code == 400
        assert response.data["code"] == "validation_error"
        assert "fields" in response.data

    def test_permission_error_format(self, econome, client_for):
        assistant = User.objects.create_user(
            "asst2@test.local",
            "Passw0rd!Test",
            first_name="A",
            last_name="B",
            role=User.Role.ASSISTANT,
        )
        client = APIClient()
        client.force_authenticate(assistant)
        response = client.get("/api/users/")
        assert response.status_code == 403
        assert set(response.data.keys()) == {"detail", "code"}

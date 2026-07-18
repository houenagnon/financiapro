import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.centres.models import Centre, TypeCentre


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
def type_paroisse(db):
    return TypeCentre.objects.create(code="paroisse", libelle="Paroisse")


@pytest.fixture
def client_for():
    def _client(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _client


def creer_centre(client, type_centre, nom="Paroisse Saint-Marc", email="eco@test.local"):
    return client.post(
        "/api/centres/",
        {
            "nom": nom,
            "type_centre_id": type_centre.pk,
            "description": "",
            "econome": {
                "email": email,
                "first_name": "Jean",
                "last_name": "Économe",
                "password": "Passw0rd!Test",
            },
        },
        format="json",
    )


class TestCreationCentre:
    def test_creation_atomique_centre_et_econome(
        self, economat, type_paroisse, client_for
    ):
        response = creer_centre(client_for(economat), type_paroisse)
        assert response.status_code == 201
        centre = Centre.objects.get(nom="Paroisse Saint-Marc")
        econome = User.objects.get(email="eco@test.local")
        assert centre.econome_principal == econome
        assert econome.centre == centre
        assert econome.role == User.Role.ECONOME_PRINCIPAL

    def test_email_econome_deja_pris_ne_cree_rien(
        self, economat, type_paroisse, client_for
    ):
        creer_centre(client_for(economat), type_paroisse)
        response = creer_centre(
            client_for(economat), type_paroisse, nom="Autre", email="eco@test.local"
        )
        assert response.status_code == 400
        assert Centre.objects.count() == 1

    def test_econome_ne_peut_pas_creer_de_centre(
        self, economat, type_paroisse, client_for
    ):
        creer_centre(client_for(economat), type_paroisse)
        econome = User.objects.get(email="eco@test.local")
        response = creer_centre(
            client_for(econome), type_paroisse, nom="Interdit", email="autre@test.local"
        )
        assert response.status_code == 403


class TestIsolationParCentre:
    def test_assistant_rattache_au_centre_de_son_econome(
        self, economat, type_paroisse, client_for
    ):
        creer_centre(client_for(economat), type_paroisse)
        econome = User.objects.get(email="eco@test.local")
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
        assistant = User.objects.get(email="assistant@test.local")
        assert assistant.centre == econome.centre

    def test_econome_ne_voit_que_les_membres_de_son_centre(
        self, economat, type_paroisse, client_for
    ):
        client = client_for(economat)
        creer_centre(client, type_paroisse, nom="Centre A", email="eco-a@test.local")
        creer_centre(client, type_paroisse, nom="Centre B", email="eco-b@test.local")
        econome_a = User.objects.get(email="eco-a@test.local")
        response = client_for(econome_a).get("/api/users/")
        emails = {u["email"] for u in response.data["results"]}
        assert emails == {"eco-a@test.local"}

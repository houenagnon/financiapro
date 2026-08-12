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


class TestSuppression:
    def test_econome_supprime_son_assistant(self, economat, type_paroisse, client_for):
        creer_centre(client_for(economat), type_paroisse)
        econome = User.objects.get(email="eco@test.local")
        client_for(econome).post(
            "/api/users/",
            {
                "email": "assistant@test.local",
                "password": "Passw0rd!Test",
                "first_name": "Aline",
                "last_name": "Assistante",
                "role": "ASSISTANT",
            },
        )
        assistant = User.objects.get(email="assistant@test.local")
        response = client_for(econome).delete(f"/api/users/{assistant.pk}/")
        assert response.status_code == 204
        assert not User.objects.filter(pk=assistant.pk).exists()

    def test_impossible_de_supprimer_un_assistant_avec_transactions(
        self, economat, type_paroisse, client_for
    ):
        from apps.finances.models import Category, Nature, Transaction

        creer_centre(client_for(economat), type_paroisse)
        econome = User.objects.get(email="eco@test.local")
        client_for(econome).post(
            "/api/users/",
            {
                "email": "assistant@test.local",
                "password": "Passw0rd!Test",
                "first_name": "Aline",
                "last_name": "Assistante",
                "role": "ASSISTANT",
            },
        )
        assistant = User.objects.get(email="assistant@test.local")
        categorie = Category.objects.create(nom="Dons", nature=Nature.REVENU)
        Transaction.objects.create(
            centre=econome.centre, type_operation="REVENU", montant="10.00",
            date_operation="2026-07-15", category=categorie, saisi_par=assistant,
        )
        response = client_for(econome).delete(f"/api/users/{assistant.pk}/")
        assert response.status_code == 400
        assert response.data["code"] == "protected"
        assert User.objects.filter(pk=assistant.pk).exists()

    def test_supprimer_un_centre_vide(self, economat, type_paroisse, client_for):
        creer_centre(client_for(economat), type_paroisse)
        centre = Centre.objects.get(nom="Paroisse Saint-Marc")
        response = client_for(economat).delete(f"/api/centres/{centre.pk}/")
        assert response.status_code == 204
        assert not Centre.objects.filter(pk=centre.pk).exists()
        assert not User.objects.filter(email="eco@test.local").exists()

    def test_supprime_un_centre_avec_transactions_et_membres(
        self, economat, type_paroisse, client_for
    ):
        from apps.finances.models import Category, Nature, Transaction

        client = client_for(economat)
        creer_centre(client, type_paroisse)
        centre = Centre.objects.get(nom="Paroisse Saint-Marc")
        econome = centre.econome_principal
        categorie = Category.objects.create(nom="Dons", nature=Nature.REVENU)
        Transaction.objects.create(
            centre=centre, type_operation="REVENU", montant="10.00",
            date_operation="2026-07-15", category=categorie,
            saisi_par=econome,
        )
        client_for(econome).post(
            "/api/users/",
            {
                "email": "assistant@test.local",
                "password": "Passw0rd!Test",
                "first_name": "Aline",
                "last_name": "Assistante",
                "role": "ASSISTANT",
            },
        )
        assistant_id = User.objects.get(email="assistant@test.local").pk

        response = client.delete(f"/api/centres/{centre.pk}/")

        assert response.status_code == 204
        assert not Centre.objects.filter(pk=centre.pk).exists()
        assert not Transaction.objects.filter(centre_id=centre.pk).exists()
        assert not User.objects.filter(pk=econome.pk).exists()
        assert not User.objects.filter(pk=assistant_id).exists()

    def test_suppression_d_un_centre_n_affecte_pas_les_autres(
        self, economat, type_paroisse, client_for
    ):
        from apps.finances.models import Category, Nature, Transaction

        client = client_for(economat)
        creer_centre(client, type_paroisse, nom="Centre A", email="a@test.local")
        creer_centre(client, type_paroisse, nom="Centre B", email="b@test.local")
        centre_a = Centre.objects.get(nom="Centre A")
        centre_b = Centre.objects.get(nom="Centre B")
        categorie = Category.objects.create(nom="Dons", nature=Nature.REVENU)
        Transaction.objects.create(
            centre=centre_b, type_operation="REVENU", montant="10.00",
            date_operation="2026-07-15", category=categorie,
            saisi_par=centre_b.econome_principal,
        )

        response = client.delete(f"/api/centres/{centre_a.pk}/")

        assert response.status_code == 204
        assert Centre.objects.filter(pk=centre_b.pk).exists()
        assert Transaction.objects.filter(centre_id=centre_b.pk).count() == 1
        assert User.objects.filter(email="b@test.local").exists()

    def test_impossible_de_supprimer_un_type_centre_utilise(
        self, economat, type_paroisse, client_for
    ):
        creer_centre(client_for(economat), type_paroisse)
        response = client_for(economat).delete(f"/api/types-centres/{type_paroisse.pk}/")
        assert response.status_code == 400
        assert response.data["code"] == "protected"


class TestFiltresCentres:
    def test_filtre_par_type(self, economat, type_paroisse, client_for):
        ecole = TypeCentre.objects.create(code="ecole", libelle="École")
        client = client_for(economat)
        creer_centre(client, type_paroisse, nom="Paroisse A", email="a@test.local")
        creer_centre(client, ecole, nom="École B", email="b@test.local")
        response = client.get(f"/api/centres/?type_centre={type_paroisse.pk}")
        noms = {c["nom"] for c in response.data["results"]}
        assert noms == {"Paroisse A"}

    def test_filtre_par_statut(self, economat, type_paroisse, client_for):
        client = client_for(economat)
        creer_centre(client, type_paroisse, nom="Actif", email="actif@test.local")
        creer_centre(client, type_paroisse, nom="Inactif", email="inactif@test.local")
        centre_inactif = Centre.objects.get(nom="Inactif")
        client.patch(f"/api/centres/{centre_inactif.pk}/", {"is_active": False})

        response = client.get("/api/centres/?is_active=false")
        assert {c["nom"] for c in response.data["results"]} == {"Inactif"}

        response = client.get("/api/centres/?is_active=true")
        assert {c["nom"] for c in response.data["results"]} == {"Actif"}

    def test_recherche_par_nom(self, economat, type_paroisse, client_for):
        client = client_for(economat)
        creer_centre(client, type_paroisse, nom="Paroisse Saint-Marc", email="a@test.local")
        creer_centre(client, type_paroisse, nom="École Sainte-Anne", email="b@test.local")
        response = client.get("/api/centres/?q=marc")
        noms = {c["nom"] for c in response.data["results"]}
        assert noms == {"Paroisse Saint-Marc"}


class TestStatsCentre:
    def test_stats_inclut_nb_transactions_et_nb_membres(
        self, economat, type_paroisse, client_for
    ):
        from apps.finances.models import Category, Nature, Transaction

        client = client_for(economat)
        creer_centre(client, type_paroisse)
        centre = Centre.objects.get(nom="Paroisse Saint-Marc")
        categorie = Category.objects.create(nom="Dons", nature=Nature.REVENU)
        Transaction.objects.create(
            centre=centre, type_operation="REVENU", montant="10.00",
            date_operation="2026-07-15", category=categorie,
            saisi_par=centre.econome_principal,
        )

        response = client.get(f"/api/centres/{centre.pk}/stats/")

        assert response.status_code == 200
        assert response.data["nb_transactions"] == 1
        assert response.data["nb_membres"] == 1

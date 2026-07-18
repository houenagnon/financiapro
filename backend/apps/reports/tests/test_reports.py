import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.centres.models import Centre, TypeCentre
from apps.finances.models import Category, Nature, Transaction


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
def donnees(db):
    """Deux centres de types différents avec des transactions connues."""
    paroisse = TypeCentre.objects.create(code="paroisse", libelle="Paroisse")
    ecole = TypeCentre.objects.create(code="ecole", libelle="École")
    don = Category.objects.create(nom="Dons", nature=Nature.REVENU)
    fonctionnement = Category.objects.create(nom="Fonctionnement", nature=Nature.DEPENSE)

    centres = {}
    for nom, type_centre, suffixe in (
        ("Paroisse A", paroisse, "a"),
        ("École B", ecole, "b"),
    ):
        econome = User.objects.create_user(
            f"eco-{suffixe}@test.local",
            "Passw0rd!Test",
            first_name="Éco",
            last_name=suffixe.upper(),
            role=User.Role.ECONOME_PRINCIPAL,
        )
        centre = Centre.objects.create(
            nom=nom, type_centre=type_centre, econome_principal=econome
        )
        econome.centre = centre
        econome.save(update_fields=["centre"])
        centres[suffixe] = centre

    # Centre A : 1000 de revenus, 300 de dépenses → solde 700
    Transaction.objects.create(
        centre=centres["a"], type_operation="REVENU", montant="1000.00",
        date_operation="2026-07-10", category=don,
        saisi_par=centres["a"].econome_principal,
    )
    Transaction.objects.create(
        centre=centres["a"], type_operation="DEPENSE", montant="300.00",
        date_operation="2026-07-11", category=fonctionnement,
        saisi_par=centres["a"].econome_principal,
    )
    # Centre B : 500 de revenus → solde 500
    Transaction.objects.create(
        centre=centres["b"], type_operation="REVENU", montant="500.00",
        date_operation="2026-07-12", category=don,
        saisi_par=centres["b"].econome_principal,
    )
    return centres


@pytest.fixture
def client_for():
    def _client(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _client


class TestConsolide:
    def test_totaux_globaux(self, economat, donnees, client_for):
        response = client_for(economat).get("/api/rapports/consolide/")
        assert response.status_code == 200
        assert response.data["global"] == {
            "revenus": "1500.00",
            "depenses": "300.00",
            "solde": "1200.00",
        }
        types = {t["type_centre"]: t for t in response.data["par_type_centre"]}
        assert types["Paroisse"]["solde"] == "700.00"
        assert types["École"]["solde"] == "500.00"

    def test_filtre_periode(self, economat, donnees, client_for):
        response = client_for(economat).get(
            "/api/rapports/consolide/?date_debut=2026-07-12"
        )
        assert response.data["global"]["revenus"] == "500.00"

    def test_interdit_aux_economes(self, donnees, client_for):
        econome = donnees["a"].econome_principal
        assert client_for(econome).get("/api/rapports/consolide/").status_code == 403


class TestComparaisonCentres:
    def test_classement_par_solde(self, economat, donnees, client_for):
        response = client_for(economat).get("/api/rapports/comparaison-centres/")
        assert [c["centre"] for c in response.data] == ["Paroisse A", "École B"]
        assert response.data[0]["solde"] == "700.00"


class TestCentreDashboard:
    def test_dashboard_du_centre(self, donnees, client_for):
        econome = donnees["a"].econome_principal
        response = client_for(econome).get("/api/centre/dashboard/")
        assert response.status_code == 200
        assert response.data["totaux"]["solde"] == "700.00"
        assert response.data["statut_jour"] == "NON_DECLARE"
        assert len(response.data["dernieres_operations"]) == 2

    def test_interdit_a_l_economat(self, economat, donnees, client_for):
        assert client_for(economat).get("/api/centre/dashboard/").status_code == 403

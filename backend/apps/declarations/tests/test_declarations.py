import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.centres.models import Centre, TypeCentre
from apps.declarations.models import DeclarationJournaliere
from apps.finances.models import Category, Nature, Transaction


@pytest.fixture
def centre(db):
    type_centre = TypeCentre.objects.create(code="paroisse", libelle="Paroisse")
    econome = User.objects.create_user(
        "eco@test.local",
        "Passw0rd!Test",
        first_name="Jean",
        last_name="Économe",
        role=User.Role.ECONOME_PRINCIPAL,
    )
    centre = Centre.objects.create(
        nom="Centre Test", type_centre=type_centre, econome_principal=econome
    )
    econome.centre = centre
    econome.save(update_fields=["centre"])
    return centre


@pytest.fixture
def categorie_don(db):
    return Category.objects.create(nom="Dons", nature=Nature.REVENU)


@pytest.fixture
def client_econome(centre):
    client = APIClient()
    client.force_authenticate(centre.econome_principal)
    return client


class TestSignalTransaction:
    def test_transaction_marque_le_jour_declare(self, centre, categorie_don):
        Transaction.objects.create(
            centre=centre,
            type_operation="REVENU",
            montant="100.00",
            date_operation="2026-07-15",
            category=categorie_don,
            saisi_par=centre.econome_principal,
        )
        declaration = DeclarationJournaliere.objects.get(centre=centre, date="2026-07-15")
        assert declaration.statut == DeclarationJournaliere.Statut.DECLARE_AVEC_MOUVEMENT

    def test_transaction_ecrase_declaration_sans_mouvement(self, centre, categorie_don):
        DeclarationJournaliere.objects.create(
            centre=centre,
            date="2026-07-15",
            statut=DeclarationJournaliere.Statut.DECLARE_SANS_MOUVEMENT,
            declare_par=centre.econome_principal,
        )
        Transaction.objects.create(
            centre=centre,
            type_operation="REVENU",
            montant="100.00",
            date_operation="2026-07-15",
            category=categorie_don,
            saisi_par=centre.econome_principal,
        )
        declaration = DeclarationJournaliere.objects.get(centre=centre, date="2026-07-15")
        assert declaration.statut == DeclarationJournaliere.Statut.DECLARE_AVEC_MOUVEMENT


class TestAucuneOperation:
    def test_declaration_jour_vide(self, client_econome, centre):
        response = client_econome.post(
            "/api/declarations/aucune-operation/", {"date": "2026-07-15"}
        )
        assert response.status_code == 201
        assert response.data["statut"] == "DECLARE_SANS_MOUVEMENT"

    def test_refus_si_transactions_existantes(
        self, client_econome, centre, categorie_don
    ):
        Transaction.objects.create(
            centre=centre,
            type_operation="REVENU",
            montant="100.00",
            date_operation="2026-07-15",
            category=categorie_don,
            saisi_par=centre.econome_principal,
        )
        response = client_econome.post(
            "/api/declarations/aucune-operation/", {"date": "2026-07-15"}
        )
        assert response.status_code == 400
        assert response.data["code"] == "transactions_existantes"

    def test_refus_date_future(self, client_econome):
        response = client_econome.post(
            "/api/declarations/aucune-operation/", {"date": "2100-01-01"}
        )
        assert response.status_code == 400
        assert response.data["code"] == "date_future"


class TestStatutJour:
    def test_jour_non_declare(self, client_econome):
        response = client_econome.get("/api/declarations/statut-jour/?date=2026-07-14")
        assert response.status_code == 200
        assert response.data["statut"] == "NON_DECLARE"

    def test_jour_declare(self, client_econome, centre, categorie_don):
        Transaction.objects.create(
            centre=centre,
            type_operation="REVENU",
            montant="100.00",
            date_operation="2026-07-15",
            category=categorie_don,
            saisi_par=centre.econome_principal,
        )
        response = client_econome.get("/api/declarations/statut-jour/?date=2026-07-15")
        assert response.data["statut"] == "DECLARE_AVEC_MOUVEMENT"

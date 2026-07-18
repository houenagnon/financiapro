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
def deux_centres(db, economat):
    type_centre = TypeCentre.objects.create(code="paroisse", libelle="Paroisse")
    centres = []
    for suffixe in ("a", "b"):
        econome = User.objects.create_user(
            f"eco-{suffixe}@test.local",
            "Passw0rd!Test",
            first_name="Éco",
            last_name=suffixe.upper(),
            role=User.Role.ECONOME_PRINCIPAL,
        )
        centre = Centre.objects.create(
            nom=f"Centre {suffixe.upper()}",
            type_centre=type_centre,
            econome_principal=econome,
        )
        econome.centre = centre
        econome.save(update_fields=["centre"])
        centres.append(centre)
    return centres


@pytest.fixture
def categories(db):
    don = Category.objects.create(nom="Dons", nature=Nature.REVENU)
    fonctionnement = Category.objects.create(nom="Fonctionnement", nature=Nature.DEPENSE)
    transport = Category.objects.create(
        nom="Transport", nature=Nature.DEPENSE, parent=fonctionnement
    )
    return {"don": don, "fonctionnement": fonctionnement, "transport": transport}


@pytest.fixture
def client_for():
    def _client(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _client


class TestCategories:
    def test_sous_categorie_nature_incoherente_rejetee(self, economat, categories, client_for):
        response = client_for(economat).post(
            "/api/categories/",
            {"nom": "Quêtes", "nature": "REVENU", "parent": categories["fonctionnement"].pk},
        )
        assert response.status_code == 400

    def test_categorie_econome_rattachee_a_son_centre_pas_au_global(
        self, deux_centres, categories, client_for
    ):
        econome = deux_centres[0].econome_principal
        response = client_for(econome).post(
            "/api/categories/", {"nom": "Perso", "nature": "REVENU"}
        )
        assert response.status_code == 201
        assert Category.objects.get(nom="Perso").centre == deux_centres[0]

    def test_tree_regroupe_les_sous_categories(self, economat, categories, client_for):
        response = client_for(economat).get("/api/categories/tree/")
        assert response.status_code == 200
        fonctionnement = next(
            c for c in response.data if c["nom"] == "Fonctionnement"
        )
        assert [sc["nom"] for sc in fonctionnement["sous_categories"]] == ["Transport"]


class TestTransactions:
    def test_creation_scopee_au_centre_de_l_utilisateur(
        self, deux_centres, categories, client_for
    ):
        econome_a = deux_centres[0].econome_principal
        response = client_for(econome_a).post(
            "/api/transactions/",
            {
                "type_operation": "REVENU",
                "montant": "1500.50",
                "date_operation": "2026-07-15",
                "category": categories["don"].pk,
                # tentative d'écrire dans le centre B : doit être ignorée
                "centre": deux_centres[1].pk,
            },
        )
        assert response.status_code == 201
        transaction = Transaction.objects.get()
        assert transaction.centre == deux_centres[0]
        assert transaction.saisi_par == econome_a
        assert str(transaction.montant) == "1500.50"

    def test_categorie_incoherente_avec_type_rejetee(
        self, deux_centres, categories, client_for
    ):
        econome = deux_centres[0].econome_principal
        response = client_for(econome).post(
            "/api/transactions/",
            {
                "type_operation": "DEPENSE",
                "montant": "100.00",
                "date_operation": "2026-07-15",
                "category": categories["don"].pk,
            },
        )
        assert response.status_code == 400

    def test_isolation_lecture_entre_centres(self, deux_centres, categories, client_for):
        centre_a, centre_b = deux_centres
        Transaction.objects.create(
            centre=centre_a,
            type_operation="REVENU",
            montant="100.00",
            date_operation="2026-07-15",
            category=categories["don"],
            saisi_par=centre_a.econome_principal,
        )
        response = client_for(centre_b.econome_principal).get("/api/transactions/")
        assert response.data["count"] == 0

    def test_economat_voit_tout(self, economat, deux_centres, categories, client_for):
        for centre in deux_centres:
            Transaction.objects.create(
                centre=centre,
                type_operation="REVENU",
                montant="100.00",
                date_operation="2026-07-15",
                category=categories["don"],
                saisi_par=centre.econome_principal,
            )
        response = client_for(economat).get("/api/transactions/")
        assert response.data["count"] == 2

    def test_economat_ne_peut_pas_saisir(self, economat, categories, client_for):
        response = client_for(economat).post(
            "/api/transactions/",
            {
                "type_operation": "REVENU",
                "montant": "100.00",
                "date_operation": "2026-07-15",
                "category": categories["don"].pk,
            },
        )
        assert response.status_code == 403

    def test_filtre_par_periode(self, deux_centres, categories, client_for):
        centre = deux_centres[0]
        for jour in ("2026-07-01", "2026-07-10", "2026-07-20"):
            Transaction.objects.create(
                centre=centre,
                type_operation="REVENU",
                montant="50.00",
                date_operation=jour,
                category=categories["don"],
                saisi_par=centre.econome_principal,
            )
        response = client_for(centre.econome_principal).get(
            "/api/transactions/?date_debut=2026-07-05&date_fin=2026-07-15"
        )
        assert response.data["count"] == 1


class TestCategoriesParCentre:
    def test_econome_cree_une_categorie_pour_son_centre(
        self, deux_centres, client_for
    ):
        econome = deux_centres[0].econome_principal
        response = client_for(econome).post(
            "/api/categories/", {"nom": "Kermesse", "nature": "REVENU"}
        )
        assert response.status_code == 201
        categorie = Category.objects.get(nom="Kermesse")
        assert categorie.centre == deux_centres[0]

    def test_categorie_de_centre_invisible_pour_autre_centre(
        self, deux_centres, client_for
    ):
        centre_a, centre_b = deux_centres
        Category.objects.create(
            nom="Kermesse", nature=Nature.REVENU, centre=centre_a
        )
        response = client_for(centre_b.econome_principal).get("/api/categories/")
        noms = {c["nom"] for c in response.data["results"]}
        assert "Kermesse" not in noms

    def test_categorie_de_centre_inutilisable_par_autre_centre(
        self, deux_centres, client_for
    ):
        centre_a, centre_b = deux_centres
        categorie = Category.objects.create(
            nom="Kermesse", nature=Nature.REVENU, centre=centre_a
        )
        response = client_for(centre_b.econome_principal).post(
            "/api/transactions/",
            {
                "type_operation": "REVENU",
                "montant": "100.00",
                "date_operation": "2026-07-15",
                "category": categorie.pk,
            },
        )
        assert response.status_code == 400

    def test_pas_de_sous_categorie_pour_un_centre(
        self, deux_centres, categories, client_for
    ):
        econome = deux_centres[0].econome_principal
        response = client_for(econome).post(
            "/api/categories/",
            {"nom": "Sous", "nature": "REVENU", "parent": categories["don"].pk},
        )
        assert response.status_code == 400

    def test_centre_ne_modifie_pas_le_catalogue_global(
        self, deux_centres, categories, client_for
    ):
        econome = deux_centres[0].econome_principal
        response = client_for(econome).patch(
            f"/api/categories/{categories['don'].pk}/", {"nom": "Piraté"}
        )
        assert response.status_code == 403

    def test_economat_cree_toujours_en_global(self, economat, client_for):
        response = client_for(economat).post(
            "/api/categories/", {"nom": "Global", "nature": "REVENU"}
        )
        assert response.status_code == 201
        assert Category.objects.get(nom="Global").centre is None

    def test_tree_inclut_les_categories_du_centre(self, deux_centres, categories, client_for):
        centre_a = deux_centres[0]
        Category.objects.create(nom="Kermesse", nature=Nature.REVENU, centre=centre_a)
        response = client_for(centre_a.econome_principal).get("/api/categories/tree/")
        noms = {c["nom"] for c in response.data}
        assert "Kermesse" in noms and "Dons" in noms

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.centres.models import Centre, TypeCentre
from apps.placements import services
from apps.placements.models import (
    MouvementTresorerie,
    NiveauRisque,
    Portefeuille,
    StatutPlacement,
    TypeMouvement,
    TypePlacement,
    ValorisationPlacement,
)


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
def centre(db, economat):
    type_centre = TypeCentre.objects.create(code="paroisse", libelle="Paroisse")
    econome = User.objects.create_user(
        "eco@test.local",
        "Passw0rd!Test",
        first_name="Éco",
        last_name="A",
        role=User.Role.ECONOME_PRINCIPAL,
    )
    centre = Centre.objects.create(
        nom="Centre A", type_centre=type_centre, econome_principal=econome
    )
    econome.centre = centre
    econome.save(update_fields=["centre"])
    return centre


@pytest.fixture
def type_placement(db):
    return TypePlacement.objects.create(code="dat", libelle="Dépôt à terme")


@pytest.fixture
def portefeuille(db, economat):
    return Portefeuille.objects.create(nom="Réserves", cree_par=economat)


@pytest.fixture
def client_for():
    def _client(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _client


def alimenter_caisse(centre, economat, montant="10000.00"):
    return services.virement_centre_tresorerie(
        centre=centre,
        sens="ENTRANT",
        montant=Decimal(montant),
        date_mouvement="2026-08-01",
        user=economat,
    )


class TestVirementTresorerie:
    def test_virement_entrant_cree_transaction_et_mouvement(self, economat, centre):
        mouvement = alimenter_caisse(centre, economat, "1000.00")
        assert mouvement.type_mouvement == TypeMouvement.VIREMENT_ENTRANT
        assert mouvement.transaction_liee is not None
        assert mouvement.transaction_liee.type_operation == "DEPENSE"
        assert mouvement.transaction_liee.centre == centre
        assert services.solde_caisse() == Decimal("1000.00")

    def test_virement_sortant_refuse_si_solde_insuffisant(self, economat, centre):
        with pytest.raises(services.SoldeCaisseInsuffisant):
            services.virement_centre_tresorerie(
                centre=centre,
                sens="SORTANT",
                montant=Decimal("100.00"),
                date_mouvement="2026-08-01",
                user=economat,
            )
        assert services.solde_caisse() == Decimal("0")
        assert MouvementTresorerie.objects.count() == 0

    def test_virement_sortant_cree_revenu_et_credite_le_centre(self, economat, centre):
        alimenter_caisse(centre, economat, "500.00")
        mouvement = services.virement_centre_tresorerie(
            centre=centre,
            sens="SORTANT",
            montant=Decimal("200.00"),
            date_mouvement="2026-08-02",
            user=economat,
        )
        assert mouvement.transaction_liee.type_operation == "REVENU"
        assert services.solde_caisse() == Decimal("300.00")

    def test_endpoint_virement_reserve_a_economat(self, centre, client_for):
        response = client_for(centre.econome_principal).post(
            "/api/tresorerie/virements/",
            {
                "centre": centre.pk,
                "sens": "ENTRANT",
                "montant": "100.00",
                "date_mouvement": "2026-08-01",
            },
        )
        assert response.status_code == 403

    def test_endpoint_virement_ok(self, economat, centre, client_for):
        response = client_for(economat).post(
            "/api/tresorerie/virements/",
            {
                "centre": centre.pk,
                "sens": "ENTRANT",
                "montant": "100.00",
                "date_mouvement": "2026-08-01",
            },
        )
        assert response.status_code == 201
        assert MouvementTresorerie.objects.count() == 1

    def test_endpoint_solde_caisse(self, economat, centre, client_for):
        alimenter_caisse(centre, economat, "750.00")
        response = client_for(economat).get("/api/tresorerie/solde/")
        assert response.status_code == 200
        assert response.data["solde"] == "750.00"


class TestAchatEtCloture:
    def test_achat_refuse_si_solde_insuffisant(self, economat, portefeuille, type_placement):
        with pytest.raises(services.SoldeCaisseInsuffisant):
            services.acheter_placement(
                portefeuille=portefeuille,
                type_placement=type_placement,
                nom="Bon du Trésor",
                niveau_risque=NiveauRisque.FAIBLE,
                montant_investi=Decimal("5000.00"),
                date_acquisition="2026-08-01",
                user=economat,
            )

    def test_achat_debite_la_caisse(self, economat, centre, portefeuille, type_placement):
        alimenter_caisse(centre, economat)
        placement = services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="Bon du Trésor",
            niveau_risque=NiveauRisque.FAIBLE,
            montant_investi=Decimal("5000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        assert services.solde_caisse() == Decimal("5000.00")
        assert placement.valeur_actuelle == Decimal("5000.00")
        assert placement.gain_perte == Decimal("0")

    def test_cloture_credite_la_caisse_et_fige_le_gain(
        self, economat, centre, portefeuille, type_placement
    ):
        alimenter_caisse(centre, economat)
        placement = services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="Bon du Trésor",
            niveau_risque=NiveauRisque.FAIBLE,
            montant_investi=Decimal("5000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        services.cloturer_placement(
            placement=placement,
            montant_recupere=Decimal("5400.00"),
            date_cloture="2026-09-01",
            user=economat,
        )
        placement.refresh_from_db()
        assert placement.statut == StatutPlacement.CLOTURE
        assert placement.valeur_actuelle == Decimal("5400.00")
        assert placement.gain_perte == Decimal("400.00")
        # Caisse de départ (10000) - achat (5000) + rachat (5400) = 10400.
        assert services.solde_caisse() == Decimal("10400.00")

    def test_cloture_deux_fois_refusee(self, economat, centre, portefeuille, type_placement):
        alimenter_caisse(centre, economat)
        placement = services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="Bon du Trésor",
            niveau_risque=NiveauRisque.FAIBLE,
            montant_investi=Decimal("5000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        services.cloturer_placement(
            placement=placement,
            montant_recupere=Decimal("5400.00"),
            date_cloture="2026-09-01",
            user=economat,
        )
        with pytest.raises(ValueError):
            services.cloturer_placement(
                placement=placement,
                montant_recupere=Decimal("100.00"),
                date_cloture="2026-09-02",
                user=economat,
            )

    def test_endpoint_achat_reserve_a_economat(
        self, centre, portefeuille, type_placement, client_for
    ):
        response = client_for(centre.econome_principal).post(
            "/api/placements/",
            {
                "portefeuille_id": portefeuille.pk,
                "type_placement_id": type_placement.pk,
                "nom": "Bon du Trésor",
                "niveau_risque": "FAIBLE",
                "montant_investi": "1000.00",
                "date_acquisition": "2026-08-02",
            },
        )
        assert response.status_code == 403


class TestValorisation:
    def test_marquer_deux_fois_le_meme_jour_refuse(
        self, economat, centre, portefeuille, type_placement, client_for
    ):
        alimenter_caisse(centre, economat)
        placement = services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="Actions",
            niveau_risque=NiveauRisque.ELEVE,
            montant_investi=Decimal("2000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        client = client_for(economat)
        payload = {"date_valorisation": "2026-08-15", "valeur": "2100.00"}
        r1 = client.post(f"/api/placements/{placement.pk}/valoriser/", payload)
        assert r1.status_code == 201
        r2 = client.post(f"/api/placements/{placement.pk}/valoriser/", payload)
        assert r2.status_code == 400

    def test_valeur_actuelle_suit_la_derniere_valorisation(
        self, economat, centre, portefeuille, type_placement
    ):
        alimenter_caisse(centre, economat)
        placement = services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="Actions",
            niveau_risque=NiveauRisque.ELEVE,
            montant_investi=Decimal("2000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        ValorisationPlacement.objects.create(
            placement=placement,
            date_valorisation="2026-08-10",
            valeur=Decimal("2100.00"),
            saisi_par=economat,
        )
        ValorisationPlacement.objects.create(
            placement=placement,
            date_valorisation="2026-08-20",
            valeur=Decimal("1900.00"),
            saisi_par=economat,
        )
        placement.refresh_from_db()
        assert placement.valeur_actuelle == Decimal("1900.00")
        assert placement.gain_perte == Decimal("-100.00")
        assert placement.performance_pct == Decimal("-5.00")


class TestPerformancePortefeuille:
    def test_repartition_par_risque_et_type(
        self, economat, centre, portefeuille, type_placement
    ):
        autre_type = TypePlacement.objects.create(code="action", libelle="Action")
        alimenter_caisse(centre, economat)
        services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="DAT",
            niveau_risque=NiveauRisque.FAIBLE,
            montant_investi=Decimal("3000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        p2 = services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=autre_type,
            nom="Actions Cie",
            niveau_risque=NiveauRisque.ELEVE,
            montant_investi=Decimal("2000.00"),
            date_acquisition="2026-08-03",
            user=economat,
        )
        ValorisationPlacement.objects.create(
            placement=p2,
            date_valorisation="2026-08-10",
            valeur=Decimal("2500.00"),
            saisi_par=economat,
        )

        rapport = services.performance_portefeuille(portefeuille)
        assert rapport["total_investi"] == "5000.00"
        assert rapport["valeur_actuelle"] == "5500.00"
        assert rapport["gain_perte"] == "500.00"
        risques = {r["label"]: r for r in rapport["par_risque"]}
        assert risques["Faible"]["valeur"] == "3000.00"
        assert risques["Élevé"]["valeur"] == "2500.00"

    def test_endpoint_performance_portefeuille(
        self, economat, centre, portefeuille, type_placement, client_for
    ):
        alimenter_caisse(centre, economat)
        services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="DAT",
            niveau_risque=NiveauRisque.FAIBLE,
            montant_investi=Decimal("3000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        response = client_for(economat).get(
            f"/api/portefeuilles/{portefeuille.pk}/performance/"
        )
        assert response.status_code == 200
        assert response.data["total_investi"] == "3000.00"
        assert "serie_mensuelle" in response.data


class TestRapportConsolide:
    def test_dashboard_placements(
        self, economat, centre, portefeuille, type_placement, client_for
    ):
        alimenter_caisse(centre, economat)
        services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="DAT",
            niveau_risque=NiveauRisque.FAIBLE,
            montant_investi=Decimal("3000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        response = client_for(economat).get("/api/rapports/placements/")
        assert response.status_code == 200
        assert response.data["solde_caisse"] == "7000.00"
        assert len(response.data["portefeuilles"]) == 1

    def test_dashboard_reserve_a_economat(self, centre, client_for):
        response = client_for(centre.econome_principal).get("/api/rapports/placements/")
        assert response.status_code == 403


class TestSuppressionProtegee:
    def test_type_placement_utilise_non_supprimable(
        self, economat, centre, portefeuille, type_placement, client_for
    ):
        alimenter_caisse(centre, economat)
        services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="DAT",
            niveau_risque=NiveauRisque.FAIBLE,
            montant_investi=Decimal("1000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        response = client_for(economat).delete(f"/api/types-placements/{type_placement.pk}/")
        assert response.status_code == 400

    def test_portefeuille_utilise_non_supprimable(
        self, economat, centre, portefeuille, type_placement, client_for
    ):
        alimenter_caisse(centre, economat)
        services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=type_placement,
            nom="DAT",
            niveau_risque=NiveauRisque.FAIBLE,
            montant_investi=Decimal("1000.00"),
            date_acquisition="2026-08-02",
            user=economat,
        )
        response = client_for(economat).delete(f"/api/portefeuilles/{portefeuille.pk}/")
        assert response.status_code == 400

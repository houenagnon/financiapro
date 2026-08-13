"""Jeu de données de démonstration : python manage.py seed_demo

Idempotent : relançable sans dupliquer les données.
Comptes créés (mot de passe unique : Demo2026!) :
  - central@demo.financiapro   (Économat central)
  - econome.stmarc@demo.financiapro / econome.ecole@demo.financiapro
  - assistant.stmarc@demo.financiapro

Inclut aussi un portefeuille de placements (virements de trésorerie,
achats, historique de valorisations, une clôture) pour tester le module
Placements de bout en bout après déploiement.
"""
import datetime as dt
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.centres.models import Centre, TypeCentre
from apps.finances.models import Category, Nature, Transaction
from apps.placements import services as placements_services
from apps.placements.models import NiveauRisque, Portefeuille, TypePlacement, ValorisationPlacement

PASSWORD = "Demo2026!"


class Command(BaseCommand):
    help = "Crée un jeu de données de démonstration (idempotent)."

    def handle(self, *args, **options):
        random.seed(42)

        central, _ = self._user(
            "central@demo.financiapro", "Marie", "Centrale", User.Role.ECONOMAT_CENTRAL
        )

        paroisse, _ = TypeCentre.objects.get_or_create(
            code="paroisse", defaults={"libelle": "Paroisse"}
        )
        ecole, _ = TypeCentre.objects.get_or_create(
            code="ecole", defaults={"libelle": "École"}
        )

        categories = self._categories()

        st_marc = self._centre(
            "Paroisse Saint-Marc", paroisse, "econome.stmarc@demo.financiapro",
            "Jean", "Koudjo", central,
        )
        ecole_ste_anne = self._centre(
            "École Sainte-Anne", ecole, "econome.ecole@demo.financiapro",
            "Pauline", "Agossou", central,
        )

        assistant, created = self._user(
            "assistant.stmarc@demo.financiapro", "Luc", "Mensah", User.Role.ASSISTANT
        )
        if created:
            assistant.centre = st_marc
            assistant.created_by = st_marc.econome_principal
            assistant.save(update_fields=["centre", "created_by"])

        nb = self._transactions(st_marc, categories) + self._transactions(
            ecole_ste_anne, categories
        )

        nb_placements = self._placements(central, [st_marc, ecole_ste_anne])

        self.stdout.write(self.style.SUCCESS(
            f"Seed OK — {Centre.objects.count()} centres, "
            f"{User.objects.count()} utilisateurs, "
            f"{Transaction.objects.count()} transactions ({nb} nouvelles), "
            f"{nb_placements} placement(s) de démonstration. "
            f"Mot de passe démo : {PASSWORD}"
        ))

    def _user(self, email, first_name, last_name, role):
        user = User.objects.filter(email=email).first()
        if user:
            return user, False
        user = User.objects.create_user(
            email, PASSWORD, first_name=first_name, last_name=last_name, role=role
        )
        return user, True

    def _centre(self, nom, type_centre, email_econome, prenom, nom_famille, central):
        centre = Centre.objects.filter(nom=nom).first()
        if centre:
            return centre
        econome, _ = self._user(
            email_econome, prenom, nom_famille, User.Role.ECONOME_PRINCIPAL
        )
        econome.created_by = central
        centre = Centre.objects.create(
            nom=nom, type_centre=type_centre, econome_principal=econome
        )
        econome.centre = centre
        econome.save(update_fields=["centre", "created_by"])
        return centre

    def _categories(self):
        arbre = {
            Nature.REVENU: {
                "Dons et offrandes": ["Quêtes", "Dons exceptionnels"],
                "Cotisations": [],
            },
            Nature.DEPENSE: {
                "Fonctionnement": ["Transport", "Fournitures"],
                "Pastorale": [],
                "Œuvres sociales": [],
            },
        }
        categories = []
        for nature, racines in arbre.items():
            for nom_racine, sous in racines.items():
                racine, _ = Category.objects.get_or_create(
                    nom=nom_racine, nature=nature, parent=None
                )
                categories.append(racine)
                for nom_sous in sous:
                    sc, _ = Category.objects.get_or_create(
                        nom=nom_sous, nature=nature, parent=racine
                    )
                    categories.append(sc)
        return categories

    TIERS_DEMO = [
        "Famille Koudjo", "Boutique Saint-Joseph", "Fournitures Excel",
        "Ets Agossou", "Paroissien anonyme", "Garage Central",
        "Librairie Foi & Vie", "Traiteur Bénédiction",
    ]

    def _transactions(self, centre, categories):
        if centre.transactions.exists():
            return 0
        crees = 0
        aujourd_hui = timezone.localdate()
        for jours in range(30, 0, -1):
            date = aujourd_hui - dt.timedelta(days=jours)
            for _ in range(random.randint(0, 3)):
                category = random.choice(categories)
                montant = Decimal(random.randint(10, 500)) * 10
                Transaction.objects.create(
                    centre=centre,
                    type_operation=category.nature,
                    montant=montant,
                    date_operation=date,
                    category=category,
                    tiers=random.choice(self.TIERS_DEMO),
                    notes="Donnée de démonstration",
                    saisi_par=centre.econome_principal,
                )
                crees += 1
        return crees

    def _placements(self, central, centres):
        """Portefeuille de démonstration : virements des centres vers la
        trésorerie centrale, achats de placements variés (risque/type),
        historique de valorisations, et une clôture — de quoi tester
        rapports de performance et de risque sans rien saisir à la main."""
        if Portefeuille.objects.filter(nom="Réserves diocésaines").exists():
            return 0

        portefeuille = Portefeuille.objects.create(
            nom="Réserves diocésaines",
            description="Excédents de trésorerie placés par l'Économat central.",
            cree_par=central,
        )

        types = {}
        for code, libelle in [
            ("dat", "Dépôt à terme"),
            ("obligation", "Obligation d'État"),
            ("action", "Action cotée"),
            ("immobilier", "Immobilier locatif"),
        ]:
            types[code], _ = TypePlacement.objects.get_or_create(
                code=code, defaults={"libelle": libelle}
            )

        aujourd_hui = timezone.localdate()

        # Chaque centre transfère un excédent vers la trésorerie centrale.
        montants = [Decimal("800000"), Decimal("400000")]
        for centre, montant in zip(centres, montants, strict=True):
            placements_services.virement_centre_tresorerie(
                centre=centre,
                sens="ENTRANT",
                montant=montant,
                date_mouvement=aujourd_hui - dt.timedelta(days=75),
                user=central,
                notes="Excédent de trésorerie — donnée de démonstration.",
            )

        # Placements en cours, profils de risque variés, valorisés dans le temps.
        placements_demo = [
            {
                "type": types["dat"],
                "nom": "Dépôt à terme BOA 12 mois",
                "risque": NiveauRisque.FAIBLE,
                "montant": Decimal("500000"),
                "jours_acquisition": 70,
                "valorisations": [(50, Decimal("505000")), (20, Decimal("512000"))],
            },
            {
                "type": types["obligation"],
                "nom": "Obligation Trésor UEMOA",
                "risque": NiveauRisque.MODERE,
                "montant": Decimal("300000"),
                "jours_acquisition": 60,
                "valorisations": [(40, Decimal("306000")), (10, Decimal("298000"))],
            },
            {
                "type": types["action"],
                "nom": "Actions Bourse Régionale",
                "risque": NiveauRisque.ELEVE,
                "montant": Decimal("200000"),
                "jours_acquisition": 45,
                "valorisations": [(30, Decimal("215000")), (5, Decimal("189000"))],
            },
        ]

        for donnee in placements_demo:
            placement = placements_services.acheter_placement(
                portefeuille=portefeuille,
                type_placement=donnee["type"],
                nom=donnee["nom"],
                niveau_risque=donnee["risque"],
                montant_investi=donnee["montant"],
                date_acquisition=aujourd_hui - dt.timedelta(days=donnee["jours_acquisition"]),
                user=central,
                notes="Donnée de démonstration.",
            )
            for jours, valeur in donnee["valorisations"]:
                ValorisationPlacement.objects.create(
                    placement=placement,
                    date_valorisation=aujourd_hui - dt.timedelta(days=jours),
                    valeur=valeur,
                    saisi_par=central,
                )

        # Un placement déjà clôturé, pour illustrer un rachat dans les rapports.
        cloture = placements_services.acheter_placement(
            portefeuille=portefeuille,
            type_placement=types["dat"],
            nom="Dépôt à terme 6 mois (soldé)",
            niveau_risque=NiveauRisque.FAIBLE,
            montant_investi=Decimal("150000"),
            date_acquisition=aujourd_hui - dt.timedelta(days=90),
            user=central,
            notes="Donnée de démonstration.",
        )
        placements_services.cloturer_placement(
            placement=cloture,
            montant_recupere=Decimal("154500"),
            date_cloture=aujourd_hui - dt.timedelta(days=15),
            user=central,
        )

        return len(placements_demo) + 1

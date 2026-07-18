"""Jeu de données de démonstration : python manage.py seed_demo

Idempotent : relançable sans dupliquer les données.
Comptes créés (mot de passe unique : Demo2026!) :
  - central@demo.financiapro   (Économat central)
  - econome.stmarc@demo.financiapro / econome.ecole@demo.financiapro
  - assistant.stmarc@demo.financiapro
"""
import datetime as dt
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.centres.models import Centre, TypeCentre
from apps.finances.models import Category, Nature, Transaction

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

        self.stdout.write(self.style.SUCCESS(
            f"Seed OK — {Centre.objects.count()} centres, "
            f"{User.objects.count()} utilisateurs, "
            f"{Transaction.objects.count()} transactions ({nb} nouvelles). "
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
                    description="Donnée de démonstration",
                    saisi_par=centre.econome_principal,
                )
                crees += 1
        return crees

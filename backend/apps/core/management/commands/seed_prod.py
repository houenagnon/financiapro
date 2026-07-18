"""Données initiales de production : python manage.py seed_prod

Idempotent : relançable sans dupliquer. Crée uniquement la structure de
départ, aucune donnée fictive :
  - le catalogue des types de centre
  - le catalogue des catégories de revenus/dépenses (adapté ensuite par
    l'Économat central depuis l'interface)
  - le compte Économat central si demandé via --admin-email (mot de passe
    demandé interactivement, ou lu depuis SEED_ADMIN_PASSWORD)

Exemple (shell Render) :
  python manage.py seed_prod --admin-email econome.general@mondiocese.org
"""
import getpass
import os

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User
from apps.centres.models import TypeCentre
from apps.finances.models import Category, Nature

TYPES_CENTRE = [
    ("paroisse", "Paroisse"),
    ("communaute", "Communauté"),
    ("orphelinat", "Orphelinat"),
    ("ecole", "École"),
    ("oeuvre-sociale", "Œuvre sociale"),
]

CATEGORIES = {
    Nature.REVENU: {
        "Dons et offrandes": ["Quêtes", "Dons exceptionnels"],
        "Cotisations": [],
        "Contributions": [],
        "Autres revenus": [],
    },
    Nature.DEPENSE: {
        "Pastorale": [],
        "Fonctionnement": ["Fournitures", "Eau et électricité"],
        "Entretien": [],
        "Transport": [],
        "Activités de jeunesse": [],
        "Formation": [],
        "Œuvres sociales": [],
        "Autres dépenses": [],
    },
}


class Command(BaseCommand):
    help = "Initialise les catalogues de production (idempotent), sans données fictives."

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-email",
            help="Crée (s'il n'existe pas) le compte Économat central avec cet email. "
            "Mot de passe demandé interactivement, ou variable SEED_ADMIN_PASSWORD.",
        )

    def handle(self, *args, **options):
        types_crees = self._types_centre()
        categories_creees = self._categories()

        admin_cree = False
        if options["admin_email"]:
            admin_cree = self._admin(options["admin_email"])

        self.stdout.write(self.style.SUCCESS(
            f"Seed prod OK — {types_crees} type(s) de centre et "
            f"{categories_creees} catégorie(s) créés"
            + (", compte Économat central créé." if admin_cree else ".")
        ))

    def _types_centre(self):
        crees = 0
        for code, libelle in TYPES_CENTRE:
            _, created = TypeCentre.objects.get_or_create(
                code=code, defaults={"libelle": libelle}
            )
            crees += created
        return crees

    def _categories(self):
        crees = 0
        for nature, racines in CATEGORIES.items():
            for nom_racine, sous_categories in racines.items():
                racine, created = Category.objects.get_or_create(
                    nom=nom_racine, nature=nature, parent=None
                )
                crees += created
                for nom_sous in sous_categories:
                    _, created = Category.objects.get_or_create(
                        nom=nom_sous, nature=nature, parent=racine
                    )
                    crees += created
        return crees

    def _admin(self, email):
        if User.objects.filter(email=email).exists():
            self.stdout.write(f"Le compte {email} existe déjà — inchangé.")
            return False

        password = os.environ.get("SEED_ADMIN_PASSWORD")
        if not password:
            password = getpass.getpass(f"Mot de passe pour {email} : ")
            confirmation = getpass.getpass("Confirmation : ")
            if password != confirmation:
                raise CommandError("Les mots de passe ne correspondent pas.")

        try:
            validate_password(password)
        except ValidationError as exc:
            raise CommandError(
                "Mot de passe refusé : " + " ".join(exc.messages)
            ) from exc

        prenom = input("Prénom : ").strip() or "Économat"
        nom = input("Nom : ").strip() or "Central"
        User.objects.create_user(
            email,
            password,
            first_name=prenom,
            last_name=nom,
            role=User.Role.ECONOMAT_CENTRAL,
        )
        return True

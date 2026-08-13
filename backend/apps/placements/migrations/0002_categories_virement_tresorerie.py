# Crée les deux catégories globales utilisées par
# `services.virement_centre_tresorerie` pour tracer, côté centre, les
# virements avec la trésorerie centrale (Dépense à l'envoi, Revenu au
# retour). Catégories globales (centre=None) au même titre que les autres
# catégories du catalogue Économat central.
from django.db import migrations

NOM_CATEGORIE = "Virement trésorerie centrale"


def creer_categories(apps, schema_editor):
    Category = apps.get_model("finances", "Category")
    for nature in ("REVENU", "DEPENSE"):
        Category.objects.get_or_create(
            nom=NOM_CATEGORIE, nature=nature, parent=None, centre=None
        )


def supprimer_categories(apps, schema_editor):
    Category = apps.get_model("finances", "Category")
    Category.objects.filter(
        nom=NOM_CATEGORIE, parent=None, centre=None, transactions__isnull=True
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("placements", "0001_initial"),
        ("finances", "0005_alter_transaction_notes"),
    ]

    operations = [
        migrations.RunPython(creer_categories, supprimer_categories),
    ]

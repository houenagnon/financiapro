from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("finances", "0003_remove_category_unique_categorie_category_centre_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="transaction",
            old_name="description",
            new_name="notes",
        ),
        migrations.AddField(
            model_name="transaction",
            name="tiers",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Personne ou organisme concerné (qui a payé / qui a reçu).",
                max_length=200,
                verbose_name="tiers",
            ),
            preserve_default=False,
        ),
    ]

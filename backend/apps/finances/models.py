from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Nature(models.TextChoices):
    REVENU = "REVENU", "Revenu"
    DEPENSE = "DEPENSE", "Dépense"


class Category(models.Model):
    """Catégorie ou sous-catégorie de revenu/dépense.

    Deux niveaux de catalogue :
    - `centre` null : catalogue global géré par l'Économat central
      (peut avoir des sous-catégories) ;
    - `centre` renseigné : catégorie propre à un centre, créée librement
      par ses membres depuis la saisie (racine uniquement), visible et
      utilisable par ce centre seul.
    """

    nom = models.CharField("nom", max_length=150)
    nature = models.CharField("nature", max_length=10, choices=Nature.choices)
    parent = models.ForeignKey(
        "self",
        verbose_name="catégorie parente",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="sous_categories",
    )
    centre = models.ForeignKey(
        "centres.Centre",
        verbose_name="centre",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    is_active = models.BooleanField("actif", default=True)

    class Meta:
        verbose_name = "catégorie"
        ordering = ["nature", "nom"]
        constraints = [
            models.UniqueConstraint(
                fields=["nom", "nature", "parent", "centre"], name="unique_categorie"
            )
        ]

    def __str__(self):
        if self.parent:
            return f"{self.parent.nom} > {self.nom}"
        return self.nom

    def clean(self):
        if self.parent is not None:
            if self.parent.parent is not None:
                raise ValidationError(
                    "Un seul niveau de sous-catégorie est autorisé."
                )
            if self.parent.nature != self.nature:
                raise ValidationError(
                    "Une sous-catégorie doit avoir la même nature que sa catégorie parente."
                )


class Transaction(models.Model):
    """Mouvement financier (revenu ou dépense) d'un centre."""

    centre = models.ForeignKey(
        "centres.Centre",
        verbose_name="centre",
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    type_operation = models.CharField(
        "type d'opération", max_length=10, choices=Nature.choices
    )
    montant = models.DecimalField(
        "montant",
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    date_operation = models.DateField("date de l'opération", db_index=True)
    category = models.ForeignKey(
        Category,
        verbose_name="catégorie",
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    description = models.TextField("description", blank=True)
    saisi_par = models.ForeignKey(
        "accounts.User",
        verbose_name="saisi par",
        on_delete=models.PROTECT,
        related_name="transactions_saisies",
    )
    date_creation = models.DateTimeField("créé le", auto_now_add=True)
    date_modification = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "transaction"
        ordering = ["-date_operation", "-date_creation"]
        indexes = [models.Index(fields=["centre", "date_operation"])]

    def __str__(self):
        return (
            f"{self.get_type_operation_display()} {self.montant} — "
            f"{self.centre} ({self.date_operation})"
        )

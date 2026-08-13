from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

MONTANT_KWARGS = {
    "max_digits": 14,
    "decimal_places": 2,
    "validators": [MinValueValidator(Decimal("0.01"))],
}


class NiveauRisque(models.TextChoices):
    FAIBLE = "FAIBLE", "Faible"
    MODERE = "MODERE", "Modéré"
    ELEVE = "ELEVE", "Élevé"


class StatutPlacement(models.TextChoices):
    EN_COURS = "EN_COURS", "En cours"
    CLOTURE = "CLOTURE", "Clôturé"


class TypeMouvement(models.TextChoices):
    VIREMENT_ENTRANT = "VIREMENT_ENTRANT", "Virement entrant (depuis un centre)"
    VIREMENT_SORTANT = "VIREMENT_SORTANT", "Virement sortant (vers un centre)"
    ACHAT_PLACEMENT = "ACHAT_PLACEMENT", "Achat de placement"
    RACHAT_PLACEMENT = "RACHAT_PLACEMENT", "Rachat de placement"


class TypePlacement(models.Model):
    """Catalogue des types de placement (dépôt à terme, obligation, action,
    immobilier...), géré par l'Économat central."""

    code = models.SlugField("code", max_length=50, unique=True)
    libelle = models.CharField("libellé", max_length=150)
    is_active = models.BooleanField("actif", default=True)

    class Meta:
        verbose_name = "type de placement"
        verbose_name_plural = "types de placement"
        ordering = ["libelle"]

    def __str__(self):
        return self.libelle


class Portefeuille(models.Model):
    """Regroupement de placements, géré par l'Économat central."""

    nom = models.CharField("nom", max_length=200)
    description = models.TextField("description", blank=True)
    is_active = models.BooleanField("actif", default=True)
    cree_par = models.ForeignKey(
        "accounts.User",
        verbose_name="créé par",
        on_delete=models.PROTECT,
        related_name="portefeuilles_crees",
    )
    date_creation = models.DateTimeField("date de création", auto_now_add=True)

    class Meta:
        verbose_name = "portefeuille"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Placement(models.Model):
    """Un investissement au sein d'un portefeuille, financé par la
    trésorerie centrale (voir `MouvementTresorerie`)."""

    portefeuille = models.ForeignKey(
        Portefeuille,
        verbose_name="portefeuille",
        on_delete=models.PROTECT,
        related_name="placements",
    )
    type_placement = models.ForeignKey(
        TypePlacement,
        verbose_name="type de placement",
        on_delete=models.PROTECT,
        related_name="placements",
    )
    nom = models.CharField("nom", max_length=200)
    niveau_risque = models.CharField(
        "niveau de risque", max_length=10, choices=NiveauRisque.choices
    )
    montant_investi = models.DecimalField("montant investi", **MONTANT_KWARGS)
    date_acquisition = models.DateField("date d'acquisition")
    statut = models.CharField(
        "statut",
        max_length=10,
        choices=StatutPlacement.choices,
        default=StatutPlacement.EN_COURS,
    )
    date_cloture = models.DateField("date de clôture", null=True, blank=True)
    montant_recupere = models.DecimalField(
        "montant récupéré", max_digits=14, decimal_places=2, null=True, blank=True
    )
    notes = models.TextField("notes", blank=True)
    cree_par = models.ForeignKey(
        "accounts.User",
        verbose_name="créé par",
        on_delete=models.PROTECT,
        related_name="placements_crees",
    )
    date_creation = models.DateTimeField("créé le", auto_now_add=True)
    date_modification = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "placement"
        ordering = ["-date_acquisition"]

    def __str__(self):
        return f"{self.nom} ({self.portefeuille})"

    @property
    def derniere_valorisation(self):
        return self.valorisations.order_by("-date_valorisation", "-date_creation").first()

    @property
    def valeur_actuelle(self):
        """Valeur retenue pour les rapports : montant récupéré si clôturé,
        sinon dernière valorisation connue, sinon le montant investi
        (aucun marquage effectué depuis l'achat)."""
        if self.statut == StatutPlacement.CLOTURE:
            return self.montant_recupere if self.montant_recupere is not None else Decimal("0")
        derniere = self.derniere_valorisation
        return derniere.valeur if derniere else self.montant_investi

    @property
    def gain_perte(self):
        return self.valeur_actuelle - self.montant_investi

    @property
    def performance_pct(self):
        if self.montant_investi == 0:
            return Decimal("0")
        return (self.gain_perte / self.montant_investi) * Decimal("100")


class ValorisationPlacement(models.Model):
    """Historique des valorisations d'un placement ("marquage") : une ligne
    par mise à jour, jamais d'écrasement — c'est la matière première des
    courbes de performance."""

    placement = models.ForeignKey(
        Placement,
        verbose_name="placement",
        on_delete=models.PROTECT,
        related_name="valorisations",
    )
    date_valorisation = models.DateField("date de valorisation")
    valeur = models.DecimalField(
        "valeur",
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    notes = models.TextField("notes", blank=True)
    saisi_par = models.ForeignKey(
        "accounts.User",
        verbose_name="saisi par",
        on_delete=models.PROTECT,
        related_name="valorisations_saisies",
    )
    date_creation = models.DateTimeField("créé le", auto_now_add=True)

    class Meta:
        verbose_name = "valorisation de placement"
        ordering = ["-date_valorisation"]
        constraints = [
            models.UniqueConstraint(
                fields=["placement", "date_valorisation"],
                name="unique_valorisation_par_jour",
            )
        ]

    def __str__(self):
        return f"{self.placement} — {self.date_valorisation} : {self.valeur}"


class MouvementTresorerie(models.Model):
    """Journal de la caisse centrale de l'Économat : virements avec les
    centres, achats et rachats de placements. Le solde de la caisse est la
    somme des entrants (VIREMENT_ENTRANT, RACHAT_PLACEMENT) moins les
    sortants (VIREMENT_SORTANT, ACHAT_PLACEMENT)."""

    type_mouvement = models.CharField(
        "type de mouvement", max_length=20, choices=TypeMouvement.choices
    )
    montant = models.DecimalField("montant", **MONTANT_KWARGS)
    centre = models.ForeignKey(
        "centres.Centre",
        verbose_name="centre",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="mouvements_tresorerie",
        help_text="Renseigné uniquement pour les virements entrants/sortants.",
    )
    placement = models.ForeignKey(
        Placement,
        verbose_name="placement",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="mouvements_tresorerie",
        help_text="Renseigné uniquement pour les achats/rachats de placement.",
    )
    transaction_liee = models.OneToOneField(
        "finances.Transaction",
        verbose_name="transaction liée",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="mouvement_tresorerie",
        help_text="Transaction générée côté centre pour un virement.",
    )
    date_mouvement = models.DateField("date du mouvement")
    notes = models.TextField("notes", blank=True)
    saisi_par = models.ForeignKey(
        "accounts.User",
        verbose_name="saisi par",
        on_delete=models.PROTECT,
        related_name="mouvements_tresorerie_saisis",
    )
    date_creation = models.DateTimeField("créé le", auto_now_add=True)

    class Meta:
        verbose_name = "mouvement de trésorerie"
        ordering = ["-date_mouvement", "-date_creation"]

    def __str__(self):
        return f"{self.get_type_mouvement_display()} {self.montant} ({self.date_mouvement})"

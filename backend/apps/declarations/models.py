from django.db import models


class DeclarationJournaliere(models.Model):
    """Statut de déclaration d'un centre pour une journée donnée.

    Distingue « journée sans mouvement financier » (déclaré explicitement)
    d'« absence de déclaration ». Une ligne n'existe que lorsqu'une
    déclaration a eu lieu (transaction saisie ou déclaration explicite) :
    l'absence de ligne pour une date passée signifie NON_DECLARE.
    """

    class Statut(models.TextChoices):
        DECLARE_AVEC_MOUVEMENT = "DECLARE_AVEC_MOUVEMENT", "Déclaré avec mouvement"
        DECLARE_SANS_MOUVEMENT = "DECLARE_SANS_MOUVEMENT", "Déclaré sans mouvement"

    centre = models.ForeignKey(
        "centres.Centre",
        verbose_name="centre",
        on_delete=models.CASCADE,
        related_name="declarations",
    )
    date = models.DateField("date", db_index=True)
    statut = models.CharField("statut", max_length=30, choices=Statut.choices)
    declare_par = models.ForeignKey(
        "accounts.User",
        verbose_name="déclaré par",
        null=True,
        on_delete=models.SET_NULL,
        related_name="declarations",
    )
    date_declaration = models.DateTimeField("déclaré le", auto_now=True)

    class Meta:
        verbose_name = "déclaration journalière"
        verbose_name_plural = "déclarations journalières"
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["centre", "date"], name="unique_declaration_par_jour"
            )
        ]

    def __str__(self):
        return f"{self.centre} — {self.date} : {self.get_statut_display()}"

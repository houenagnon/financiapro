from django.db import models


class TypeCentre(models.Model):
    """Type de structure : paroisse, communauté, orphelinat, école, œuvre sociale...

    Catalogue géré par l'Économat central, extensible sans déploiement.
    """

    code = models.SlugField("code", max_length=50, unique=True)
    libelle = models.CharField("libellé", max_length=150)
    is_active = models.BooleanField("actif", default=True)

    class Meta:
        verbose_name = "type de centre"
        verbose_name_plural = "types de centre"
        ordering = ["libelle"]

    def __str__(self):
        return self.libelle


class Centre(models.Model):
    nom = models.CharField("nom", max_length=200)
    type_centre = models.ForeignKey(
        TypeCentre,
        verbose_name="type de centre",
        on_delete=models.PROTECT,
        related_name="centres",
    )
    econome_principal = models.OneToOneField(
        "accounts.User",
        verbose_name="économe principal",
        on_delete=models.PROTECT,
        related_name="centre_dirige",
    )
    description = models.TextField("description", blank=True)
    is_active = models.BooleanField("actif", default=True)
    date_creation = models.DateTimeField("date de création", auto_now_add=True)

    class Meta:
        verbose_name = "centre"
        ordering = ["nom"]

    def __str__(self):
        return self.nom

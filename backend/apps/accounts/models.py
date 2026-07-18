from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """Compte utilisateur. Login par email, pas d'inscription publique.

    Un utilisateur ECONOMAT_CENTRAL n'est rattaché à aucun centre
    (centre=None) ; Économes et Assistants sont rattachés à leur centre.
    """

    class Role(models.TextChoices):
        ECONOMAT_CENTRAL = "ECONOMAT_CENTRAL", "Économat central"
        ECONOME_PRINCIPAL = "ECONOME_PRINCIPAL", "Économe principal"
        ASSISTANT = "ASSISTANT", "Assistant"

    email = models.EmailField("adresse email", unique=True)
    first_name = models.CharField("prénom", max_length=150)
    last_name = models.CharField("nom", max_length=150)
    role = models.CharField("rôle", max_length=20, choices=Role.choices)
    centre = models.ForeignKey(
        "centres.Centre",
        verbose_name="centre",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="membres",
    )
    is_active = models.BooleanField("actif", default=True)
    is_staff = models.BooleanField("accès admin", default=False)
    created_by = models.ForeignKey(
        "self",
        verbose_name="créé par",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_users",
    )
    date_creation = models.DateTimeField("date de création", auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "utilisateur"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def is_economat_central(self):
        return self.role == self.Role.ECONOMAT_CENTRAL

    @property
    def is_econome_principal(self):
        return self.role == self.Role.ECONOME_PRINCIPAL

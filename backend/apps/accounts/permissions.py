from rest_framework.permissions import BasePermission

from .models import User


class IsEconomatCentral(BasePermission):
    """Réservé aux comptes de l'Économat central."""

    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated
            and request.user.role == User.Role.ECONOMAT_CENTRAL
        )


class CanManageUsers(BasePermission):
    """L'Économat central et les Économes principaux peuvent gérer des comptes.

    Le détail (qui peut créer quel rôle) est validé par UserCreateSerializer ;
    le périmètre visible est restreint par le queryset de la vue.
    """

    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated
            and request.user.role
            in (User.Role.ECONOMAT_CENTRAL, User.Role.ECONOME_PRINCIPAL)
        )

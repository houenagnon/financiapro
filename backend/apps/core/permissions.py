from rest_framework.permissions import BasePermission


class IsCentreMember(BasePermission):
    """Autorise les utilisateurs rattachés à un centre (Économe ou Assistant).

    L'attribut `centre` est ajouté au modèle User à l'étape B3 ; getattr
    protège les comptes Économat central (centre absent ou None).
    """

    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated
            and getattr(request.user, "centre_id", None) is not None
        )

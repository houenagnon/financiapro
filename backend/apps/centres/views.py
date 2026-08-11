from django.db import transaction as db_transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import IsEconomatCentral
from apps.core.mixins import ProtectedDeleteMixin

from .models import Centre, TypeCentre
from .serializers import (
    CentreCreateSerializer,
    CentreSerializer,
    CentreUpdateSerializer,
    TypeCentreSerializer,
)


class TypeCentreViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    queryset = TypeCentre.objects.all()
    serializer_class = TypeCentreSerializer
    permission_classes = [IsEconomatCentral]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    protected_delete_message = (
        "Impossible de supprimer : au moins un centre utilise ce type. "
        "Désactivez-le plutôt."
    )


class CentreViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    queryset = Centre.objects.select_related("type_centre", "econome_principal")
    permission_classes = [IsEconomatCentral]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    protected_delete_message = (
        "Impossible de supprimer : ce centre a des opérations enregistrées. "
        "Désactivez-le plutôt."
    )

    def get_serializer_class(self):
        if self.action == "create":
            return CentreCreateSerializer
        if self.action == "partial_update":
            return CentreUpdateSerializer
        return CentreSerializer

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Statistiques financières du centre — enrichies à l'étape B4 (transactions)."""
        centre = self.get_object()
        return Response(
            {
                "centre_id": centre.pk,
                "nb_membres": centre.membres.filter(is_active=True).count(),
            }
        )

    def destroy(self, request, *args, **kwargs):
        centre = self.get_object()
        if centre.transactions.exists() or centre.declarations.exists():
            return Response(
                {"detail": self.protected_delete_message, "code": "protected"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Un centre sans aucune opération n'a par définition aucun historique
        # à préserver : on peut alors le supprimer avec ses membres. Les deux
        # sens de référence sont protégés (Centre.econome_principal PROTECT
        # empêche de supprimer l'économe avant le centre ; User.centre
        # PROTECT empêche de supprimer le centre avant ses membres) : on
        # détache d'abord les membres, on supprime le centre, puis les
        # membres eux-mêmes.
        with db_transaction.atomic():
            membres = list(centre.membres.all())
            for membre in membres:
                membre.centre = None
                membre.save(update_fields=["centre"])
            centre.delete()
            User.objects.filter(pk__in=[m.pk for m in membres]).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

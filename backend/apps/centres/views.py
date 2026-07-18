from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsEconomatCentral

from .models import Centre, TypeCentre
from .serializers import (
    CentreCreateSerializer,
    CentreSerializer,
    CentreUpdateSerializer,
    TypeCentreSerializer,
)


class TypeCentreViewSet(viewsets.ModelViewSet):
    queryset = TypeCentre.objects.all()
    serializer_class = TypeCentreSerializer
    permission_classes = [IsEconomatCentral]
    http_method_names = ["get", "post", "patch", "head", "options"]


class CentreViewSet(viewsets.ModelViewSet):
    queryset = Centre.objects.select_related("type_centre", "econome_principal")
    permission_classes = [IsEconomatCentral]
    http_method_names = ["get", "post", "patch", "head", "options"]

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

from django.db import transaction as db_transaction
from django.db.models.deletion import ProtectedError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import IsEconomatCentral
from apps.core.mixins import ProtectedDeleteMixin

from .filters import CentreFilter
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


class CentreViewSet(viewsets.ModelViewSet):
    queryset = Centre.objects.select_related("type_centre", "econome_principal")
    permission_classes = [IsEconomatCentral]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = CentreFilter

    def get_serializer_class(self):
        if self.action == "create":
            return CentreCreateSerializer
        if self.action == "partial_update":
            return CentreUpdateSerializer
        return CentreSerializer

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Statistiques du centre — utilisées notamment pour afficher les
        conséquences avant une suppression définitive."""
        centre = self.get_object()
        return Response(
            {
                "centre_id": centre.pk,
                "nb_membres": centre.membres.filter(is_active=True).count(),
                "nb_transactions": centre.transactions.count(),
            }
        )

    def destroy(self, request, *args, **kwargs):
        """Suppression définitive et sans condition, à la demande explicite
        de l'Économat central : contrairement aux autres suppressions de
        l'application, celle-ci n'est jamais bloquée par des opérations ou
        des membres existants — elle les supprime avec le centre. Le
        frontend a la responsabilité d'avertir clairement des conséquences
        avant d'appeler cet endpoint (aucune confirmation ne peut plus être
        demandée une fois la suppression exécutée).
        """
        centre = self.get_object()
        try:
            with db_transaction.atomic():
                # Transaction.centre est PROTECT : rien ne cascade tout seul,
                # il faut les supprimer explicitement avant le centre.
                centre.transactions.all().delete()
                # Centre.econome_principal et User.centre se protègent
                # mutuellement (PROTECT croisé) : on détache d'abord les
                # membres, on supprime le centre (déclarations et catégories
                # propres au centre suivent par CASCADE), puis les membres
                # eux-mêmes.
                membres = list(centre.membres.all())
                for membre in membres:
                    membre.centre = None
                    membre.save(update_fields=["centre"])
                centre.delete()
                User.objects.filter(pk__in=[m.pk for m in membres]).delete()
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "Suppression impossible : une donnée imprévue "
                        "empêche l'opération."
                    ),
                    "code": "protected",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

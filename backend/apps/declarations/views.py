import django_filters
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.mixins import CentreScopedQuerysetMixin
from apps.core.permissions import IsCentreMember
from apps.finances.models import Transaction

from .models import DeclarationJournaliere
from .serializers import AucuneOperationSerializer, DeclarationSerializer


class DeclarationFilter(django_filters.FilterSet):
    date_debut = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_fin = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = DeclarationJournaliere
        fields = ["centre", "statut", "date_debut", "date_fin"]


class DeclarationViewSet(
    CentreScopedQuerysetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Historique des déclarations, scopé par centre.

    La création passe uniquement par la saisie de transactions (signal) ou
    par l'action explicite `aucune-operation`.
    """

    queryset = DeclarationJournaliere.objects.select_related("centre", "declare_par")
    serializer_class = DeclarationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = DeclarationFilter

    @action(
        detail=False,
        methods=["post"],
        url_path="aucune-operation",
        permission_classes=[IsCentreMember],
    )
    def aucune_operation(self, request):
        serializer = AucuneOperationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        date = serializer.validated_data.get("date") or timezone.localdate()
        centre = request.user.centre

        if date > timezone.localdate():
            return Response(
                {"detail": "Impossible de déclarer une date future.", "code": "date_future"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Transaction.objects.filter(centre=centre, date_operation=date).exists():
            return Response(
                {
                    "detail": "Des opérations existent déjà pour cette journée.",
                    "code": "transactions_existantes",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        declaration, _ = DeclarationJournaliere.objects.update_or_create(
            centre=centre,
            date=date,
            defaults={
                "statut": DeclarationJournaliere.Statut.DECLARE_SANS_MOUVEMENT,
                "declare_par": request.user,
            },
        )
        return Response(
            DeclarationSerializer(declaration).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["get"], url_path="statut-jour")
    def statut_jour(self, request):
        """Statut de la date demandée (défaut : aujourd'hui, heure serveur)."""
        date_param = request.query_params.get("date")
        if date_param:
            serializer = AucuneOperationSerializer(data={"date": date_param})
            serializer.is_valid(raise_exception=True)
            date = serializer.validated_data["date"]
        else:
            date = timezone.localdate()

        declaration = self.get_queryset().filter(date=date).first()
        if declaration is None:
            return Response({"date": date, "statut": "NON_DECLARE"})
        return Response(DeclarationSerializer(declaration).data)

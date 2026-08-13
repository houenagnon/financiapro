from decimal import Decimal

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsEconomatCentral
from apps.core.mixins import ProtectedDeleteMixin

from . import services
from .filters import MouvementTresorerieFilter, PlacementFilter
from .models import (
    MouvementTresorerie,
    Placement,
    Portefeuille,
    TypePlacement,
    ValorisationPlacement,
)
from .serializers import (
    ClotureSerializer,
    MouvementTresorerieSerializer,
    PlacementCreateSerializer,
    PlacementSerializer,
    PlacementUpdateSerializer,
    PortefeuilleSerializer,
    PortefeuilleWriteSerializer,
    TypePlacementSerializer,
    ValorisationPlacementSerializer,
    ValoriserSerializer,
    VirementSerializer,
)


class TypePlacementViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    queryset = TypePlacement.objects.all()
    serializer_class = TypePlacementSerializer
    permission_classes = [IsEconomatCentral]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    protected_delete_message = (
        "Impossible de supprimer : au moins un placement utilise ce type. "
        "Désactivez-le plutôt."
    )


class PortefeuilleViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    queryset = Portefeuille.objects.select_related("cree_par")
    permission_classes = [IsEconomatCentral]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    protected_delete_message = (
        "Impossible de supprimer : ce portefeuille contient des placements. "
        "Désactivez-le plutôt."
    )

    def get_serializer_class(self):
        if self.action in ("create", "partial_update"):
            return PortefeuilleWriteSerializer
        return PortefeuilleSerializer

    @action(detail=True, methods=["get"])
    def performance(self, request, pk=None):
        """Rapport de performance et de risque du portefeuille : totaux,
        répartitions, série mensuelle pour la courbe."""
        portefeuille = self.get_object()
        data = services.performance_portefeuille(portefeuille)
        data["serie_mensuelle"] = services.serie_valorisation_portefeuille(portefeuille)
        return Response(data)


class PlacementViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    queryset = Placement.objects.select_related(
        "portefeuille", "type_placement", "cree_par"
    ).prefetch_related("valorisations")
    permission_classes = [IsEconomatCentral]
    filter_backends = [DjangoFilterBackend]
    filterset_class = PlacementFilter
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    protected_delete_message = (
        "Impossible de supprimer : ce placement est lié à des mouvements de "
        "trésorerie (achat, valorisations...). Clôturez-le plutôt."
    )

    def get_serializer_class(self):
        if self.action == "create":
            return PlacementCreateSerializer
        if self.action == "partial_update":
            return PlacementUpdateSerializer
        return PlacementSerializer

    @action(detail=True, methods=["post"])
    def valoriser(self, request, pk=None):
        """"Marque" le placement : enregistre sa valeur à une date donnée."""
        placement = self.get_object()
        serializer = ValoriserSerializer(
            data=request.data, context={"placement": placement}
        )
        serializer.is_valid(raise_exception=True)
        valorisation = ValorisationPlacement.objects.create(
            placement=placement, saisi_par=request.user, **serializer.validated_data
        )
        return Response(
            ValorisationPlacementSerializer(valorisation).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def historique(self, request, pk=None):
        placement = self.get_object()
        return Response(
            ValorisationPlacementSerializer(
                placement.valorisations.all(), many=True
            ).data
        )

    @action(detail=True, methods=["post"])
    def cloturer(self, request, pk=None):
        """Rachat/vente du placement : crédite la trésorerie centrale."""
        placement = self.get_object()
        serializer = ClotureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            placement = services.cloturer_placement(
                placement=placement, user=request.user, **serializer.validated_data
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc), "code": "deja_cloture"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(PlacementSerializer(placement).data)


class MouvementTresorerieViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Journal (lecture seule) de la caisse centrale — les mouvements sont
    toujours créés par les actions dédiées (achat, rachat, virement),
    jamais directement."""

    queryset = MouvementTresorerie.objects.select_related(
        "centre", "placement", "saisi_par"
    )
    serializer_class = MouvementTresorerieSerializer
    permission_classes = [IsEconomatCentral]
    filter_backends = [DjangoFilterBackend]
    filterset_class = MouvementTresorerieFilter


class SoldeCaisseView(APIView):
    permission_classes = [IsEconomatCentral]

    def get(self, request):
        solde = services.solde_caisse().quantize(Decimal("0.01"))
        return Response({"solde": str(solde)})


class VirementView(APIView):
    """Crée un virement entre un centre et la trésorerie centrale : génère
    à la fois la Transaction du centre et le mouvement de caisse."""

    permission_classes = [IsEconomatCentral]

    def post(self, request):
        serializer = VirementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            mouvement = services.virement_centre_tresorerie(
                user=request.user, **serializer.validated_data
            )
        except services.SoldeCaisseInsuffisant as exc:
            return Response(
                {"detail": str(exc), "code": "solde_insuffisant"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            MouvementTresorerieSerializer(mouvement).data, status=status.HTTP_201_CREATED
        )

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.mixins import CentreScopedQuerysetMixin
from apps.core.permissions import IsCentreMember

from .filters import TransactionFilter
from .models import Category, Transaction
from .serializers import (
    CategorySerializer,
    CategoryTreeSerializer,
    TransactionSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    """Catalogue global (Économat central) + catégories propres à chaque centre.

    Un membre de centre voit le catalogue global et les catégories de son
    centre, et peut créer librement une catégorie (racine) pour son centre.
    La modification reste réservée au propriétaire du catalogue concerné.
    """

    queryset = Category.objects.select_related("parent")
    serializer_class = CategorySerializer
    http_method_names = ["get", "post", "patch", "head", "options"]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["nature", "parent", "is_active"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_economat_central:
            return queryset
        return queryset.filter(
            Q(centre__isnull=True) | Q(centre_id=user.centre_id)
        )

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return
        user = request.user
        # Écriture : l'Économat gère le catalogue global, un centre ses
        # propres catégories — jamais celles des autres.
        if obj.centre_id is None and not user.is_economat_central:
            self.permission_denied(
                request, message="Le catalogue global est géré par l'Économat central."
            )
        if obj.centre_id is not None and obj.centre_id != getattr(user, "centre_id", None):
            self.permission_denied(
                request, message="Cette catégorie appartient à un autre centre."
            )

    @action(detail=False, methods=["get"])
    def tree(self, request):
        racines = (
            self.get_queryset()
            .filter(parent__isnull=True, is_active=True)
            .prefetch_related("sous_categories")
            .order_by("nature", "nom")
        )
        return Response(CategoryTreeSerializer(racines, many=True).data)


class TransactionViewSet(CentreScopedQuerysetMixin, viewsets.ModelViewSet):
    """Mouvements financiers, strictement scopés au centre de l'utilisateur.

    L'Économat central a accès en lecture à tout (supervision) ; la saisie
    est réservée aux membres d'un centre.
    """

    queryset = Transaction.objects.select_related(
        "category", "category__parent", "saisi_par", "centre"
    )
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TransactionFilter

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsCentreMember()]

    def perform_create(self, serializer):
        serializer.save(
            centre=self.request.user.centre, saisi_par=self.request.user
        )

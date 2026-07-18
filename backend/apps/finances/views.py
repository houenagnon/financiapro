from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsEconomatCentral
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
    """Catalogue global : lecture pour tous les connectés, écriture Économat central."""

    queryset = Category.objects.select_related("parent")
    serializer_class = CategorySerializer
    http_method_names = ["get", "post", "patch", "head", "options"]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["nature", "parent", "is_active"]

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsEconomatCentral()]

    @action(detail=False, methods=["get"])
    def tree(self, request):
        racines = (
            Category.objects.filter(parent__isnull=True, is_active=True)
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

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    MouvementTresorerieViewSet,
    PlacementViewSet,
    PortefeuilleViewSet,
    SoldeCaisseView,
    TypePlacementViewSet,
    VirementView,
)

router = DefaultRouter()
router.register("types-placements", TypePlacementViewSet, basename="type-placement")
router.register("portefeuilles", PortefeuilleViewSet, basename="portefeuille")
router.register("placements", PlacementViewSet, basename="placement")
router.register(
    "tresorerie/mouvements", MouvementTresorerieViewSet, basename="mouvement-tresorerie"
)

urlpatterns = router.urls + [
    path("tresorerie/solde/", SoldeCaisseView.as_view(), name="tresorerie-solde"),
    path("tresorerie/virements/", VirementView.as_view(), name="tresorerie-virement"),
]

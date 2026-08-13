from django.urls import path

from .views import (
    CentreDashboardView,
    ComparaisonCentresView,
    ConsolideView,
    RapportPlacementsView,
    RegistreView,
)

urlpatterns = [
    path("rapports/consolide/", ConsolideView.as_view(), name="rapport-consolide"),
    path(
        "rapports/comparaison-centres/",
        ComparaisonCentresView.as_view(),
        name="rapport-comparaison-centres",
    ),
    path(
        "rapports/placements/",
        RapportPlacementsView.as_view(),
        name="rapport-placements",
    ),
    path("centre/dashboard/", CentreDashboardView.as_view(), name="centre-dashboard"),
    path("centre/registre/", RegistreView.as_view(), name="centre-registre"),
]

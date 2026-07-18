from django.urls import path

from .views import CentreDashboardView, ComparaisonCentresView, ConsolideView

urlpatterns = [
    path("rapports/consolide/", ConsolideView.as_view(), name="rapport-consolide"),
    path(
        "rapports/comparaison-centres/",
        ComparaisonCentresView.as_view(),
        name="rapport-comparaison-centres",
    ),
    path("centre/dashboard/", CentreDashboardView.as_view(), name="centre-dashboard"),
]

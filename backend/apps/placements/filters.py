import django_filters

from .models import MouvementTresorerie, Placement


class PlacementFilter(django_filters.FilterSet):
    class Meta:
        model = Placement
        fields = ["portefeuille", "type_placement", "statut", "niveau_risque"]


class MouvementTresorerieFilter(django_filters.FilterSet):
    class Meta:
        model = MouvementTresorerie
        fields = ["type_mouvement", "centre", "placement"]

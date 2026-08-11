import django_filters

from .models import Transaction


class TransactionFilter(django_filters.FilterSet):
    date_debut = django_filters.DateFilter(field_name="date_operation", lookup_expr="gte")
    date_fin = django_filters.DateFilter(field_name="date_operation", lookup_expr="lte")
    tiers = django_filters.CharFilter(field_name="tiers", lookup_expr="icontains")

    class Meta:
        model = Transaction
        fields = ["type_operation", "category", "tiers", "date_debut", "date_fin"]

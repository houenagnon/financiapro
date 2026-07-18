import django_filters

from .models import Transaction


class TransactionFilter(django_filters.FilterSet):
    date_debut = django_filters.DateFilter(field_name="date_operation", lookup_expr="gte")
    date_fin = django_filters.DateFilter(field_name="date_operation", lookup_expr="lte")

    class Meta:
        model = Transaction
        fields = ["type_operation", "category", "date_debut", "date_fin"]

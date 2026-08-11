import django_filters

from .models import Centre


class CentreFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(field_name="nom", lookup_expr="icontains")

    class Meta:
        model = Centre
        fields = ["type_centre", "is_active", "q"]

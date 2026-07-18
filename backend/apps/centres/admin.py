from django.contrib import admin

from .models import Centre, TypeCentre


@admin.register(TypeCentre)
class TypeCentreAdmin(admin.ModelAdmin):
    list_display = ["libelle", "code", "is_active"]
    prepopulated_fields = {"code": ["libelle"]}


@admin.register(Centre)
class CentreAdmin(admin.ModelAdmin):
    list_display = ["nom", "type_centre", "econome_principal", "is_active"]
    list_filter = ["type_centre", "is_active"]
    search_fields = ["nom"]

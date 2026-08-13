from django.contrib import admin

from .models import (
    MouvementTresorerie,
    Placement,
    Portefeuille,
    TypePlacement,
    ValorisationPlacement,
)


@admin.register(TypePlacement)
class TypePlacementAdmin(admin.ModelAdmin):
    list_display = ["libelle", "code", "is_active"]
    prepopulated_fields = {"code": ["libelle"]}


@admin.register(Portefeuille)
class PortefeuilleAdmin(admin.ModelAdmin):
    list_display = ["nom", "is_active", "cree_par", "date_creation"]
    search_fields = ["nom"]


@admin.register(Placement)
class PlacementAdmin(admin.ModelAdmin):
    list_display = [
        "nom",
        "portefeuille",
        "type_placement",
        "niveau_risque",
        "montant_investi",
        "statut",
        "date_acquisition",
    ]
    list_filter = ["statut", "niveau_risque", "type_placement", "portefeuille"]
    search_fields = ["nom"]


@admin.register(ValorisationPlacement)
class ValorisationPlacementAdmin(admin.ModelAdmin):
    list_display = ["placement", "date_valorisation", "valeur", "saisi_par"]
    list_filter = ["placement"]
    date_hierarchy = "date_valorisation"


@admin.register(MouvementTresorerie)
class MouvementTresorerieAdmin(admin.ModelAdmin):
    list_display = [
        "date_mouvement",
        "type_mouvement",
        "montant",
        "centre",
        "placement",
        "saisi_par",
    ]
    list_filter = ["type_mouvement"]
    date_hierarchy = "date_mouvement"

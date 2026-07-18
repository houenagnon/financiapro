from django.contrib import admin

from .models import Category, Transaction


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["__str__", "nature", "parent", "is_active"]
    list_filter = ["nature", "is_active"]
    search_fields = ["nom"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "date_operation",
        "centre",
        "type_operation",
        "montant",
        "category",
        "saisi_par",
    ]
    list_filter = ["type_operation", "centre"]
    date_hierarchy = "date_operation"

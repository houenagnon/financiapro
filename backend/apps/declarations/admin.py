from django.contrib import admin

from .models import DeclarationJournaliere


@admin.register(DeclarationJournaliere)
class DeclarationJournaliereAdmin(admin.ModelAdmin):
    list_display = ["date", "centre", "statut", "declare_par", "date_declaration"]
    list_filter = ["statut", "centre"]
    date_hierarchy = "date"

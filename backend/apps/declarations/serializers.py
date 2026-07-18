from rest_framework import serializers

from .models import DeclarationJournaliere


class DeclarationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeclarationJournaliere
        fields = ["id", "centre", "date", "statut", "declare_par", "date_declaration"]


class AucuneOperationSerializer(serializers.Serializer):
    """Déclaration explicite « aucune opération » ; par défaut aujourd'hui (heure serveur)."""

    date = serializers.DateField(required=False)

from decimal import Decimal

from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.centres.models import Centre

from . import services
from .models import (
    MouvementTresorerie,
    Placement,
    Portefeuille,
    TypePlacement,
    ValorisationPlacement,
)


class TypePlacementSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypePlacement
        fields = ["id", "code", "libelle", "is_active"]


class PortefeuilleSerializer(serializers.ModelSerializer):
    cree_par = UserSerializer(read_only=True)

    class Meta:
        model = Portefeuille
        fields = ["id", "nom", "description", "is_active", "cree_par", "date_creation"]


class PortefeuilleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portefeuille
        fields = ["id", "nom", "description", "is_active"]

    def create(self, validated_data):
        validated_data["cree_par"] = self.context["request"].user
        return super().create(validated_data)

    def to_representation(self, instance):
        return PortefeuilleSerializer(instance, context=self.context).data


class ValorisationPlacementSerializer(serializers.ModelSerializer):
    saisi_par = UserSerializer(read_only=True)

    class Meta:
        model = ValorisationPlacement
        fields = [
            "id",
            "placement",
            "date_valorisation",
            "valeur",
            "notes",
            "saisi_par",
            "date_creation",
        ]
        read_only_fields = ["id", "placement", "saisi_par", "date_creation"]


class PlacementSerializer(serializers.ModelSerializer):
    type_placement = TypePlacementSerializer(read_only=True)
    cree_par = UserSerializer(read_only=True)
    derniere_valorisation = ValorisationPlacementSerializer(read_only=True)
    valeur_actuelle = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    gain_perte = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    performance_pct = serializers.DecimalField(
        max_digits=8, decimal_places=2, read_only=True
    )

    class Meta:
        model = Placement
        fields = [
            "id",
            "portefeuille",
            "type_placement",
            "nom",
            "niveau_risque",
            "montant_investi",
            "date_acquisition",
            "statut",
            "date_cloture",
            "montant_recupere",
            "notes",
            "cree_par",
            "date_creation",
            "date_modification",
            "valeur_actuelle",
            "gain_perte",
            "performance_pct",
            "derniere_valorisation",
        ]


class PlacementCreateSerializer(serializers.ModelSerializer):
    """Achat d'un placement : débite la trésorerie centrale (voir
    `services.acheter_placement`) — jamais de création "à sec" du modèle."""

    portefeuille_id = serializers.PrimaryKeyRelatedField(
        source="portefeuille", queryset=Portefeuille.objects.filter(is_active=True)
    )
    type_placement_id = serializers.PrimaryKeyRelatedField(
        source="type_placement", queryset=TypePlacement.objects.filter(is_active=True)
    )

    class Meta:
        model = Placement
        fields = [
            "id",
            "portefeuille_id",
            "type_placement_id",
            "nom",
            "niveau_risque",
            "montant_investi",
            "date_acquisition",
            "notes",
        ]

    def create(self, validated_data):
        try:
            return services.acheter_placement(
                user=self.context["request"].user, **validated_data
            )
        except services.SoldeCaisseInsuffisant as exc:
            raise serializers.ValidationError({"montant_investi": str(exc)}) from exc

    def to_representation(self, instance):
        return PlacementSerializer(instance, context=self.context).data


class PlacementUpdateSerializer(serializers.ModelSerializer):
    """Un placement en cours ne se corrige que sur son descriptif — le
    montant investi et les mouvements de caisse associés ne se modifient
    jamais après coup (intégrité de la trésorerie)."""

    class Meta:
        model = Placement
        fields = ["nom", "niveau_risque", "notes"]

    def to_representation(self, instance):
        return PlacementSerializer(instance, context=self.context).data


class ValoriserSerializer(serializers.Serializer):
    """Payload de l'action `valoriser` ("marquer" un placement)."""

    date_valorisation = serializers.DateField()
    valeur = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0")
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        placement = self.context["placement"]
        if services.valorisation_existe(placement, attrs["date_valorisation"]):
            raise serializers.ValidationError(
                {"date_valorisation": "Ce placement a déjà été marqué à cette date."}
            )
        return attrs


class ClotureSerializer(serializers.Serializer):
    """Payload de l'action `cloturer` (rachat/vente du placement)."""

    date_cloture = serializers.DateField()
    montant_recupere = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0")
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class MouvementTresorerieSerializer(serializers.ModelSerializer):
    centre = serializers.StringRelatedField()
    placement = serializers.StringRelatedField()
    saisi_par = UserSerializer(read_only=True)

    class Meta:
        model = MouvementTresorerie
        fields = [
            "id",
            "type_mouvement",
            "montant",
            "centre",
            "placement",
            "date_mouvement",
            "notes",
            "saisi_par",
            "date_creation",
        ]


class VirementSerializer(serializers.Serializer):
    """Payload de création d'un virement centre <-> trésorerie centrale."""

    centre = serializers.PrimaryKeyRelatedField(
        queryset=Centre.objects.filter(is_active=True)
    )
    sens = serializers.ChoiceField(choices=["ENTRANT", "SORTANT"])
    montant = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.01")
    )
    date_mouvement = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")

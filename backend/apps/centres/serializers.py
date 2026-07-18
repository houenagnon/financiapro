from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.serializers import UserCreateSerializer, UserSerializer

from .models import Centre, TypeCentre


class TypeCentreSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeCentre
        fields = ["id", "code", "libelle", "is_active"]


class EconomeCreateSerializer(UserCreateSerializer):
    """Payload de l'économe imbriqué dans la création d'un centre.

    Le rôle est imposé à ECONOME_PRINCIPAL, pas fourni par le client.
    """

    class Meta(UserCreateSerializer.Meta):
        fields = ["id", "email", "first_name", "last_name", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data["role"] = User.Role.ECONOME_PRINCIPAL
        validated_data["created_by"] = self.context["request"].user
        return User.objects.create_user(password=password, **validated_data)


class CentreSerializer(serializers.ModelSerializer):
    type_centre = TypeCentreSerializer(read_only=True)
    econome_principal = UserSerializer(read_only=True)

    class Meta:
        model = Centre
        fields = [
            "id",
            "nom",
            "type_centre",
            "econome_principal",
            "description",
            "is_active",
            "date_creation",
        ]


class CentreCreateSerializer(serializers.ModelSerializer):
    """Création atomique d'un centre et de son économe principal."""

    type_centre_id = serializers.PrimaryKeyRelatedField(
        source="type_centre",
        queryset=TypeCentre.objects.filter(is_active=True),
    )
    econome = EconomeCreateSerializer(write_only=True)

    class Meta:
        model = Centre
        fields = ["id", "nom", "type_centre_id", "description", "econome"]

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("econome")
        econome_serializer = EconomeCreateSerializer(
            data=self.initial_data["econome"], context=self.context
        )
        econome_serializer.is_valid(raise_exception=True)
        econome = econome_serializer.save()
        centre = Centre.objects.create(econome_principal=econome, **validated_data)
        econome.centre = centre
        econome.save(update_fields=["centre"])
        return centre

    def to_representation(self, instance):
        return CentreSerializer(instance, context=self.context).data


class CentreUpdateSerializer(serializers.ModelSerializer):
    type_centre_id = serializers.PrimaryKeyRelatedField(
        source="type_centre",
        queryset=TypeCentre.objects.filter(is_active=True),
        required=False,
    )

    class Meta:
        model = Centre
        fields = ["nom", "type_centre_id", "description", "is_active"]

    def to_representation(self, instance):
        return CentreSerializer(instance, context=self.context).data

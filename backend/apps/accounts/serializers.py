from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "centre",
            "is_active",
            "created_by",
            "date_creation",
        ]
        read_only_fields = [
            "id",
            "role",
            "centre",
            "is_active",
            "created_by",
            "date_creation",
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "password"]
        read_only_fields = ["id"]

    def validate_role(self, value):
        """La hiérarchie de création : Économat central → Économe principal → Assistant."""
        creator = self.context["request"].user
        allowed = {
            User.Role.ECONOMAT_CENTRAL: {
                User.Role.ECONOMAT_CENTRAL,
                User.Role.ECONOME_PRINCIPAL,
            },
            User.Role.ECONOME_PRINCIPAL: {User.Role.ASSISTANT},
        }
        if value not in allowed.get(creator.role, set()):
            raise serializers.ValidationError(
                "Vous n'êtes pas autorisé à créer un utilisateur avec ce rôle."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        creator = self.context["request"].user
        validated_data["created_by"] = creator
        # Un assistant créé par un Économe principal est rattaché d'office au
        # centre de celui-ci, quel que soit le payload.
        if creator.role == User.Role.ECONOME_PRINCIPAL:
            validated_data["centre"] = creator.centre
        return User.objects.create_user(password=password, **validated_data)

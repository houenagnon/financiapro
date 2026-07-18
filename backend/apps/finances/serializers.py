from rest_framework import serializers

from .models import Category, Transaction


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "nom", "nature", "parent", "is_active"]

    def validate(self, attrs):
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        nature = attrs.get("nature", getattr(self.instance, "nature", None))
        if parent is not None:
            if parent.parent is not None:
                raise serializers.ValidationError(
                    {"parent": "Un seul niveau de sous-catégorie est autorisé."}
                )
            if parent.nature != nature:
                raise serializers.ValidationError(
                    {"nature": "La nature doit être identique à celle de la catégorie parente."}
                )
        return attrs


class CategoryTreeSerializer(serializers.ModelSerializer):
    sous_categories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "nom", "nature", "is_active", "sous_categories"]

    def get_sous_categories(self, obj):
        actives = [c for c in obj.sous_categories.all() if c.is_active]
        return CategoryTreeSerializer(actives, many=True).data


class TransactionSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source="category", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "centre",
            "type_operation",
            "montant",
            "date_operation",
            "category",
            "category_detail",
            "description",
            "saisi_par",
            "date_creation",
            "date_modification",
        ]
        read_only_fields = [
            "id",
            "centre",
            "saisi_par",
            "date_creation",
            "date_modification",
        ]

    def validate(self, attrs):
        category = attrs.get("category", getattr(self.instance, "category", None))
        type_operation = attrs.get(
            "type_operation", getattr(self.instance, "type_operation", None)
        )
        if category and not category.is_active:
            raise serializers.ValidationError(
                {"category": "Cette catégorie n'est plus active."}
            )
        if category and category.nature != type_operation:
            raise serializers.ValidationError(
                {"category": "La catégorie ne correspond pas au type d'opération."}
            )
        return attrs

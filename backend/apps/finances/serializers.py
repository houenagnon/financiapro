from rest_framework import serializers

from .models import Category, Transaction


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "nom", "nature", "parent", "centre", "is_active"]
        read_only_fields = ["centre"]
        # L'unicité (nom, nature, parent, centre) est vérifiée dans validate()
        # avec le centre de l'utilisateur — le validateur auto de DRF exigerait
        # ces champs dans le payload.
        validators = []

    def validate(self, attrs):
        user = self.context["request"].user
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        nature = attrs.get("nature", getattr(self.instance, "nature", None))
        nom = attrs.get("nom", getattr(self.instance, "nom", None))

        doublon = Category.objects.filter(
            nom=nom,
            nature=nature,
            parent=parent,
            centre_id=getattr(user, "centre_id", None)
            if self.instance is None
            else self.instance.centre_id,
        )
        if self.instance is not None:
            doublon = doublon.exclude(pk=self.instance.pk)
        if doublon.exists():
            raise serializers.ValidationError(
                {"nom": "Cette catégorie existe déjà."}
            )

        # Les catégories de centre sont créées librement mais restent des
        # racines : pas de hiérarchie à gérer côté centre.
        if getattr(user, "centre_id", None) is not None and parent is not None:
            raise serializers.ValidationError(
                {"parent": "Les catégories de centre n'ont pas de sous-catégories."}
            )

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

    def create(self, validated_data):
        user = self.context["request"].user
        # Membre d'un centre → catégorie rattachée à son centre ;
        # Économat central → catalogue global (centre null).
        validated_data["centre_id"] = getattr(user, "centre_id", None)
        return super().create(validated_data)


class CategoryTreeSerializer(serializers.ModelSerializer):
    sous_categories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "nom", "nature", "centre", "is_active", "sous_categories"]

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
        # Une catégorie de centre n'est utilisable que par son centre.
        user = self.context["request"].user
        if (
            category
            and category.centre_id is not None
            and category.centre_id != getattr(user, "centre_id", None)
        ):
            raise serializers.ValidationError(
                {"category": "Cette catégorie appartient à un autre centre."}
            )
        return attrs

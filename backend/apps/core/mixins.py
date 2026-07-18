class CentreScopedQuerysetMixin:
    """Restreint le queryset au centre de l'utilisateur connecté.

    - Économat central : accès à tout (supervision globale).
    - Économe principal / Assistant : uniquement les objets de leur centre.

    Le modèle du queryset doit avoir une FK `centre`. Le nom du champ peut
    être surchargé via `centre_field` (ex: "centre__type_centre").
    """

    centre_field = "centre"

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_economat_central:
            return queryset
        centre_id = getattr(user, "centre_id", None)
        if centre_id is None:
            return queryset.none()
        return queryset.filter(**{f"{self.centre_field}_id": centre_id})


class CentreAutoAssignMixin:
    """À la création, rattache automatiquement l'objet au centre de l'utilisateur.

    Empêche un Économe/Assistant d'écrire dans un autre centre, quel que soit
    le payload envoyé.
    """

    def perform_create(self, serializer):
        serializer.save(centre=self.request.user.centre, saisi_par=self.request.user)

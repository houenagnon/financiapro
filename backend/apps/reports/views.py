from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsEconomatCentral
from apps.core.permissions import IsCentreMember
from apps.declarations.models import DeclarationJournaliere
from apps.finances.models import Transaction

from . import services


class ConsolideView(APIView):
    """Vue consolidée globale, filtrable par période et type de centre."""

    permission_classes = [IsEconomatCentral]

    def get(self, request):
        queryset = services.filtrer_par_periode(
            Transaction.objects.all(),
            request.query_params.get("date_debut"),
            request.query_params.get("date_fin"),
        )
        type_centre = request.query_params.get("type_centre")
        if type_centre:
            queryset = queryset.filter(centre__type_centre_id=type_centre)
        return Response(services.rapport_consolide(queryset))


class ComparaisonCentresView(APIView):
    permission_classes = [IsEconomatCentral]

    def get(self, request):
        queryset = services.filtrer_par_periode(
            Transaction.objects.all(),
            request.query_params.get("date_debut"),
            request.query_params.get("date_fin"),
        )
        return Response(services.comparaison_centres(queryset))


class CentreDashboardView(APIView):
    """Résumé du centre de l'utilisateur connecté : totaux, statut du jour,
    dernières opérations, répartition par catégorie."""

    permission_classes = [IsCentreMember]

    def get(self, request):
        centre = request.user.centre
        transactions = Transaction.objects.filter(centre=centre)
        periode = services.filtrer_par_periode(
            transactions,
            request.query_params.get("date_debut"),
            request.query_params.get("date_fin"),
        )

        aujourd_hui = timezone.localdate()
        declaration = DeclarationJournaliere.objects.filter(
            centre=centre, date=aujourd_hui
        ).first()

        dernieres = [
            {
                "id": t.pk,
                "type_operation": t.type_operation,
                "montant": str(t.montant),
                "date_operation": t.date_operation,
                "category": str(t.category),
            }
            for t in periode.select_related("category", "category__parent")[:5]
        ]

        return Response(
            {
                "centre": {"id": centre.pk, "nom": centre.nom},
                "totaux": services._totaux(periode),
                "statut_jour": declaration.statut if declaration else "NON_DECLARE",
                "dernieres_operations": dernieres,
                "par_categorie": services.totaux_par_categorie(periode),
            }
        )

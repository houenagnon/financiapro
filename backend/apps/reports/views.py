from decimal import Decimal

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsEconomatCentral
from apps.core.permissions import IsCentreMember
from apps.declarations.models import DeclarationJournaliere
from apps.finances.models import Nature, Transaction
from apps.placements import services as placements_services

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
        data = services.rapport_consolide(queryset)
        data["serie_mensuelle"] = services.serie_mensuelle(queryset)
        return Response(data)


class ComparaisonCentresView(APIView):
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
                "tiers": t.tiers,
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
                "serie_mensuelle": services.serie_mensuelle(periode),
            }
        )


class RapportPlacementsView(APIView):
    """Rapport consolidé des placements : solde de la trésorerie centrale,
    performance globale, répartitions par type/risque, série mensuelle et
    détail par portefeuille."""

    permission_classes = [IsEconomatCentral]

    def get(self, request):
        return Response(placements_services.dashboard_placements())


class RegistreView(APIView):
    """Registre détaillé (imprimable) du centre : liste chronologique des
    opérations avec solde cumulatif, filtrable par période, type, catégorie
    et tiers. Non paginé — les volumes attendus par centre restent modestes ;
    à revoir si un centre accumule un historique très important.
    """

    permission_classes = [IsCentreMember]

    def get(self, request):
        centre = request.user.centre
        toutes = Transaction.objects.filter(centre=centre)

        date_debut = request.query_params.get("date_debut")
        date_fin = request.query_params.get("date_fin")
        category_id = request.query_params.get("category")
        tiers = request.query_params.get("tiers")
        type_operation = request.query_params.get("type_operation")

        # Le solde d'ouverture reflète toujours l'historique complet du
        # centre (jamais restreint par catégorie/tiers), pour rester exact.
        solde_initial = services.solde_avant_date(toutes, date_debut)

        queryset = services.filtrer_par_periode(toutes, date_debut, date_fin)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if tiers:
            queryset = queryset.filter(tiers__icontains=tiers)
        if type_operation:
            queryset = queryset.filter(type_operation=type_operation)

        queryset = queryset.select_related("category", "category__parent").order_by(
            "date_operation", "date_creation"
        )

        operations = []
        solde = solde_initial
        for transaction in queryset:
            if transaction.type_operation == Nature.REVENU:
                solde += transaction.montant
            else:
                solde -= transaction.montant
            operations.append(
                {
                    "id": transaction.pk,
                    "date_operation": transaction.date_operation,
                    "tiers": transaction.tiers,
                    "category": str(transaction.category),
                    "notes": transaction.notes,
                    "type_operation": transaction.type_operation,
                    "montant": str(transaction.montant),
                    "solde": services._fmt(solde),
                }
            )

        revenus = sum(
            (t.montant for t in queryset if t.type_operation == Nature.REVENU),
            Decimal("0"),
        )
        depenses = sum(
            (t.montant for t in queryset if t.type_operation == Nature.DEPENSE),
            Decimal("0"),
        )

        return Response(
            {
                "solde_initial": services._fmt(solde_initial),
                "operations": operations,
                "totaux": {
                    "revenus": services._fmt(revenus),
                    "depenses": services._fmt(depenses),
                    "solde": services._fmt(solde_initial + revenus - depenses),
                },
            }
        )

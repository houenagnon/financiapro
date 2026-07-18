"""Requêtes d'agrégation sur les transactions.

Toutes les fonctions prennent un queryset de transactions déjà filtré
(période, centre...) et retournent des structures sérialisables. Les
montants sont renvoyés en str pour préserver la précision décimale en JSON.
"""
from decimal import Decimal

from django.db.models import Q, Sum

from apps.finances.models import Nature


def _fmt(montant):
    """Formate un montant avec 2 décimales garanties (les agrégats SQLite
    renvoient des Decimal sans zéros de fin)."""
    return str(Decimal(montant).quantize(Decimal("0.01")))


def _totaux(queryset):
    aggregat = queryset.aggregate(
        revenus=Sum("montant", filter=Q(type_operation=Nature.REVENU)),
        depenses=Sum("montant", filter=Q(type_operation=Nature.DEPENSE)),
    )
    revenus = aggregat["revenus"] or Decimal("0")
    depenses = aggregat["depenses"] or Decimal("0")
    return {
        "revenus": _fmt(revenus),
        "depenses": _fmt(depenses),
        "solde": _fmt(revenus - depenses),
    }


def filtrer_par_periode(queryset, date_debut=None, date_fin=None):
    if date_debut:
        queryset = queryset.filter(date_operation__gte=date_debut)
    if date_fin:
        queryset = queryset.filter(date_operation__lte=date_fin)
    return queryset


def rapport_consolide(queryset):
    """Totaux globaux + répartition par type de centre."""
    par_type = []
    lignes = (
        queryset.values(
            "centre__type_centre_id",
            "centre__type_centre__libelle",
            "type_operation",
        )
        .annotate(total=Sum("montant"))
        .order_by("centre__type_centre__libelle")
    )
    types = {}
    for ligne in lignes:
        cle = ligne["centre__type_centre_id"]
        entree = types.setdefault(
            cle,
            {
                "type_centre_id": cle,
                "type_centre": ligne["centre__type_centre__libelle"],
                "revenus": Decimal("0"),
                "depenses": Decimal("0"),
            },
        )
        if ligne["type_operation"] == Nature.REVENU:
            entree["revenus"] = ligne["total"]
        else:
            entree["depenses"] = ligne["total"]
    for entree in types.values():
        entree["solde"] = _fmt(entree["revenus"] - entree["depenses"])
        entree["revenus"] = _fmt(entree["revenus"])
        entree["depenses"] = _fmt(entree["depenses"])
        par_type.append(entree)

    return {"global": _totaux(queryset), "par_type_centre": par_type}


def comparaison_centres(queryset):
    """Totaux par centre, ordonnés par solde décroissant."""
    lignes = (
        queryset.values("centre_id", "centre__nom", "type_operation")
        .annotate(total=Sum("montant"))
        .order_by("centre__nom")
    )
    centres = {}
    for ligne in lignes:
        cle = ligne["centre_id"]
        entree = centres.setdefault(
            cle,
            {
                "centre_id": cle,
                "centre": ligne["centre__nom"],
                "revenus": Decimal("0"),
                "depenses": Decimal("0"),
            },
        )
        if ligne["type_operation"] == Nature.REVENU:
            entree["revenus"] = ligne["total"]
        else:
            entree["depenses"] = ligne["total"]
    resultat = []
    for entree in centres.values():
        entree["solde_num"] = entree["revenus"] - entree["depenses"]
        entree["solde"] = _fmt(entree["solde_num"])
        entree["revenus"] = _fmt(entree["revenus"])
        entree["depenses"] = _fmt(entree["depenses"])
        resultat.append(entree)
    resultat.sort(key=lambda e: e.pop("solde_num"), reverse=True)
    return resultat


def totaux_par_categorie(queryset):
    """Totaux par catégorie racine (les sous-catégories remontent au parent)."""
    lignes = (
        queryset.values(
            "category_id",
            "category__nom",
            "category__parent_id",
            "category__parent__nom",
            "type_operation",
        )
        .annotate(total=Sum("montant"))
    )
    categories = {}
    for ligne in lignes:
        if ligne["category__parent_id"]:
            cle = ligne["category__parent_id"]
            nom = ligne["category__parent__nom"]
        else:
            cle = ligne["category_id"]
            nom = ligne["category__nom"]
        entree = categories.setdefault(
            cle,
            {
                "category_id": cle,
                "category": nom,
                "type_operation": ligne["type_operation"],
                "total": Decimal("0"),
            },
        )
        entree["total"] += ligne["total"]
    resultat = sorted(categories.values(), key=lambda e: e["total"], reverse=True)
    for entree in resultat:
        entree["total"] = _fmt(entree["total"])
    return resultat

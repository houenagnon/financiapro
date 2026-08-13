"""Logique métier des placements et de la trésorerie centrale.

La caisse centrale n'est jamais une entité à part : son solde est toujours
recalculé depuis le journal `MouvementTresorerie` (mêmes principes que les
soldes de centre, recalculés depuis `Transaction`). Les montants sont
renvoyés en str pour préserver la précision décimale en JSON, comme dans
`apps.reports.services`.
"""
import calendar
from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.db import transaction as db_transaction
from django.db.models import Q, Sum
from django.utils import timezone

from apps.finances.models import Category, Nature, Transaction

from .models import (
    MouvementTresorerie,
    Placement,
    Portefeuille,
    StatutPlacement,
    TypeMouvement,
)

NOM_CATEGORIE_VIREMENT = "Virement trésorerie centrale"

ENTRANTS = (TypeMouvement.VIREMENT_ENTRANT, TypeMouvement.RACHAT_PLACEMENT)
SORTANTS = (TypeMouvement.VIREMENT_SORTANT, TypeMouvement.ACHAT_PLACEMENT)


class SoldeCaisseInsuffisant(Exception):
    """Levée quand une opération ferait passer la caisse centrale en négatif."""


def _fmt(montant):
    return str(Decimal(montant).quantize(Decimal("0.01")))


def solde_caisse():
    aggregat = MouvementTresorerie.objects.aggregate(
        entrants=Sum("montant", filter=Q(type_mouvement__in=ENTRANTS)),
        sortants=Sum("montant", filter=Q(type_mouvement__in=SORTANTS)),
    )
    entrants = aggregat["entrants"] or Decimal("0")
    sortants = aggregat["sortants"] or Decimal("0")
    return entrants - sortants


def _categorie_virement(nature):
    return Category.objects.get(nom=NOM_CATEGORIE_VIREMENT, nature=nature, centre=None)


@db_transaction.atomic
def virement_centre_tresorerie(*, centre, sens, montant, date_mouvement, user, notes=""):
    """Virement entre un centre et la trésorerie centrale.

    sens="ENTRANT" : le centre alimente la caisse (Dépense pour le centre).
    sens="SORTANT" : la caisse renvoie des fonds au centre (Revenu pour le
    centre) — nécessite un solde de caisse suffisant.
    """
    if sens == "ENTRANT":
        nature, type_mouvement = Nature.DEPENSE, TypeMouvement.VIREMENT_ENTRANT
    elif sens == "SORTANT":
        nature, type_mouvement = Nature.REVENU, TypeMouvement.VIREMENT_SORTANT
    else:
        raise ValueError("sens doit être 'ENTRANT' ou 'SORTANT'")

    if sens == "SORTANT" and solde_caisse() < montant:
        raise SoldeCaisseInsuffisant(
            "Solde de la trésorerie centrale insuffisant pour ce virement."
        )

    tx = Transaction.objects.create(
        centre=centre,
        type_operation=nature,
        montant=montant,
        date_operation=date_mouvement,
        category=_categorie_virement(nature),
        tiers="Trésorerie centrale",
        notes=notes,
        saisi_par=user,
    )
    return MouvementTresorerie.objects.create(
        type_mouvement=type_mouvement,
        montant=montant,
        centre=centre,
        transaction_liee=tx,
        date_mouvement=date_mouvement,
        notes=notes,
        saisi_par=user,
    )


@db_transaction.atomic
def acheter_placement(
    *,
    portefeuille,
    type_placement,
    nom,
    niveau_risque,
    montant_investi,
    date_acquisition,
    user,
    notes="",
):
    if solde_caisse() < montant_investi:
        raise SoldeCaisseInsuffisant(
            "Solde de la trésorerie centrale insuffisant pour cet achat."
        )
    placement = Placement.objects.create(
        portefeuille=portefeuille,
        type_placement=type_placement,
        nom=nom,
        niveau_risque=niveau_risque,
        montant_investi=montant_investi,
        date_acquisition=date_acquisition,
        notes=notes,
        cree_par=user,
    )
    MouvementTresorerie.objects.create(
        type_mouvement=TypeMouvement.ACHAT_PLACEMENT,
        montant=montant_investi,
        placement=placement,
        date_mouvement=date_acquisition,
        saisi_par=user,
        notes=notes,
    )
    return placement


@db_transaction.atomic
def cloturer_placement(*, placement, montant_recupere, date_cloture, user, notes=""):
    if placement.statut == StatutPlacement.CLOTURE:
        raise ValueError("Ce placement est déjà clôturé.")
    placement.statut = StatutPlacement.CLOTURE
    placement.date_cloture = date_cloture
    placement.montant_recupere = montant_recupere
    placement.save(
        update_fields=["statut", "date_cloture", "montant_recupere", "date_modification"]
    )
    MouvementTresorerie.objects.create(
        type_mouvement=TypeMouvement.RACHAT_PLACEMENT,
        montant=montant_recupere,
        placement=placement,
        date_mouvement=date_cloture,
        saisi_par=user,
        notes=notes,
    )
    return placement


def valorisation_existe(placement, date_valorisation):
    return placement.valorisations.filter(date_valorisation=date_valorisation).exists()


def performance_portefeuille(portefeuille):
    """Totaux investi/valeur/gain-perte du portefeuille, et répartition
    par type de placement et par niveau de risque (base des rapports)."""
    placements = list(
        portefeuille.placements.select_related("type_placement").prefetch_related(
            "valorisations"
        )
    )
    return _performance(placements)


def performance_globale():
    """Même agrégation que `performance_portefeuille`, tous portefeuilles
    confondus — utilisée par le rapport consolidé de l'Économat central."""
    placements = list(
        Placement.objects.select_related("type_placement").prefetch_related(
            "valorisations"
        )
    )
    return _performance(placements)


def _performance(placements):
    total_investi = Decimal("0")
    total_valeur = Decimal("0")
    par_type = defaultdict(lambda: {"investi": Decimal("0"), "valeur": Decimal("0")})
    par_risque = defaultdict(lambda: {"investi": Decimal("0"), "valeur": Decimal("0")})

    for placement in placements:
        valeur = placement.valeur_actuelle
        total_investi += placement.montant_investi
        total_valeur += valeur
        par_type[placement.type_placement.libelle]["investi"] += placement.montant_investi
        par_type[placement.type_placement.libelle]["valeur"] += valeur
        libelle_risque = placement.get_niveau_risque_display()
        par_risque[libelle_risque]["investi"] += placement.montant_investi
        par_risque[libelle_risque]["valeur"] += valeur

    gain_perte = total_valeur - total_investi
    performance_pct = (
        (gain_perte / total_investi * Decimal("100")) if total_investi else Decimal("0")
    )

    def _serialize(groupes):
        return [
            {"label": cle, "investi": _fmt(v["investi"]), "valeur": _fmt(v["valeur"])}
            for cle, v in sorted(groupes.items())
        ]

    return {
        "total_investi": _fmt(total_investi),
        "valeur_actuelle": _fmt(total_valeur),
        "gain_perte": _fmt(gain_perte),
        "performance_pct": str(performance_pct.quantize(Decimal("0.01"))),
        "nb_placements": len(placements),
        "nb_placements_en_cours": sum(
            1 for p in placements if p.statut == StatutPlacement.EN_COURS
        ),
        "par_type": _serialize(par_type),
        "par_risque": _serialize(par_risque),
    }


def _mois(une_date):
    return une_date.strftime("%Y-%m")


def _fin_de_mois(mois):
    annee, m = (int(x) for x in mois.split("-"))
    dernier_jour = calendar.monthrange(annee, m)[1]
    return date(annee, m, dernier_jour)


def _valeur_a_date(placement, a_date):
    if (
        placement.statut == StatutPlacement.CLOTURE
        and placement.date_cloture
        and placement.date_cloture <= a_date
    ):
        return placement.montant_recupere or Decimal("0")
    valorisations = [v for v in placement.valorisations.all() if v.date_valorisation <= a_date]
    if not valorisations:
        return placement.montant_investi
    return max(valorisations, key=lambda v: v.date_valorisation).valeur


def serie_valorisation_portefeuille(portefeuille):
    """Valeur totale du portefeuille reconstituée mois par mois à partir de
    l'historique des valorisations (et du montant investi tant qu'aucun
    marquage n'existe pour un placement) — matière première de la courbe
    de performance affichée côté frontend."""
    placements = list(portefeuille.placements.prefetch_related("valorisations"))
    return _serie_valorisation(placements)


def serie_valorisation_globale():
    """Même reconstitution mensuelle, tous portefeuilles confondus."""
    placements = list(Placement.objects.prefetch_related("valorisations"))
    return _serie_valorisation(placements)


def _serie_valorisation(placements):
    if not placements:
        return []

    mois_connus = {_mois(p.date_acquisition) for p in placements}
    for p in placements:
        mois_connus.update(_mois(v.date_valorisation) for v in p.valorisations.all())
        if p.date_cloture:
            mois_connus.add(_mois(p.date_cloture))
    mois_connus.add(_mois(timezone.localdate()))

    resultat = []
    for mois in sorted(mois_connus):
        fin_mois = _fin_de_mois(mois)
        total_investi = Decimal("0")
        total_valeur = Decimal("0")
        for p in placements:
            if p.date_acquisition > fin_mois:
                continue
            total_investi += p.montant_investi
            total_valeur += _valeur_a_date(p, fin_mois)
        resultat.append(
            {"mois": mois, "investi": _fmt(total_investi), "valeur": _fmt(total_valeur)}
        )
    return resultat


def dashboard_placements():
    """Rapport consolidé (tous portefeuilles) : solde de la caisse
    centrale, performance globale, répartitions et détail par
    portefeuille — sert de base à `GET /api/rapports/placements/`."""
    data = performance_globale()
    data["solde_caisse"] = _fmt(solde_caisse())
    data["serie_mensuelle"] = serie_valorisation_globale()
    data["portefeuilles"] = [
        {"id": portefeuille.pk, "nom": portefeuille.nom, **performance_portefeuille(portefeuille)}
        for portefeuille in Portefeuille.objects.filter(is_active=True).order_by("nom")
    ]
    return data

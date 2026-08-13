import type { User } from "./auth";

/** Miroir de apps/placements/serializers.py. */
export type NiveauRisque = "FAIBLE" | "MODERE" | "ELEVE";
export type StatutPlacement = "EN_COURS" | "CLOTURE";

export interface TypePlacement {
  id: number;
  code: string;
  libelle: string;
  is_active: boolean;
}

export interface Portefeuille {
  id: number;
  nom: string;
  description: string;
  is_active: boolean;
  cree_par: User;
  date_creation: string;
}

export interface ValorisationPlacement {
  id: number;
  placement: number;
  date_valorisation: string;
  valeur: string;
  notes: string;
  saisi_par: User;
  date_creation: string;
}

export interface Placement {
  id: number;
  portefeuille: number;
  type_placement: TypePlacement;
  nom: string;
  niveau_risque: NiveauRisque;
  /** Montants décimaux sérialisés en string — jamais d'arithmétique en JS. */
  montant_investi: string;
  date_acquisition: string;
  statut: StatutPlacement;
  date_cloture: string | null;
  montant_recupere: string | null;
  notes: string;
  cree_par: User;
  date_creation: string;
  date_modification: string;
  valeur_actuelle: string;
  gain_perte: string;
  performance_pct: string;
  derniere_valorisation: ValorisationPlacement | null;
}

/** Ligne de répartition (par type de placement ou par niveau de risque). */
export interface RepartitionPlacement {
  label: string;
  investi: string;
  valeur: string;
}

/** Point de la courbe investi/valeur reconstituée mois par mois. */
export interface PointValorisation {
  mois: string; // "2026-08"
  investi: string;
  valeur: string;
}

export interface PerformanceTotaux {
  total_investi: string;
  valeur_actuelle: string;
  gain_perte: string;
  performance_pct: string;
  nb_placements: number;
  nb_placements_en_cours: number;
  par_type: RepartitionPlacement[];
  par_risque: RepartitionPlacement[];
}

export interface PerformancePortefeuille extends PerformanceTotaux {
  serie_mensuelle: PointValorisation[];
}

/** GET /api/rapports/placements/ — vue consolidée tous portefeuilles. */
export interface DashboardPlacements extends PerformanceTotaux {
  solde_caisse: string;
  serie_mensuelle: PointValorisation[];
  portefeuilles: (PerformanceTotaux & { id: number; nom: string })[];
}

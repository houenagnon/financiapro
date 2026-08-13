import type { User } from "./auth";

/** Miroir de apps/placements/serializers.py (mouvements de la trésorerie
 * centrale). */
export type TypeMouvement =
  | "VIREMENT_ENTRANT"
  | "VIREMENT_SORTANT"
  | "ACHAT_PLACEMENT"
  | "RACHAT_PLACEMENT";

export interface MouvementTresorerie {
  id: number;
  type_mouvement: TypeMouvement;
  montant: string;
  /** Représentation texte (StringRelatedField) — pas d'objet imbriqué. */
  centre: string | null;
  placement: string | null;
  date_mouvement: string;
  notes: string;
  saisi_par: User;
  date_creation: string;
}

export interface SoldeCaisse {
  solde: string;
}

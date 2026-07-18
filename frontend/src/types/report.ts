/** Miroir de apps/reports/views.py et services.py. */
export interface Totaux {
  revenus: string;
  depenses: string;
  solde: string;
}

export type StatutJour =
  | "NON_DECLARE"
  | "DECLARE_AVEC_MOUVEMENT"
  | "DECLARE_SANS_MOUVEMENT";

export interface CentreDashboard {
  centre: { id: number; nom: string };
  totaux: Totaux;
  statut_jour: StatutJour;
  dernieres_operations: {
    id: number;
    type_operation: "REVENU" | "DEPENSE";
    montant: string;
    date_operation: string;
    category: string;
  }[];
  par_categorie: {
    category_id: number;
    category: string;
    type_operation: "REVENU" | "DEPENSE";
    total: string;
  }[];
}

export interface RapportConsolide {
  global: Totaux;
  par_type_centre: (Totaux & { type_centre_id: number; type_centre: string })[];
}

export type ComparaisonCentres = (Totaux & { centre_id: number; centre: string })[];

export interface DeclarationJournaliere {
  id: number;
  centre: number;
  date: string;
  statut: StatutJour;
  declare_par: number | null;
  date_declaration: string;
}

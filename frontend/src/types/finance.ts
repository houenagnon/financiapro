/** Miroir de apps/finances/serializers.py. */
export type Nature = "REVENU" | "DEPENSE";

export interface Category {
  id: number;
  nom: string;
  nature: Nature;
  parent: number | null;
  /** null = catalogue global (Économat central), sinon catégorie propre au centre. */
  centre: number | null;
  is_active: boolean;
}

export interface CategoryTree {
  id: number;
  nom: string;
  nature: Nature;
  centre: number | null;
  is_active: boolean;
  sous_categories: CategoryTree[];
}

export interface Transaction {
  id: number;
  centre: number;
  type_operation: Nature;
  /** Montant décimal sérialisé en string — ne jamais faire d'arithmétique dessus en JS. */
  montant: string;
  date_operation: string;
  category: number;
  category_detail: Category;
  description: string;
  saisi_par: number;
  date_creation: string;
  date_modification: string;
}

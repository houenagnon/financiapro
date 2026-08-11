import type { CategoryTree, Nature } from "@/types/finance";

export interface CategorieOption {
  id: number;
  label: string;
  nature: Nature;
}

/** Aplati l'arbre catégories/sous-catégories en options de menu, préfixées
 * du nom de la catégorie parente pour les sous-catégories. */
export function flattenCategories(tree: CategoryTree[]): CategorieOption[] {
  return tree.flatMap((racine) => [
    { id: racine.id, label: racine.nom, nature: racine.nature },
    ...racine.sous_categories.map((sous) => ({
      id: sous.id,
      label: `${racine.nom} › ${sous.nom}`,
      nature: sous.nature,
    })),
  ]);
}

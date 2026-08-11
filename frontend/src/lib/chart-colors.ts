/** Couleurs des graphiques — palette validée (voir skill dataviz).
 *
 * Revenus/Dépenses gardent le vert/rose déjà utilisés partout ailleurs dans
 * l'app (badges, cartes de stats) : c'est une paire sémantique fixe
 * (argent qui entre / qui sort), pas une identité de série arbitraire.
 *
 * Les catégories/types de centre sont une identité ouverte (définie par
 * l'utilisateur) : elles utilisent la palette catégorielle à 8 teintes,
 * ordre fixe, validée CVD (ΔE ≥ 8 adjacent, plancher vision normale ≥ 15).
 */
export const COULEUR_REVENU = "#059669"; // emerald-600
export const COULEUR_DEPENSE = "#e11d48"; // rose-600

export const PALETTE_CATEGORIELLE = [
  "#2a78d6", // bleu
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // jaune
  "#e87ba4", // magenta
  "#008300", // vert
  "#4a3aa7", // violet
  "#e34948", // rouge
];

/** Assigne une couleur de la palette catégorielle par position fixe — ne
 * jamais réassigner dynamiquement selon la valeur, seulement l'ordre. */
export function couleurCategorielle(index: number): string {
  return PALETTE_CATEGORIELLE[index % PALETTE_CATEGORIELLE.length];
}

export const INK_MUTED = "#898781";
export const GRIDLINE = "#e1e0d9";
export const AXIS = "#c3c2b7";
export const INK_SECONDARY = "#52514e";

/** Petits calculs d'échelle partagés par les graphiques SVG maison
 * (pas de librairie de graphiques — voir components/charts/). */

/** Arrondit vers le haut à un pas "propre" (1/2/5 × 10^n). */
export function niceMax(valeur: number): number {
  if (valeur <= 0) return 10;
  const exposant = Math.floor(Math.log10(valeur));
  const base = Math.pow(10, exposant);
  const normalise = valeur / base;
  const pas = normalise <= 1 ? 1 : normalise <= 2 ? 2 : normalise <= 5 ? 5 : 10;
  return pas * base;
}

/** Graduations propres de 0 à max (inclus), nombre approximatif de crans. */
export function ticksY(max: number, nombre = 4): number[] {
  const sommet = niceMax(max);
  const pas = sommet / nombre;
  return Array.from({ length: nombre + 1 }, (_, i) => Math.round(pas * i));
}

export function versNombre(valeur: string): number {
  const n = Number(valeur);
  return Number.isNaN(n) ? 0 : n;
}

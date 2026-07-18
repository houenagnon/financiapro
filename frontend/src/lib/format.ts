/** Formatage d'affichage des montants (le contrat API reste une string
 * décimale — jamais d'arithmétique sur ces valeurs côté client). */
const formatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMontant(montant: string | number): string {
  const valeur = typeof montant === "number" ? montant : Number(montant);
  if (Number.isNaN(valeur)) return String(montant);
  return formatter.format(valeur);
}

/** "+12 500" / "−3 200" avec signe typographique. */
export function formatMontantSigne(montant: string, type: "REVENU" | "DEPENSE"): string {
  const signe = type === "REVENU" ? "+" : "−";
  return `${signe}${formatMontant(montant)}`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

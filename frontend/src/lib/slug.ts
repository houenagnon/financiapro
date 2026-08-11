/** Convertit un texte libre en identifiant simple (minuscules, sans accents,
 * mots séparés par des tirets) — sert à générer un identifiant de compte
 * lisible à partir du nom d'un centre. */
export function slugify(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents (marques combinantes)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

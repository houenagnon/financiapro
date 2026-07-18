/** Parse la réponse du backend Django sans jamais lever d'exception.
 *
 * Un backend mal configuré (ex: DJANGO_ALLOWED_HOSTS erroné) renvoie du
 * HTML : on retourne alors une erreur JSON exploitable au lieu de faire
 * crasher le route handler en 500 opaque.
 */
export async function parseBackendJson(
  response: Response,
): Promise<Record<string, unknown>> {
  const texte = await response.text();
  try {
    return JSON.parse(texte);
  } catch {
    return {
      detail:
        `Réponse inattendue du backend (HTTP ${response.status}, non-JSON). ` +
        "Vérifiez la configuration du serveur (ALLOWED_HOSTS, URL de l'API).",
      code: "backend_unavailable",
    };
  }
}

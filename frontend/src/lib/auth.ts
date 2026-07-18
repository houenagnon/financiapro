/** Détention du token d'accès côté client.
 *
 * L'access token vit uniquement en mémoire (jamais en localStorage, pour
 * limiter l'exposition XSS). Le refresh token, lui, reste dans un cookie
 * httpOnly géré par les route handlers /api/session/*.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Tente d'obtenir un nouvel access token via le cookie refresh httpOnly. */
export async function refreshAccessToken(): Promise<string | null> {
  const response = await fetch("/api/session/refresh", { method: "POST" });
  if (!response.ok) {
    accessToken = null;
    return null;
  }
  const data: { access: string } = await response.json();
  accessToken = data.access;
  return data.access;
}

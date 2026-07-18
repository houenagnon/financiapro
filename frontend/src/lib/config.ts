/** URL du backend Django. Ne jamais hardcoder ailleurs. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Nom du cookie httpOnly portant le refresh token (posé par nos route handlers). */
export const REFRESH_COOKIE = "financiapro_refresh";

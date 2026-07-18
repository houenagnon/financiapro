import { API_URL } from "./config";
import { getAccessToken, refreshAccessToken } from "./auth";
import type { ApiError } from "@/types/auth";

export class ApiClientError extends Error {
  readonly status: number;
  readonly error: ApiError;

  constructor(status: number, error: ApiError) {
    super(error.detail);
    this.status = status;
    this.error = error;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Query params ajoutés à l'URL (les valeurs vides sont ignorées). */
  params?: Record<string, string | number | undefined>;
}

async function doFetch(path: string, options: RequestOptions, token: string | null) {
  const url = new URL(`/api${path}`, API_URL);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

/** Appelle l'API Django. Rafraîchit l'access token une fois sur 401 puis rejoue. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await doFetch(path, options, getAccessToken());

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken === null) {
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiClientError(401, { detail: "Session expirée.", code: "session_expired" });
    }
    response = await doFetch(path, options, newToken);
  }

  if (!response.ok) {
    let error: ApiError;
    try {
      error = await response.json();
    } catch {
      error = { detail: "Erreur inattendue du serveur.", code: "server_error" };
    }
    throw new ApiClientError(response.status, error);
  }

  if (response.status === 204 || response.status === 205) return undefined as T;
  return response.json();
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_URL, REFRESH_COOKIE } from "@/lib/config";
import { parseBackendJson } from "@/lib/backend-response";

const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // aligné sur REFRESH_TOKEN_LIFETIME côté Django

export async function POST(request: Request) {
  const credentials = await request.json();

  const response = await fetch(`${API_URL}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const data = await parseBackendJson(response);
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  const cookieStore = await cookies();
  cookieStore.set(REFRESH_COOKIE, data.refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });

  // Le refresh token ne quitte jamais le serveur Next : seul l'access part au client.
  return NextResponse.json({ access: data.access });
}

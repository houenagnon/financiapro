import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_URL, REFRESH_COOKIE } from "@/lib/config";
import { parseBackendJson } from "@/lib/backend-response";

const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST() {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json(
      { detail: "Aucune session.", code: "no_session" },
      { status: 401 },
    );
  }

  const response = await fetch(`${API_URL}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await parseBackendJson(response);
  if (!response.ok) {
    cookieStore.delete(REFRESH_COOKIE);
    return NextResponse.json(data, { status: response.status });
  }

  // SimpleJWT tourne les refresh tokens : on remplace le cookie à chaque refresh.
  if (data.refresh) {
    cookieStore.set(REFRESH_COOKIE, data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_MAX_AGE,
    });
  }

  return NextResponse.json({ access: data.access });
}

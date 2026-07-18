import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_URL, REFRESH_COOKIE } from "@/lib/config";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  const authorization = request.headers.get("Authorization");

  if (refresh && authorization) {
    // Blacklist du refresh token côté Django ; le cookie est supprimé quoi qu'il arrive.
    await fetch(`${API_URL}/api/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify({ refresh }),
    }).catch(() => undefined);
  }

  cookieStore.delete(REFRESH_COOKIE);
  return new NextResponse(null, { status: 204 });
}

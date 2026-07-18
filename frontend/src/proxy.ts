import { NextResponse, type NextRequest } from "next/server";

import { REFRESH_COOKIE } from "@/lib/config";

/** Garde de routes côté serveur : sans cookie de session, redirection vers /login.
 *
 * Défense en profondeur uniquement — la sécurité réelle est portée par l'API
 * Django (JWT + permissions par rôle).
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(REFRESH_COOKIE);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!hasSession && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tout sauf les route handlers de session, les assets et les fichiers statiques.
  matcher: ["/((?!api/session|_next/static|_next/image|favicon.ico).*)"],
};

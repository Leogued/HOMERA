import { NextResponse, type NextRequest } from "next/server";

/* ==================================================================
   HOMERA — GARDE D’ACCÈS CÔTÉ SERVEUR
   ------------------------------------------------------------------
   Les espaces privés ne sont plus protégés par le navigateur : sans
   cookie de session valide, la requête n’atteint jamais la page.

   Ce que fait ce middleware :
   • redirige vers /connexion en conservant la destination demandée ;
   • empêche la mise en cache des espaces privés par les navigateurs
     partagés (en-têtes `Cache-Control`).

   Ce qu’il ne fait pas, volontairement : la vérification du rôle. Elle
   demande la base de données et se fait donc dans les pages et les
   routes Serveur (`currentUser()` + `canAccessWorkspace`), avec un vrai
   refus (403 / redirection), pas une simple lecture de cookie.
   ================================================================== */

const SESSION_COOKIE = "homera_session";

const PROTECTED_PREFIXES = ["/client", "/proprietaire", "/agent", "/admin", "/messages", "/notifications"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsSession = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!needsSession) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    // `next` est le paramètre que lit /connexion (voir lib/nav.ts › safeReturnTo).
    url.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
}

export const config = {
  matcher: [
    "/client/:path*",
    "/proprietaire/:path*",
    "/agent/:path*",
    "/admin/:path*",
    "/messages/:path*",
    "/notifications/:path*",
  ],
};

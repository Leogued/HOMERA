import { currentUser } from "./current";
import { canAccessWorkspace, type UserContext, type WorkspaceId } from "../authz";
import { AUTH_HREF, safeReturnTo } from "@/lib/nav";

/* ==================================================================
   HOMERA — GARDE DES ESPACES (côté serveur)
   ------------------------------------------------------------------
   Historiquement, l’accès à un espace était décidé par le navigateur :
   le composant lisait le stockage local et affichait — ou non — la page.
   Ce n’est pas une protection. Depuis le socle serveur, la décision est
   prise avant le rendu, à partir de la session et des rôles en base.

   Trois issues possibles :
   • `ok`      — l’utilisateur a le droit, la page est rendue ;
   • `signin`  — aucune session valide : redirection vers /connexion ;
   • `denied`  — session valide mais rôle insuffisant : refus explicite.
   ================================================================== */

export type GateResult =
  | { status: "ok"; user: UserContext }
  | { status: "signin"; returnTo: string }
  | { status: "denied"; user: UserContext };

export async function guardWorkspace(role: WorkspaceId | "any", path: string): Promise<GateResult> {
  const user = await currentUser();
  if (!user) return { status: "signin", returnTo: path };
  if (role !== "any" && !canAccessWorkspace(user.roles, role)) {
    return { status: "denied", user };
  }
  return { status: "ok", user };
}

/**
 * Destination de reconnexion. Le paramètre `next` est celui que lit
 * /connexion ; l’adresse est assainie par la même règle que le reste du
 * site, donc jamais externe et jamais une boucle sur l’authentification.
 */
export function signinHref(returnTo: string): string {
  const safe = safeReturnTo(returnTo);
  return safe ? `${AUTH_HREF}?next=${encodeURIComponent(safe)}` : AUTH_HREF;
}

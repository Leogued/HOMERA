import { cookies } from "next/headers";
import { getDb } from "../db/client";
import { findSession, revokeSession, SESSION_COOKIE, touchSession } from "../security/session";
import { loadUserContext, type UserContext } from "../authz";

/* ==================================================================
   HOMERA — SESSION COURANTE (côté serveur)
   ------------------------------------------------------------------
   Le seul point d’entrée pour connaître l’utilisateur d’une requête.
   Tout repose sur le cookie de session : rien n’est accepté depuis le
   corps de la requête ou depuis un en-tête libre.

   `currentUser()` ne lève jamais : les pages et les routes décident
   ensuite de refuser l’accès (`requireUser`, `requireRole`).
   ================================================================== */

export async function sessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function currentUser(): Promise<UserContext | null> {
  const token = await sessionToken();
  if (!token) return null;
  const db = getDb();
  const session = findSession(db, token);
  if (!session) return null;
  const user = loadUserContext(db, session.user_id);
  if (!user || user.status !== "actif") return null;
  touchSession(db, session.id);
  return user;
}

export type Gate = { user: UserContext } | { response: Response };

/** Ferme la session courante (déconnexion). */
export async function destroySession(): Promise<void> {
  const token = await sessionToken();
  if (!token) return;
  const db = getDb();
  revokeSession(db, token);
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function cookieOptions(remember: boolean, expiresAt: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
    remember,
  };
}

export async function writeSessionCookie(token: string, remember: boolean, expiresAt: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

import type { Db } from "../db/client";
import { newId, nowIso } from "../db/client";
import { randomToken, sha256 } from "./tokens";

/* ==================================================================
   HOMERA — SESSIONS SERVEUR
   ------------------------------------------------------------------
   Le jeton de session est une chaîne aléatoire de 32 octets, posée
   dans un cookie `httpOnly` + `SameSite=Lax`. La base ne connaît que
   son empreinte : voler la base ne permet pas d’usurper une session.

   Aucune dépendance à Next ici : ce module est testable en Node pur.
   Le lien avec les cookies vit dans `lib/server/auth/cookies.ts`.
   ================================================================== */

export const SESSION_COOKIE = "homera_session";
export const REMEMBER_TTL_DAYS = 30;
export const SESSION_TTL_DAYS = 1;

export type SessionRow = {
  id: string;
  token_hash: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  user_agent: string;
  ip: string;
  revoked_at: string | null;
};

export function createSession(
  db: Db,
  input: { userId: string; remember?: boolean; userAgent?: string; ip?: string },
): { id: string; token: string; expiresAt: string } {
  const token = randomToken(32);
  const now = Date.now();
  const days = input.remember ? REMEMBER_TTL_DAYS : SESSION_TTL_DAYS;
  const id = newId("SES");
  db.prepare(
    `INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at, last_seen_at, user_agent, ip, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  ).run(
    id,
    sha256(token),
    input.userId,
    new Date(now).toISOString(),
    new Date(now + days * 86_400_000).toISOString(),
    new Date(now).toISOString(),
    (input.userAgent ?? "").slice(0, 300),
    (input.ip ?? "").slice(0, 60),
  );
  return { id, token, expiresAt: new Date(now + days * 86_400_000).toISOString() };
}

export function findSession(db: Db, token: string): SessionRow | null {
  if (!token) return null;
  const row = db
    .prepare<[string], SessionRow>("SELECT * FROM sessions WHERE token_hash = ?")
    .get(sha256(token)) as SessionRow | undefined;
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return row;
}

export function touchSession(db: Db, sessionId: string): void {
  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(nowIso(), sessionId);
}

export function revokeSession(db: Db, token: string): boolean {
  const result = db
    .prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .run(nowIso(), sha256(token));
  return result.changes > 0;
}

export function revokeUserSessions(db: Db, userId: string, exceptToken?: string): number {
  if (exceptToken) {
    const result = db
      .prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND token_hash <> ?")
      .run(nowIso(), userId, sha256(exceptToken));
    return result.changes;
  }
  const result = db
    .prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
    .run(nowIso(), userId);
  return result.changes;
}

export function purgeExpiredSessions(db: Db): number {
  const result = db
    .prepare("DELETE FROM sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)")
    .run(nowIso(), new Date(Date.now() - 30 * 86_400_000).toISOString());
  return result.changes;
}

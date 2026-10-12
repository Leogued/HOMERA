import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/* ==================================================================
   HOMERA — JETONS ET CODES À USAGE UNIQUE
   ------------------------------------------------------------------
   Deux objets différents, deux usages distincts :

   • `code`  : 6 chiffres, saisis à la main (vérification d’e-mail,
     réinitialisation). 5 essais, 15 minutes.
   • `token` : chaîne longue, transportée par lien (réinitialisation).
     Un seul usage.

   Dans les deux cas la base ne conserve qu’une empreinte SHA-256 : la
   lecture de la base ne donne aucun accès.
   ================================================================== */

export const CODE_TTL_MINUTES = 15;
export const RESET_TOKEN_TTL_MINUTES = 60;
export const MAX_CODE_ATTEMPTS = 5;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

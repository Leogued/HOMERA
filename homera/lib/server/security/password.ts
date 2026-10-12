import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/* ==================================================================
   HOMERA — MOTS DE PASSE
   ------------------------------------------------------------------
   scrypt (Node natif) : aucune dépendance, coût mémoire réel, sel
   unique par compte. On ne stocke jamais le mot de passe, ni en clair,
   ni de façon réversible.

   Les paramètres sont enregistrés avec l’empreinte : ils pourront être
   durcis plus tard sans invalider les comptes existants (on conserve
   `password_params` par utilisateur).
   ================================================================== */

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export const PASSWORD_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export function passwordParamsJson(): string {
  return JSON.stringify(PASSWORD_PARAMS);
}

function optionsFor(params: { N: number; r: number; p: number }) {
  // scrypt refuse les petites valeurs de maxmem : on laisse ~128 Mo.
  return { N: params.N, r: params.r, p: params.p, maxmem: 128 * 1024 * 1024 };
}

export function randomSalt(): string {
  return randomBytes(16).toString("hex");
}

export async function hashPassword(password: string, salt = randomSalt()): Promise<{
  hash: string;
  salt: string;
  params: string;
}> {
  const derived = await scrypt(password.normalize("NFKC"), salt, PASSWORD_PARAMS.keylen, optionsFor(PASSWORD_PARAMS));
  return { hash: derived.toString("hex"), salt, params: passwordParamsJson() };
}

export async function verifyPassword(
  password: string,
  record: { password_hash: string; password_salt: string; password_params?: string | null },
): Promise<boolean> {
  let params: { N: number; r: number; p: number; keylen: number } = PASSWORD_PARAMS;
  if (record.password_params) {
    try {
      const parsed = JSON.parse(record.password_params) as { N?: number; r?: number; p?: number };
      if (typeof parsed.N === "number" && typeof parsed.r === "number" && typeof parsed.p === "number") {
        params = { ...PASSWORD_PARAMS, N: parsed.N, r: parsed.r, p: parsed.p };
      }
    } catch {
      // Paramètres illisibles : on garde ceux du jour, l’empreinte reste la référence.
    }
  }
  const derived = await scrypt(
    password.normalize("NFKC"),
    record.password_salt,
    record.password_hash.length / 2,
    optionsFor(params),
  );
  const expected = Buffer.from(record.password_hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

/* ------------------------------------------------------------------
   POLITIQUE — annoncée à l’écran, appliquée ici
   ------------------------------------------------------------------ */

export type PasswordIssue = { ok: false; message: string } | { ok: true };

export const MIN_PASSWORD_LENGTH = 8;

export function checkPasswordPolicy(password: string): PasswordIssue {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Au moins ${MIN_PASSWORD_LENGTH} caractères.` };
  }
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return { ok: false, message: "Mélangez lettres et chiffres." };
  }
  if (/(.)\1{3,}/.test(password)) {
    return { ok: false, message: "Évitez les caractères répétés." };
  }
  return { ok: true };
}

/* Variante synchrone : réservée à l’amorçage de la base et aux tests,
   où l’on ne peut pas attendre une promesse au milieu d’une transaction. */
export function hashPasswordSync(password: string, salt = randomSalt()): {
  hash: string;
  salt: string;
  params: string;
} {
  const derived = scryptSync(password.normalize("NFKC"), salt, PASSWORD_PARAMS.keylen, optionsFor(PASSWORD_PARAMS));
  return { hash: derived.toString("hex"), salt, params: passwordParamsJson() };
}

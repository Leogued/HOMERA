import {
  VERIFICATION_TTL_MS,
  RESET_TTL_MS,
  ROLE_ORDER,
  generateCode,
  generateToken,
  isAccountRole,
  profileSnapshot,
  textValue,
  type AccountRole,
  type FormValues,
  type RandomSource,
} from "@/lib/auth";

/* ==================================================================
   HOMERA — COMPTES ET SESSION (stockage du navigateur)
   ------------------------------------------------------------------
   Phase 4 ouvre les comptes, mais aucun serveur ne les reçoit encore :
   le pilote n’a ni base de données ni service d’envoi d’e-mails. Les
   comptes vivent donc dans ce navigateur, exactement comme les favoris
   de la phase 2 — et l’interface le dit à chaque écran concerné.

   Ce que ce fichier garantit malgré tout, parce que ce sont de vraies
   règles et pas une mise en scène :

   • le mot de passe n’est jamais conservé en clair — une empreinte
     PBKDF2-SHA-256 (150 000 itérations, sel aléatoire par compte) est
     calculée dans le navigateur avec l’API Web Crypto ;
   • les données relues du stockage sont validées champ par champ ;
   • les codes de vérification et de réinitialisation expirent, et le
     nombre d’essais est réellement compté ;
   • la session expire, et « rester connecté » change réellement de
     support (sessionStorage vs localStorage).

   Ce que ce fichier ne prétend pas : une sécurité serveur. Un pilote
   sans serveur ne protège pas des données locales. La page /legal et
   chaque écran de compte le disent sans détour.
   ================================================================== */

export const ACCOUNTS_STORAGE_KEY = "homera.comptes.v1";
export const SESSION_STORAGE_KEY = "homera.session.v1";
export const ACCOUNTS_EVENT = "homera:comptes";
export const SESSION_EVENT = "homera:session";

/** Session « rester connecté » : 30 jours. Session simple : le temps de l’onglet. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Paramètre d’URL du lien de réinitialisation. */
export const RESET_PARAM = "jeton";

/* ------------------------------------------------------------------
   TYPES
   ------------------------------------------------------------------ */

export type PasswordRecord = {
  /** `webcrypto-pbkdf2` sur un contexte sécurisé ; `fallback-local` sinon (jamais silencieux). */
  kdf: "webcrypto-pbkdf2" | "fallback-local";
  salt: string;
  hash: string;
  iterations: number;
};

export type VerificationRecord = {
  code: string;
  expiresAt: number;
  /** Essais consommés — le compteur est réel, pas décoratif. */
  attempts: number;
  createdAt: number;
};

export type ResetRecord = {
  token: string;
  code: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
};

export type AccountRecord = {
  id: string;
  /** Rôle principal — celui de l’inscription. Toujours présent dans `roles`. */
  role: AccountRole;
  /**
   * Tous les rôles détenus, dans l’ordre du catalogue. Un compte
   * propriétaire ou agent inclut le compte client (voir lib/auth.ts) :
   * ajouter un rôle ne retire jamais les capacités des précédents.
   */
  roles: AccountRole[];
  prenom: string;
  nom: string;
  email: string;
  /** Adresse normalisée (minuscules) : la clé d’unicité et de connexion. */
  emailKey: string;
  telephone: string;
  /** Champs propres au rôle (projet, portefeuille, structure…) — texte brut validé. */
  profile: Record<string, string>;
  password: PasswordRecord;
  emailVerified: boolean;
  verification: VerificationRecord | null;
  reset: ResetRecord | null;
  /** Consentement facultatif : recevoir les alertes. */
  notify: boolean;
  consentAt: string;
  createdAt: string;
  updatedAt: string;
};

/** Vue publique : ni empreinte, ni code — c’est le seul objet qui circule dans l’interface. */
export type PublicAccount = {
  id: string;
  role: AccountRole;
  roles: AccountRole[];
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  profile: Record<string, string>;
  emailVerified: boolean;
  notify: boolean;
  createdAt: string;
};

export type SessionRecord = {
  accountId: string;
  startedAt: number;
  lastSeenAt: number;
  remember: boolean;
};

/** Ce que l’interface peut afficher du dernier code émis (pilote : aucun e-mail). */
export type PendingCode = {
  purpose: "verification" | "reset";
  email: string;
  code: string;
  expiresAt: number;
  /** Jeton du lien de réinitialisation, quand la demande vient de /mot-de-passe-oublie. */
  token?: string;
};

/* ------------------------------------------------------------------
   PARTIE PURE — lecture tolérante du stockage
   ------------------------------------------------------------------ */

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseVerification(raw: unknown): VerificationRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  const code = asString(candidate.code);
  if (!/^\d{6}$/.test(code)) return null;
  return {
    code,
    expiresAt: asNumber(candidate.expiresAt),
    attempts: Math.max(0, Math.floor(asNumber(candidate.attempts))),
    createdAt: asNumber(candidate.createdAt),
  };
}

function parseReset(raw: unknown): ResetRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  const token = asString(candidate.token);
  const code = asString(candidate.code);
  if (token.length < 16 || !/^\d{6}$/.test(code)) return null;
  return {
    token,
    code,
    expiresAt: asNumber(candidate.expiresAt),
    attempts: Math.max(0, Math.floor(asNumber(candidate.attempts))),
    createdAt: asNumber(candidate.createdAt),
  };
}

/** Rôles relus du stockage : valides, uniques, et incluant toujours le rôle principal. */
function parseRoles(raw: unknown, primary: AccountRole): AccountRole[] {
  const list = Array.isArray(raw) ? raw.filter((entry): entry is AccountRole => isAccountRole(entry)) : [];
  const roles = ROLE_ORDER.filter((role) => role === primary || list.includes(role));
  return roles.length > 0 ? roles : [primary];
}

function parsePassword(raw: unknown): PasswordRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  const salt = asString(candidate.salt);
  const hash = asString(candidate.hash);
  const kdf = candidate.kdf === "fallback-local" ? "fallback-local" : "webcrypto-pbkdf2";
  if (salt.length < 8 || hash.length < 16) return null;
  return { kdf, salt, hash, iterations: Math.max(1, Math.floor(asNumber(candidate.iterations, 1))) };
}

/** Ne fait jamais confiance à la forme stockée : tout élément douteux est écarté. */
export function parseAccounts(raw: unknown): AccountRecord[] {
  if (!Array.isArray(raw)) return [];
  const accounts: AccountRecord[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Record<string, unknown>;
    const id = asString(candidate.id);
    const email = asString(candidate.email);
    const password = parsePassword(candidate.password);
    if (id === "" || email === "" || !password) continue;
    if (!isAccountRole(candidate.role)) continue;
    const profileRaw = candidate.profile;
    const profile: Record<string, string> = {};
    if (typeof profileRaw === "object" && profileRaw !== null) {
      for (const [key, value] of Object.entries(profileRaw as Record<string, unknown>)) {
        if (typeof value === "string") profile[key] = value;
      }
    }
    accounts.push({
      id,
      role: candidate.role,
      roles: parseRoles(candidate.roles, candidate.role),
      prenom: asString(candidate.prenom),
      nom: asString(candidate.nom),
      email,
      emailKey: normalizeEmail(asString(candidate.emailKey) || email),
      telephone: asString(candidate.telephone),
      profile,
      password,
      emailVerified: candidate.emailVerified === true,
      verification: parseVerification(candidate.verification),
      reset: parseReset(candidate.reset),
      notify: candidate.notify === true,
      consentAt: asString(candidate.consentAt),
      createdAt: asString(candidate.createdAt),
      updatedAt: asString(candidate.updatedAt),
    });
  }
  return accounts;
}

export function parseSession(raw: unknown): SessionRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  const accountId = asString(candidate.accountId);
  if (accountId === "") return null;
  const startedAt = asNumber(candidate.startedAt);
  if (startedAt <= 0) return null;
  return {
    accountId,
    startedAt,
    lastSeenAt: asNumber(candidate.lastSeenAt, startedAt),
    remember: candidate.remember === true,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findAccountByEmail(accounts: AccountRecord[], email: string): AccountRecord | undefined {
  const key = normalizeEmail(email);
  return accounts.find((account) => account.emailKey === key);
}

export function findAccountById(accounts: AccountRecord[], id: string): AccountRecord | undefined {
  return accounts.find((account) => account.id === id);
}

export function publicAccount(record: AccountRecord): PublicAccount {
  return {
    id: record.id,
    role: record.role,
    roles: record.roles,
    prenom: record.prenom,
    nom: record.nom,
    email: record.email,
    telephone: record.telephone,
    profile: record.profile,
    emailVerified: record.emailVerified,
    notify: record.notify,
    createdAt: record.createdAt,
  };
}

/** Remplace un compte par son identifiant, sans jamais en ajouter un au passage. */
export function replaceAccount(accounts: AccountRecord[], next: AccountRecord): AccountRecord[] {
  return accounts.map((account) => (account.id === next.id ? next : account));
}

export function sessionIsValid(session: SessionRecord | null, now: number): boolean {
  if (!session) return false;
  if (!session.remember) return true; // sessionStorage : la durée de vie de l’onglet suffit.
  return now - session.startedAt < SESSION_TTL_MS;
}

/** Vrai si le port de stockage disponible est bien celui attendu — sert à expliquer un échec. */
export function sessionSupport(remember: boolean): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return remember ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------
   SESSION
   ------------------------------------------------------------------ */

export function readSession(): SessionRecord | null {
  if (typeof window === "undefined") return null;
  for (const storage of [safeStorage("session"), safeStorage("local")]) {
    if (!storage) continue;
    try {
      const raw = storage.getItem(SESSION_STORAGE_KEY);
      if (!raw) continue;
      const session = parseSession(JSON.parse(raw));
      if (session && sessionIsValid(session, Date.now())) return session;
    } catch {
      // Stockage indisponible ou donnée abîmée : on essaie le suivant.
    }
  }
  return null;
}

export function writeSession(session: SessionRecord, remember: boolean): void {
  if (typeof window === "undefined") return;
  const target = sessionSupport(remember);
  if (!target) return;
  try {
    clearSession();
    target.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
  } catch {
    // Le stockage est un confort, pas une condition de fonctionnement.
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  for (const storage of [safeStorage("session"), safeStorage("local")]) {
    try {
      storage?.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Rien à faire : l’absence de session est déjà l’état visé.
    }
  }
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: null }));
}

function safeStorage(kind: "session" | "local"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------
   COMPTES — lecture / écriture
   ------------------------------------------------------------------ */

export function readAccounts(): AccountRecord[] {
  if (typeof window === "undefined") return [];
  const storage = safeStorage("local");
  if (!storage) return [];
  try {
    const raw = storage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    return parseAccounts(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeAccounts(accounts: AccountRecord[]): void {
  if (typeof window === "undefined") return;
  const storage = safeStorage("local");
  if (!storage) return;
  try {
    storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent(ACCOUNTS_EVENT, { detail: accounts }));
  } catch {
    // Quota atteint ou navigation privée stricte : l’appelant décide quoi dire.
  }
}

/** Vrai quand un compte peut réellement être conservé — vérifié avant l’inscription. */
export function storageWritable(): boolean {
  if (typeof window === "undefined") return false;
  const storage = safeStorage("local");
  if (!storage) return false;
  try {
    const probe = `${ACCOUNTS_STORAGE_KEY}.probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------
   CRYPTOGRAPHIE LOCALE
   ------------------------------------------------------------------ */

/** 150 000 itérations : le navigateur calcule en une fraction de seconde, un rejeu coûte cher. */
export const PBKDF2_ITERATIONS = 150_000;

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

function bytesFromHex(value: string): Uint8Array<ArrayBuffer> {
  const clean = value.length % 2 === 0 ? value : `${value}0`;
  const output = new Uint8Array(new ArrayBuffer(clean.length / 2));
  for (let index = 0; index < output.length; index++) {
    output[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

function randomHex(bytes: number, random: RandomSource = Math.random): string {
  let value = "";
  while (value.length < bytes * 2) {
    value += Math.floor(random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  }
  return value.slice(0, bytes * 2);
}

function webCrypto(): Crypto | null {
  try {
    return typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle ? globalThis.crypto : null;
  } catch {
    return null;
  }
}

/**
 * Empreinte de secours, hors contexte sécurisé (http sans localhost).
 * Elle n’est PAS cryptographique : le compte la marque comme telle et
 * l’interface prévient que la protection locale est réduite.
 */
function fallbackDigest(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xc2b2ae35;
  for (let index = 0; index < input.length; index++) {
    const code = input.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ (code + index), 2246822519) >>> 0;
  }
  const block = `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
  return block.repeat(4);
}

export async function hashPassword(
  password: string,
  options: { salts?: RandomSource; iterations?: number } = {},
): Promise<PasswordRecord> {
  const salt = randomHex(16, options.salts);
  const iterations = options.iterations ?? PBKDF2_ITERATIONS;
  const crypto = webCrypto();
  if (!crypto) {
    return { kdf: "fallback-local", salt, hash: fallbackDigest(`${salt}:${password}`), iterations: 1 };
  }
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
      "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: bytesFromHex(salt), iterations },
      key,
      256,
    );
    return { kdf: "webcrypto-pbkdf2", salt, hash: hex(new Uint8Array(bits)), iterations };
  } catch {
    return { kdf: "fallback-local", salt, hash: fallbackDigest(`${salt}:${password}`), iterations: 1 };
  }
}

/** Comparaison à temps constant : deux empreintes ne se comparent pas avec `===`. */
export function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyPassword(record: PasswordRecord, password: string): Promise<boolean> {
  if (record.kdf === "fallback-local") {
    return safeEqual(fallbackDigest(`${record.salt}:${password}`), record.hash);
  }
  const crypto = webCrypto();
  if (!crypto) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
      "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: bytesFromHex(record.salt), iterations: record.iterations },
      key,
      256,
    );
    return safeEqual(hex(new Uint8Array(bits)), record.hash);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------
   FABRICATION DES COMPTES
   ------------------------------------------------------------------ */

const ROLE_PREFIX: Record<AccountRole, string> = {
  client: "CLI",
  proprietaire: "PRO",
  agent: "AGE",
};

/** Identifiant lisible : HOM-COM-4F2K9. Unique à l’échelle du navigateur. */
export function accountId(role: AccountRole, random: RandomSource = Math.random, taken: string[] = []): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = Math.floor(random() * 0xffffff)
      .toString(36)
      .toUpperCase()
      .padStart(5, "0");
    const candidate = `HOM-${ROLE_PREFIX[role]}-${suffix}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `HOM-${ROLE_PREFIX[role]}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

export type NewAccountInput = {
  role: AccountRole;
  values: FormValues;
  takenIds?: string[];
  random?: RandomSource;
  /** Horodatage injectable : les tests n’attendent pas l’horloge réelle. */
  now?: number;
};

export async function createAccountRecord(input: NewAccountInput): Promise<AccountRecord> {
  const { role, values } = input;
  const now = input.now ?? Date.now();
  const iso = new Date(now).toISOString();
  const email = textValue(values, "email");
  const verification: VerificationRecord = {
    code: generateCode(input.random),
    expiresAt: now + VERIFICATION_TTL_MS,
    attempts: 0,
    createdAt: now,
  };
  return {
    id: accountId(role, input.random, input.takenIds ?? []),
    role,
    roles: [role],
    prenom: textValue(values, "prenom"),
    nom: textValue(values, "nom"),
    email,
    emailKey: normalizeEmail(email),
    telephone: textValue(values, "telephone"),
    profile: profileSnapshot(role, values),
    password: await hashPassword(textValue(values, "motDePasse")),
    emailVerified: false,
    verification,
    reset: null,
    notify: values.alertes === true,
    consentAt: iso,
    createdAt: iso,
    updatedAt: iso,
  };
}

/**
 * Ajoute un rôle à un compte existant : le profil du nouveau rôle est
 * fusionné à l’ancien (aucun champ écrasé), et le rôle rejoint la liste
 * des rôles détenus. Le rôle principal ne change pas — l’historique du
 * compte reste lisible.
 */
export function withAddedRole(
  record: AccountRecord,
  role: AccountRole,
  values: FormValues,
  now = Date.now(),
): AccountRecord {
  const roles = ROLE_ORDER.filter(
    (entry) => entry === record.role || record.roles.includes(entry) || entry === role,
  );
  const iso = new Date(now).toISOString();
  return {
    ...record,
    roles,
    profile: { ...record.profile, ...profileSnapshot(role, values) },
    consentAt: iso,
    updatedAt: iso,
  };
}

/* ------------------------------------------------------------------
   CODES — émission, consommation, expiration
   ------------------------------------------------------------------ */

export function issueVerification(now = Date.now(), random: RandomSource = Math.random): VerificationRecord {
  return { code: generateCode(random), expiresAt: now + VERIFICATION_TTL_MS, attempts: 0, createdAt: now };
}

export function issueReset(now = Date.now(), random: RandomSource = Math.random): ResetRecord {
  return {
    token: generateToken(random),
    code: generateCode(random),
    expiresAt: now + RESET_TTL_MS,
    attempts: 0,
    createdAt: now,
  };
}

/* ------------------------------------------------------------------
   ÉVÉNEMENTS — l’interface écoute ces deux noms
   ------------------------------------------------------------------ */

export const ACCOUNT_EVENTS = [ACCOUNTS_EVENT, SESSION_EVENT] as const;

import type { Db } from "../db/client";
import { newId, nowIso, queryOne } from "../db/client";
import {
  CODE_TTL_MINUTES,
  MAX_CODE_ATTEMPTS,
  RESET_TOKEN_TTL_MINUTES,
  minutesFromNow,
  randomCode,
  randomToken,
  sha256,
} from "../security/tokens";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "../security/password";
import { createSession, revokeUserSessions } from "../security/session";
import {
  ROLE_AGENT,
  ROLE_CLIENT,
  ROLE_OWNER,
  defaultLanding,
  loadUserContext,
  type AccountRole,
  type ServerRole,
  type UserContext,
} from "../authz";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import type { ServerAccount } from "../contracts";
import {
  isEmail,
  profileSnapshot,
  validateEmailOnly,
  validateNewPassword,
  validateRoleUpgrade,
  validateSignUp,
  type FormValues,
} from "../../auth";

/* ==================================================================
   HOMERA — COMPTES (service serveur)
   ------------------------------------------------------------------
   Les règles de saisie viennent de `lib/auth.ts` : exactement les mêmes
   que celles affichées par les formulaires. Le serveur ne réécrit pas
   une seconde vérité, il applique la première.

   Chaque action notable est journalisée et, quand elle concerne
   plusieurs acteurs, notifiée dans la même transaction.
   ================================================================== */

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields?: Record<string, string>; code?: string };

const ROLE_PREFIX: Record<AccountRole, string> = { client: "CLI", proprietaire: "PRO", agent: "AGE" };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateAccountId(db: Db, role: AccountRole): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.floor(Math.random() * 0xffffff).toString(36).toUpperCase().padStart(5, "0");
    const candidate = `HOM-${ROLE_PREFIX[role]}-${suffix}`;
    const exists = queryOne<{ id: string }>("SELECT id FROM users WHERE id = ?", [candidate]);
    if (!exists) return candidate;
  }
  return `HOM-${ROLE_PREFIX[role]}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

function generateMatricule(db: Db): string {
  const existsStmt = db.prepare<[string], { matricule: string }>("SELECT matricule FROM agents WHERE matricule = ?");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const digits = String(Math.floor(Math.random() * 9000) + 1000);
    const candidate = `AG-HOM-${digits}`;
    const exists = existsStmt.get(candidate);
    if (!exists) return candidate;
  }
  return `AG-HOM-${Date.now().toString().slice(-4)}`;
}

/* ------------------------------------------------------------------
   VUE PUBLIQUE
   ------------------------------------------------------------------ */

export function publicAccount(context: UserContext): ServerAccount {
  const roles = context.accountRoles;
  return {
    id: context.id,
    role: roles.includes(ROLE_OWNER) ? ROLE_OWNER : roles.includes(ROLE_AGENT) ? ROLE_AGENT : ROLE_CLIENT,
    roles,
    admin: context.roles.includes("admin") || context.roles.includes("superadmin"),
    superAdmin: context.roles.includes("superadmin"),
    prenom: context.prenom,
    nom: context.nom,
    email: context.email,
    telephone: context.telephone,
    profile: { ...context.profile },
    emailVerified: context.emailVerified,
    notify: context.notify,
    createdAt: context.createdAt,
  };
}

/* ------------------------------------------------------------------
   TENTATIVES — limitation du débit
   ------------------------------------------------------------------ */

const MAX_FAILURES = 5;
const FAILURE_WINDOW_MINUTES = 15;

export function registerAttempt(db: Db, emailKey: string, success: boolean, ip = ""): void {
  db.prepare("INSERT INTO login_attempts (id, email_key, ip, success, created_at) VALUES (?, ?, ?, ?, ?)").run(
    newId("ATT"),
    emailKey,
    ip.slice(0, 60),
    success ? 1 : 0,
    nowIso(),
  );
}

export function lockoutState(db: Db, emailKey: string): { locked: boolean; remaining: number; retryAt: string | null } {
  const since = new Date(Date.now() - FAILURE_WINDOW_MINUTES * 60_000).toISOString();
  const rows = db
    .prepare<[string, string], { success: number; created_at: string }>(
      "SELECT success, created_at FROM login_attempts WHERE email_key = ? AND created_at >= ? ORDER BY created_at DESC",
    )
    .all(emailKey, since);
  let failures = 0;
  let lastFailure: string | null = null;
  for (const row of rows) {
    if (row.success === 1) break;
    failures += 1;
    lastFailure = lastFailure ?? row.created_at;
  }
  if (failures < MAX_FAILURES || !lastFailure) return { locked: false, remaining: 0, retryAt: null };
  const retryAt = new Date(new Date(lastFailure).getTime() + FAILURE_WINDOW_MINUTES * 60_000).toISOString();
  return {
    locked: new Date(retryAt).getTime() > Date.now(),
    remaining: Math.max(0, MAX_FAILURES - failures),
    retryAt,
  };
}

export function clearAttempts(db: Db, emailKey: string): void {
  db.prepare("DELETE FROM login_attempts WHERE email_key = ?").run(emailKey);
}

/* ------------------------------------------------------------------
   INSCRIPTION
   ------------------------------------------------------------------ */

export type SignUpInput = {
  role: AccountRole;
  values: FormValues;
  ip?: string;
  userAgent?: string;
  remember?: boolean;
};

export type SignUpData = {
  account: ServerAccount;
  /** Destination d’atterrissage : l’espace le plus métier détenu. */
  landing: string;
  sessionToken: string;
  sessionExpiresAt: string;
  code: string;
  codeExpiresAt: number;
  emailSent: boolean;
};

export async function signUp(db: Db, input: SignUpInput): Promise<ServiceResult<SignUpData>> {
  const validation = validateSignUp(input.role, input.values);
  if (!validation.ok) {
    return {
      ok: false,
      message: validation.form ?? "Quelques informations restent à corriger.",
      fields: validation.fields,
    };
  }

  const email = String(input.values.email ?? "").trim();
  const emailKey = normalizeEmail(email);
  const existing = queryOne<{ id: string }>("SELECT id FROM users WHERE email_key = ?", [emailKey]);
  if (existing) {
    return {
      ok: false,
      message: "Un compte existe déjà avec cette adresse.",
      fields: { email: "Cette adresse possède déjà un compte. Connectez-vous ou réinitialisez le mot de passe." },
    };
  }

  const password = String(input.values.motDePasse ?? "");
  const policy = checkPasswordPolicy(password);
  if (!policy.ok) {
    return { ok: false, message: "Mot de passe trop faible.", fields: { motDePasse: policy.message } };
  }

  const id = generateAccountId(db, input.role);
  const iso = nowIso();
  const { hash, salt, params } = await hashPassword(password);
  const profile = profileSnapshot(input.role, input.values);
  const notifyWanted = input.values.alertes === true;
  const code = randomCode();
  const codeExpiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, email_key, prenom, nom, telephone, password_hash, password_algo, password_salt,
                          password_params, email_verified, notify, status, last_login_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scrypt', ?, ?, 0, ?, 'actif', ?, ?, ?)`,
    ).run(
      id,
      email,
      emailKey,
      String(input.values.prenom ?? "").trim(),
      String(input.values.nom ?? "").trim(),
      String(input.values.telephone ?? "").trim(),
      hash,
      salt,
      params,
      notifyWanted ? 1 : 0,
      iso,
      iso,
      iso,
    );
    grantRole(db, id, input.role, id, iso);
    grantRole(db, id, ROLE_CLIENT, id, iso);
    for (const [key, value] of Object.entries(profile)) {
      db.prepare("INSERT OR REPLACE INTO user_profiles (user_id, key, value) VALUES (?, ?, ?)").run(id, key, value);
    }
    if (input.role === ROLE_AGENT) {
      db.prepare(
        `INSERT INTO agents (user_id, matricule, agency_id, structure, identification, zone, experience,
                             verification_status, verified_at, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, 'non-verifie', NULL, ?, ?)`,
      ).run(
        id,
        generateMatricule(db),
        String(input.values.structure ?? "").trim(),
        String(input.values.identification ?? "").trim(),
        String(input.values.zoneExercice ?? "").trim(),
        String(input.values.experience ?? "").trim(),
        iso,
        iso,
      );
    }
    db.prepare(
      "INSERT INTO auth_tokens (id, user_id, purpose, code_hash, token_hash, expires_at, attempts, consumed_at, created_at) VALUES (?, ?, 'verification', ?, NULL, ?, 0, NULL, ?)",
    ).run(newId("TOK"), id, sha256(code), codeExpiresAt, iso);
    writeAudit(db, {
      actorId: id,
      actorLabel: email,
      action: "compte.inscription",
      entityType: "utilisateur",
      entityId: id,
      detail: { role: input.role, emailVerified: false },
      ip: input.ip,
    });
    notify(db, {
      userIds: [id],
      type: "compte",
      title: "Bienvenue sur HOMERA",
      body: "Confirmez votre adresse e-mail pour activer toutes les fonctions de votre espace.",
      link: "/verification-email",
      entityType: "utilisateur",
      entityId: id,
    });
  });
  run();

  // La session n’existe qu’après l’insertion du compte : la clé étrangère
  // `sessions.user_id` serait violée autrement.
  const session = createSession(db, { userId: id, remember: input.remember ?? true, userAgent: input.userAgent, ip: input.ip });
  const context = loadUserContext(db, id)!;
  return {
    ok: true,
    data: {
      account: publicAccount(context),
      landing: defaultLanding(context.roles),
      sessionToken: session.token,
      sessionExpiresAt: session.expiresAt,
      code,
      codeExpiresAt: new Date(codeExpiresAt).getTime(),
      emailSent: false,
    },
  };
}

/* ------------------------------------------------------------------
   CONNEXION
   ------------------------------------------------------------------ */

export type SignInInput = {
  email: string;
  password: string;
  remember?: boolean;
  ip?: string;
  userAgent?: string;
};

export type SignInData = {
  account: ServerAccount;
  landing: string;
  sessionToken: string;
  sessionExpiresAt: string;
  needsVerification: boolean;
};

export async function signIn(db: Db, input: SignInInput): Promise<ServiceResult<SignInData>> {
  const email = input.email.trim();
  const emailKey = normalizeEmail(email);
  if (!isEmail(email)) {
    return { ok: false, message: "Cette adresse semble incomplète.", fields: { email: "Vérifiez l’adresse saisie." } };
  }
  const lock = lockoutState(db, emailKey);
  if (lock.locked) {
    return {
      ok: false,
      code: "verrouille",
      message:
        "Trop d’essais infructueux sur cette adresse. Réessayez dans quelques minutes ou réinitialisez votre mot de passe.",
    };
  }
  const row = queryOne<{ id: string; password_hash: string; password_salt: string; password_params: string; status: string }>(
    "SELECT id, password_hash, password_salt, password_params, status FROM users WHERE email_key = ?",
    [emailKey],
  );
  const valid = row ? await verifyPassword(input.password, row) : false;
  if (!row || !valid) {
    registerAttempt(db, emailKey, false, input.ip);
    writeAudit(db, {
      actorLabel: emailKey,
      action: "compte.connexion.echouee",
      entityType: "utilisateur",
      entityId: row?.id ?? "",
      detail: { raison: row ? "mot-de-passe" : "compte-inconnu" },
      ip: input.ip,
    });
    const state = lockoutState(db, emailKey);
    return {
      ok: false,
      message:
        state.remaining <= 1
          ? "Adresse ou mot de passe incorrect. Encore un essai avant le blocage temporaire."
          : "Adresse ou mot de passe incorrect.",
      // Le champ fautif est marqué sans répéter le message : l’affichage
      // garde une seule phrase, sur le formulaire.
      fields: { motDePasse: "Adresse ou mot de passe incorrect." },
    };
  }
  if (row.status !== "actif") {
    return {
      ok: false,
      code: "suspendu",
      message: "Ce compte est suspendu. Contactez l’équipe HOMERA pour rétablir l’accès.",
    };
  }

  registerAttempt(db, emailKey, true, input.ip);
  clearAttempts(db, emailKey);
  const session = createSession(db, {
    userId: row.id,
    remember: input.remember ?? true,
    userAgent: input.userAgent,
    ip: input.ip,
  });
  db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), row.id);
  writeAudit(db, {
    actorId: row.id,
    actorLabel: emailKey,
    action: "compte.connexion",
    entityType: "utilisateur",
    entityId: row.id,
    ip: input.ip,
  });
  const context = loadUserContext(db, row.id)!;
  return {
    ok: true,
    data: {
      account: publicAccount(context),
      landing: defaultLanding(context.roles),
      sessionToken: session.token,
      sessionExpiresAt: session.expiresAt,
      needsVerification: !context.emailVerified,
    },
  };
}

/* ------------------------------------------------------------------
   VÉRIFICATION D’ADRESSE
   ------------------------------------------------------------------ */

export function issueVerificationCode(
  db: Db,
  userId: string,
  email?: string,
): { code: string; expiresAt: number } | null {
  const iso = nowIso();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
  const code = randomCode();
  db.prepare("UPDATE auth_tokens SET consumed_at = ? WHERE user_id = ? AND purpose = 'verification' AND consumed_at IS NULL").run(
    iso,
    userId,
  );
  db.prepare(
    "INSERT INTO auth_tokens (id, user_id, purpose, code_hash, token_hash, expires_at, attempts, consumed_at, created_at) VALUES (?, ?, 'verification', ?, NULL, ?, 0, NULL, ?)",
  ).run(newId("TOK"), userId, sha256(code), expiresAt, iso);
  writeAudit(db, {
    actorId: userId,
    actorLabel: email ?? userId,
    action: "compte.code.verification",
    entityType: "utilisateur",
    entityId: userId,
  });
  return { code, expiresAt: new Date(expiresAt).getTime() };
}

export function verifyEmailCode(db: Db, userId: string, code: string): ServiceResult<{ account: ServerAccount }> {
  const token = queryOne<{ id: string; code_hash: string; expires_at: string; attempts: number; consumed_at: string | null }>(
    "SELECT id, code_hash, expires_at, attempts, consumed_at FROM auth_tokens WHERE user_id = ? AND purpose = 'verification' AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  if (!token) return { ok: false, message: "Aucun code en attente. Demandez à en recevoir un nouveau." };
  if (token.attempts >= MAX_CODE_ATTEMPTS) {
    return { ok: false, message: "Trop d’essais : ce code n’est plus valide. Demandez un nouveau code." };
  }
  if (new Date(token.expires_at).getTime() <= Date.now()) {
    return { ok: false, message: "Ce code a expiré. Demandez un nouveau code." };
  }
  if (sha256(code.trim()) !== token.code_hash) {
    db.prepare("UPDATE auth_tokens SET attempts = attempts + 1 WHERE id = ?").run(token.id);
    const left = MAX_CODE_ATTEMPTS - (token.attempts + 1);
    return {
      ok: false,
      fields: { code: "Code incorrect." },
      message: left > 0 ? `Code incorrect. Il reste ${left} essai${left > 1 ? "s" : ""}.` : "Trop d’essais : demandez un nouveau code.",
    };
  }
  const iso = nowIso();
  db.prepare("UPDATE auth_tokens SET consumed_at = ? WHERE id = ?").run(iso, token.id);
  db.prepare("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?").run(iso, userId);
  writeAudit(db, {
    actorId: userId,
    action: "compte.email.verifie",
    entityType: "utilisateur",
    entityId: userId,
  });
  const context = loadUserContext(db, userId);
  if (!context) return { ok: false, message: "Compte introuvable." };
  return { ok: true, data: { account: publicAccount(context) } };
}

/* ------------------------------------------------------------------
   RÉINITIALISATION DU MOT DE PASSE
   ------------------------------------------------------------------ */

export function requestPasswordReset(
  db: Db,
  email: string,
  ip?: string,
): ServiceResult<{ email: string; code: string; token: string; expiresAt: number; known: boolean }> {
  const error = validateEmailOnly(email);
  if (error) return { ok: false, message: error, fields: { email: error } };
  const emailKey = normalizeEmail(email);
  const row = queryOne<{ id: string }>("SELECT id FROM users WHERE email_key = ?", [emailKey]);
  if (!row) {
    // On ne révèle pas l’existence du compte, mais on ne prétend pas non plus
    // avoir envoyé quelque chose : le message le dit.
    return {
      ok: true,
      data: { email, code: "", token: "", expiresAt: Date.now(), known: false },
    };
  }
  const code = randomCode();
  const token = randomToken(24);
  const expiresAt = minutesFromNow(RESET_TOKEN_TTL_MINUTES);
  const iso = nowIso();
  db.prepare("UPDATE auth_tokens SET consumed_at = ? WHERE user_id = ? AND purpose = 'reset' AND consumed_at IS NULL").run(
    iso,
    row.id,
  );
  db.prepare(
    "INSERT INTO auth_tokens (id, user_id, purpose, code_hash, token_hash, expires_at, attempts, consumed_at, created_at) VALUES (?, ?, 'reset', ?, ?, ?, 0, NULL, ?)",
  ).run(newId("TOK"), row.id, sha256(code), sha256(token), expiresAt, iso);
  writeAudit(db, {
    actorId: row.id,
    actorLabel: emailKey,
    action: "compte.reinitialisation.demande",
    entityType: "utilisateur",
    entityId: row.id,
    ip,
  });
  notify(db, {
    userIds: [row.id],
    type: "securite",
    title: "Demande de réinitialisation",
    body: "Une demande de nouveau mot de passe a été ouverte sur votre compte.",
    link: "/reinitialisation",
    entityType: "utilisateur",
    entityId: row.id,
  });
  return {
    ok: true,
    data: { email, code, token, expiresAt: new Date(expiresAt).getTime(), known: true },
  };
}

export async function resetPassword(
  db: Db,
  input: { token?: string; code?: string; password: string; confirmation: string },
): Promise<ServiceResult<{ email: string }>> {
  const validation = validateNewPassword(input.password, input.confirmation);
  if (!validation.ok) {
    return {
      ok: false,
      message: validation.form ?? "Le nouveau mot de passe n’est pas valide.",
      fields: validation.fields,
    };
  }
  const policy = checkPasswordPolicy(input.password);
  if (!policy.ok) return { ok: false, message: policy.message, fields: { motDePasse: policy.message } };

  const token = input.token ? sha256(input.token) : null;
  const code = input.code ? sha256(input.code.trim()) : null;
  if (!token && !code) return { ok: false, message: "Lien ou code de réinitialisation manquant." };

  const row = queryOne<{ id: string; user_id: string; attempts: number; expires_at: string; code_hash: string | null; token_hash: string | null }>(
    `SELECT id, user_id, attempts, expires_at, code_hash, token_hash FROM auth_tokens
     WHERE purpose = 'reset' AND consumed_at IS NULL
       AND ((? IS NOT NULL AND token_hash = ?) OR (? IS NOT NULL AND code_hash = ?))
     ORDER BY created_at DESC LIMIT 1`,
    [token, token, code, code],
  );
  if (!row) return { ok: false, message: "Ce lien ou ce code n’est plus valide. Faites une nouvelle demande." };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, message: "Cette demande a expiré. Faites une nouvelle demande." };
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    return { ok: false, message: "Trop d’essais. Faites une nouvelle demande." };
  }

  const { hash, salt, params } = await hashPassword(input.password);
  const iso = nowIso();
  const run = db.transaction(() => {
    db.prepare(
      "UPDATE users SET password_hash = ?, password_salt = ?, password_params = ?, updated_at = ? WHERE id = ?",
    ).run(hash, salt, params, iso, row.user_id);
    db.prepare("UPDATE auth_tokens SET consumed_at = ? WHERE id = ?").run(iso, row.id);
    // Un mot de passe changé : toutes les sessions déjà ouvertes sont fermées.
    revokeUserSessions(db, row.user_id);
    writeAudit(db, {
      actorId: row.user_id,
      action: "compte.reinitialisation.appliquee",
      entityType: "utilisateur",
      entityId: row.user_id,
    });
    notify(db, {
      userIds: [row.user_id],
      type: "securite",
      title: "Mot de passe mis à jour",
      body: "Votre mot de passe a été changé et les autres sessions ont été fermées.",
      link: "/connexion",
      entityType: "utilisateur",
      entityId: row.user_id,
    });
  });
  run();
  const context = loadUserContext(db, row.user_id);
  return { ok: true, data: { email: context?.email ?? "" } };
}

/* ------------------------------------------------------------------
   RÔLES
   ------------------------------------------------------------------ */

export function grantRole(db: Db, userId: string, role: ServerRole, grantedBy?: string, at = nowIso()): void {
  db.prepare(
    "INSERT OR IGNORE INTO user_roles (user_id, role, granted_at, granted_by) VALUES (?, ?, ?, ?)",
  ).run(userId, role, at, grantedBy ?? null);
}

export function revokeRole(db: Db, userId: string, role: ServerRole): void {
  db.prepare("DELETE FROM user_roles WHERE user_id = ? AND role = ?").run(userId, role);
}

export type AddRoleInput = {
  userId: string;
  role: AccountRole;
  values: FormValues;
  ip?: string;
};

/** Ajouter un rôle métier : identité et mot de passe conservés, profil complété. */
export async function addRole(db: Db, input: AddRoleInput): Promise<ServiceResult<{ account: ServerAccount }>> {
  const validation = validateRoleUpgrade(input.role, input.values);
  if (!validation.ok) {
    return {
      ok: false,
      message: validation.form ?? "Quelques informations restent à compléter.",
      fields: validation.fields,
    };
  }
  const context = loadUserContext(db, input.userId);
  if (!context) return { ok: false, message: "Compte introuvable." };
  if (context.accountRoles.includes(input.role)) {
    return { ok: false, message: `Vous disposez déjà du rôle ${input.role}.` };
  }
  const iso = nowIso();
  const profile = profileSnapshot(input.role, input.values);
  const run = db.transaction(() => {
    grantRole(db, input.userId, input.role, input.userId, iso);
    grantRole(db, input.userId, ROLE_CLIENT, input.userId, iso);
    for (const [key, value] of Object.entries(profile)) {
      if (!value) continue;
      db.prepare("INSERT OR REPLACE INTO user_profiles (user_id, key, value) VALUES (?, ?, ?)").run(input.userId, key, value);
    }
    if (input.role === ROLE_AGENT) {
      const existing = queryOne<{ user_id: string }>("SELECT user_id FROM agents WHERE user_id = ?", [input.userId]);
      if (!existing) {
        db.prepare(
          `INSERT INTO agents (user_id, matricule, agency_id, structure, identification, zone, experience,
                               verification_status, verified_at, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, ?, ?, 'non-verifie', NULL, ?, ?)`,
        ).run(
          input.userId,
          generateMatricule(db),
          String(input.values.structure ?? "").trim(),
          String(input.values.identification ?? "").trim(),
          String(input.values.zoneExercice ?? "").trim(),
          String(input.values.experience ?? "").trim(),
          iso,
          iso,
        );
      }
    }
    writeAudit(db, {
      actorId: input.userId,
      actorLabel: context.email,
      action: "compte.role.ajoute",
      entityType: "utilisateur",
      entityId: input.userId,
      detail: { role: input.role },
      ip: input.ip,
    });
  });
  run();
  const updated = loadUserContext(db, input.userId)!;
  return { ok: true, data: { account: publicAccount(updated) } };
}

/** Attribuer un rôle d’administration — réservé au super-administrateur. */
export function setStaffRole(
  db: Db,
  input: { actor: UserContext; userId: string; role: "admin" | "superadmin" | null },
): ServiceResult<{ account: ServerAccount }> {
  if (!input.actor.roles.includes("superadmin")) {
    return { ok: false, code: "permission", message: "Seul un super-administrateur peut modifier les accès d’administration." };
  }
  if (input.userId === input.actor.id && input.role === null) {
    return { ok: false, message: "Vous ne pouvez pas retirer votre propre accès d’administration." };
  }
  const iso = nowIso();
  db.transaction(() => {
    revokeRole(db, input.userId, "admin");
    revokeRole(db, input.userId, "superadmin");
    if (input.role) grantRole(db, input.userId, input.role, input.actor.id, iso);
    writeAudit(db, {
      actorId: input.actor.id,
      actorLabel: input.actor.email,
      action: "admin.role.modifie",
      entityType: "utilisateur",
      entityId: input.userId,
      detail: { role: input.role ?? "aucun" },
    });
  })();
  const target = loadUserContext(db, input.userId);
  if (!target) return { ok: false, message: "Compte introuvable." };
  return { ok: true, data: { account: publicAccount(target) } };
}

/* ------------------------------------------------------------------
   PROFIL
   ------------------------------------------------------------------ */

const EDITABLE_PROFILE_KEYS = new Set([
  "prenom",
  "nom",
  "telephone",
  "zone",
  "projet",
  "bienRecherche",
  "budget",
  "horizon",
  "structure",
  "identification",
  "zoneExercice",
  "experience",
  "portefeuille",
  "typeBien",
]);

export function updateProfile(
  db: Db,
  userId: string,
  patch: Record<string, string>,
): ServiceResult<{ account: ServerAccount }> {
  const iso = nowIso();
  const run = db.transaction(() => {
    const prenom = typeof patch.prenom === "string" ? patch.prenom.trim() : "";
    const nom = typeof patch.nom === "string" ? patch.nom.trim() : "";
    const telephone = typeof patch.telephone === "string" ? patch.telephone.trim() : "";
    if (prenom) db.prepare("UPDATE users SET prenom = ?, updated_at = ? WHERE id = ?").run(prenom.slice(0, 60), iso, userId);
    if (nom) db.prepare("UPDATE users SET nom = ?, updated_at = ? WHERE id = ?").run(nom.slice(0, 60), iso, userId);
    if (telephone) {
      db.prepare("UPDATE users SET telephone = ?, updated_at = ? WHERE id = ?").run(telephone.slice(0, 40), iso, userId);
    }
    if (typeof patch.notify === "string") {
      db.prepare("UPDATE users SET notify = ?, updated_at = ? WHERE id = ?").run(patch.notify === "true" ? 1 : 0, iso, userId);
    }
    for (const [key, value] of Object.entries(patch)) {
      if (!EDITABLE_PROFILE_KEYS.has(key)) continue;
      db.prepare("INSERT OR REPLACE INTO user_profiles (user_id, key, value) VALUES (?, ?, ?)").run(
        userId,
        key,
        String(value).slice(0, 200),
      );
    }
    writeAudit(db, {
      actorId: userId,
      action: "compte.profil.modifie",
      entityType: "utilisateur",
      entityId: userId,
      detail: { champs: Object.keys(patch).filter((key) => EDITABLE_PROFILE_KEYS.has(key)) },
    });
  });
  run();
  const context = loadUserContext(db, userId);
  if (!context) return { ok: false, message: "Compte introuvable." };
  return { ok: true, data: { account: publicAccount(context) } };
}

/** Change l’adresse e-mail : le compte repasse par une vérification. */
export function changeEmail(
  db: Db,
  userId: string,
  email: string,
): ServiceResult<{ account: ServerAccount; code: string; expiresAt: number }> {
  const error = validateEmailOnly(email);
  if (error) return { ok: false, message: error, fields: { email: error } };
  const emailKey = normalizeEmail(email);
  const clash = queryOne<{ id: string }>("SELECT id FROM users WHERE email_key = ? AND id <> ?", [emailKey, userId]);
  if (clash) {
    return { ok: false, message: "Cette adresse est déjà utilisée.", fields: { email: "Cette adresse possède déjà un compte." } };
  }
  const iso = nowIso();
  db.transaction(() => {
    db.prepare("UPDATE users SET email = ?, email_key = ?, email_verified = 0, updated_at = ? WHERE id = ?").run(
      email.trim(),
      emailKey,
      iso,
      userId,
    );
    writeAudit(db, {
      actorId: userId,
      action: "compte.email.modifie",
      entityType: "utilisateur",
      entityId: userId,
      detail: { email: emailKey },
    });
  })();
  const issued = issueVerificationCode(db, userId, emailKey);
  const context = loadUserContext(db, userId)!;
  return {
    ok: true,
    data: { account: publicAccount(context), code: issued?.code ?? "", expiresAt: issued?.expiresAt ?? Date.now() },
  };
}

/** Inscription d’un agent invité par un propriétaire (mandat en attente). */
export async function acceptInvitation(
  db: Db,
  input: { token: string; prenom: string; nom: string; telephone: string; password: string },
): Promise<ServiceResult<{ account: ServerAccount }>> {
  const tokenHash = sha256(input.token);
  const invite = queryOne<{ id: string; property_id: string; invite_email: string | null; expires_at: string; status: string }>(
    "SELECT id, property_id, invite_email, expires_at, status FROM authorizations WHERE invite_token_hash = ? AND status = 'invite'",
    [tokenHash],
  );
  if (!invite) return { ok: false, message: "Cette invitation n’est plus valide." };
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return { ok: false, message: "Cette invitation a expiré. Demandez au propriétaire de la renouveler." };
  }
  const email = (invite.invite_email ?? "").trim();
  if (!email) return { ok: false, message: "Invitation incomplète : adresse manquante." };

  const result = await signUp(db, {
    role: ROLE_AGENT,
    values: {
      prenom: input.prenom,
      nom: input.nom,
      telephone: input.telephone,
      email,
      motDePasse: input.password,
      confirmation: input.password,
      zone: "Cotonou",
      structure: "",
      identification: "",
      zoneExercice: "",
      experience: "",
    },
  });
  if (!result.ok) return result;
  const iso = nowIso();
  db.transaction(() => {
    db.prepare("UPDATE authorizations SET agent_id = ?, invite_token_hash = NULL, status = 'en-attente', updated_at = ? WHERE id = ?").run(
      result.data.account.id,
      iso,
      invite.id,
    );
    writeAudit(db, {
      actorId: result.data.account.id,
      actorLabel: email,
      action: "mandat.invitation.acceptee",
      entityType: "mandat",
      entityId: invite.id,
    });
  })();
  return { ok: true, data: { account: result.data.account } };
}

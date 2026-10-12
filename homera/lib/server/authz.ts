import type { Db } from "./db/client";

/* ==================================================================
   HOMERA — RÔLES ET AUTORISATIONS (source de vérité serveur)
   ------------------------------------------------------------------
   Trois rôles métier cumulables (`client`, `propriétaire`, `agent`)
   plus deux rôles d’administration (`admin`, `superadmin`).

   Règle absolue : un rôle n’est jamais déduit de ce que le client
   envoie, ni d’un champ de profil libre. Il est lu dans `user_roles`.
   Seul un `superadmin` peut attribuer ou retirer `admin`/`superadmin`.

   Les fonctions ci-dessous sont pures : elles reçoivent un contexte
   déjà authentifié et rendent une décision. Les services les appellent
   avant chaque écriture.
   ================================================================== */

export const ROLE_CLIENT = "client";
export const ROLE_OWNER = "proprietaire";
export const ROLE_AGENT = "agent";
export const ROLE_ADMIN = "admin";
export const ROLE_SUPERADMIN = "superadmin";

export const ALL_ROLES = [ROLE_CLIENT, ROLE_OWNER, ROLE_AGENT, ROLE_ADMIN, ROLE_SUPERADMIN] as const;
export type ServerRole = (typeof ALL_ROLES)[number];

/** Rôles visibles par l’interface (le socle client + les métiers). */
export type AccountRole = "client" | "proprietaire" | "agent";

export type UserContext = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  roles: ServerRole[];
  /** Rôles métier, dans l’ordre du catalogue, socle client inclus. */
  accountRoles: AccountRole[];
  emailVerified: boolean;
  notify: boolean;
  status: string;
  profile: Record<string, string>;
  /** Matricule agent quand le compte est agent vérifié — sinon null. */
  agentMatricule: string | null;
  createdAt: string;
};

export function isAdminRole(roles: readonly string[]): boolean {
  return roles.includes(ROLE_ADMIN) || roles.includes(ROLE_SUPERADMIN);
}

export function isSuperAdminRole(roles: readonly string[]): boolean {
  return roles.includes(ROLE_SUPERADMIN);
}

export function hasRole(roles: readonly string[], role: ServerRole): boolean {
  return roles.includes(role);
}

/** Le socle client est impliqué par tout rôle : chaque compte peut chercher et visiter. */
export function accountRolesOf(roles: readonly string[]): AccountRole[] {
  const result: AccountRole[] = [];
  if (roles.includes(ROLE_CLIENT) || roles.length > 0) result.push(ROLE_CLIENT);
  if (roles.includes(ROLE_OWNER)) result.push(ROLE_OWNER);
  if (roles.includes(ROLE_AGENT)) result.push(ROLE_AGENT);
  return result;
}

/* ------------------------------------------------------------------
   ESPACES ACCESSIBLES
   ------------------------------------------------------------------
   Même vocabulaire que `lib/auth.ts`, mais décidé côté serveur : un
   utilisateur ne voit que les espaces que ses rôles autorisent vraiment.
   ------------------------------------------------------------------ */

export type WorkspaceId = "client" | "proprietaire" | "agent" | "admin";

export type AccessibleWorkspace = {
  id: WorkspaceId;
  label: string;
  shortLabel: string;
  href: string;
  description: string;
};

const SPACES: Record<WorkspaceId, AccessibleWorkspace> = {
  admin: {
    id: "admin",
    label: "Administration",
    shortLabel: "Admin",
    href: "/admin",
    description: "Vérifications, modération et supervision",
  },
  agent: {
    id: "agent",
    label: "Espace agent",
    shortLabel: "Agent",
    href: "/agent",
    description: "Mandats, visites terrain et clients",
  },
  proprietaire: {
    id: "proprietaire",
    label: "Espace propriétaire",
    shortLabel: "Propriétaire",
    href: "/proprietaire",
    description: "Biens publiés, demandes, visites et contrats",
  },
  client: {
    id: "client",
    label: "Espace client",
    shortLabel: "Client",
    href: "/client",
    description: "Recherches, favoris, visites et locations",
  },
};

export function accessibleWorkspaces(roles: readonly string[]): AccessibleWorkspace[] {
  const spaces: AccessibleWorkspace[] = [];
  if (isAdminRole(roles)) spaces.push(SPACES.admin);
  if (roles.includes(ROLE_AGENT)) spaces.push(SPACES.agent);
  if (roles.includes(ROLE_OWNER)) spaces.push(SPACES.proprietaire);
  if (roles.length > 0) spaces.push(SPACES.client);
  return spaces;
}

/** Destination d’atterrissage après connexion : l’espace le plus « métier » détenu. */
export function defaultLanding(roles: readonly string[]): string {
  if (isAdminRole(roles)) return "/admin";
  if (roles.includes(ROLE_OWNER)) return "/proprietaire";
  if (roles.includes(ROLE_AGENT)) return "/agent";
  return "/client";
}

export function canAccessWorkspace(roles: readonly string[], target: WorkspaceId): boolean {
  if (target === "admin") return isAdminRole(roles);
  if (target === "agent") return roles.includes(ROLE_AGENT);
  if (target === "proprietaire") return roles.includes(ROLE_OWNER);
  return roles.length > 0;
}

/* ------------------------------------------------------------------
   PERMISSIONS PAR RESSOURCE
   ------------------------------------------------------------------ */

export type PropertyOwnership = {
  owner_id: string | null;
  agency_id?: string | null;
  publication_status?: string;
};

export function isPropertyOwner(user: UserContext, property: PropertyOwnership): boolean {
  return Boolean(property.owner_id) && property.owner_id === user.id;
}

/** L’administration passe partout, mais seulement ses rôles le disent. */
export function isStaff(user: UserContext): boolean {
  return isAdminRole(user.roles);
}

/** Droits d’écriture sur un bien : propriétaire, administration, ou agent mandaté (scope vérifié). */
export function canEditProperty(
  user: UserContext,
  property: PropertyOwnership,
  authorization: { status: string; agent_id: string | null; scope: string[] } | null,
): boolean {
  if (isStaff(user)) return true;
  if (isPropertyOwner(user, property)) return true;
  if (!authorization || authorization.agent_id !== user.id) return false;
  if (authorization.status !== "active") return false;
  return authorization.scope.includes("gestion") || authorization.scope.includes("annonce");
}

/**
 * Droits de LECTURE des pièces d’un dossier : propriétaire, administration,
 * ou agent mandaté actif sur ce bien.
 *
 * Les pièces justificatives d’un bien (titre foncier, identité, mandat) ne
 * sont pas publiques : un agent non mandaté, un autre propriétaire ou un
 * simple visiteur ne doit jamais pouvoir les lister en devinant un
 * identifiant. C’est cette fonction — et non l’écran — qui en décide.
 */
export function canReadPropertyDossier(
  user: UserContext,
  property: PropertyOwnership,
  authorization: { status: string; agent_id: string | null; scope: string[] } | null,
): boolean {
  if (isStaff(user)) return true;
  if (isPropertyOwner(user, property)) return true;
  if (!authorization || authorization.agent_id !== user.id) return false;
  return authorization.status === "active";
}

/** Droits de visite terrain : agent mandaté actif pour ce bien précis. */
export function canHandleVisits(
  user: UserContext,
  property: PropertyOwnership,
  authorization: { status: string; agent_id: string | null; scope: string[] } | null,
): boolean {
  if (isStaff(user)) return true;
  if (isPropertyOwner(user, property)) return true;
  if (!authorization || authorization.agent_id !== user.id || authorization.status !== "active") return false;
  return authorization.scope.includes("visite") || authorization.scope.includes("gestion") || authorization.scope.includes("location");
}

export function canModerate(user: UserContext): boolean {
  return isAdminRole(user.roles);
}

export function canManageRoles(user: UserContext): boolean {
  return isSuperAdminRole(user.roles);
}

/* ------------------------------------------------------------------
   LECTURE DU CONTEXTE
   ------------------------------------------------------------------ */

export type UserRow = {
  id: string;
  email: string;
  email_key: string;
  prenom: string;
  nom: string;
  telephone: string;
  email_verified: number;
  notify: number;
  status: string;
  created_at: string;
};

export function loadUserContext(db: Db, userId: string): UserContext | null {
  const row = db
    .prepare<[string], UserRow>(
      "SELECT id, email, email_key, prenom, nom, telephone, email_verified, notify, status, created_at FROM users WHERE id = ?",
    )
    .get(userId);
  if (!row) return null;
  const roles = db
    .prepare<[string], { role: ServerRole }>("SELECT role FROM user_roles WHERE user_id = ? ORDER BY role")
    .all(userId)
    .map((entry) => entry.role);
  const profileEntries = db
    .prepare<[string], { key: string; value: string }>("SELECT key, value FROM user_profiles WHERE user_id = ?")
    .all(userId);
  const profile: Record<string, string> = {};
  for (const entry of profileEntries) profile[entry.key] = entry.value;
  const agent = db
    .prepare<[string], { matricule: string }>("SELECT matricule FROM agents WHERE user_id = ?")
    .get(userId);
  return {
    id: row.id,
    email: row.email,
    prenom: row.prenom,
    nom: row.nom,
    telephone: row.telephone,
    roles,
    accountRoles: accountRolesOf(roles),
    emailVerified: row.email_verified === 1,
    notify: row.notify === 1,
    status: row.status,
    profile,
    agentMatricule: agent?.matricule ?? null,
    createdAt: row.created_at,
  };
}

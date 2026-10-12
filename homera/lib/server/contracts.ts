import type { AccountRole } from "./authz";

/* ==================================================================
   HOMERA — CONTRATS PARTAGÉS SERVEUR ↔ INTERFACE
   ------------------------------------------------------------------
   Ce fichier ne contient que des types : il peut être importé par le
   serveur comme par le client sans embarquer la moindre dépendance
   (ni base, ni `node:`).

   Vue publique d’un compte : aucune empreinte, aucun code, aucun jeton.
   ================================================================== */

export type ServerAccount = {
  id: string;
  /** Rôle principal — celui de l’inscription. */
  role: AccountRole;
  /** Tous les rôles métier détenus, socle client inclus. */
  roles: AccountRole[];
  /** Accès à l’administration : décidé par `user_roles`, jamais par le client. */
  admin: boolean;
  superAdmin: boolean;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  profile: Record<string, string>;
  emailVerified: boolean;
  notify: boolean;
  createdAt: string;
};

export type WorkspaceAccess = {
  id: "client" | "proprietaire" | "agent" | "admin";
  label: string;
  shortLabel: string;
  href: string;
  description: string;
};

export type SessionResponse = {
  authenticated: boolean;
  account: ServerAccount | null;
  workspaces: WorkspaceAccess[];
  landing: string;
  unreadNotifications: number;
};

/** Réponse uniforme des API HOMERA : jamais d’exception brute côté client. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields?: Record<string, string>; code?: string };

/** Code à afficher quand aucun e-mail n’est réellement envoyé (pilote). */
export type PilotCode = {
  purpose: "verification" | "reset";
  email: string;
  code: string;
  expiresAt: number;
  token?: string;
};

import type { Db } from "../db/client";
import { newId, nowIso, queryAll, queryOne } from "../db/client";
import type { UserContext } from "../authz";
import { isAdminRole } from "../authz";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import { randomToken, sha256 } from "../security/tokens";
import type { ServiceResult } from "./accounts";
import { PROPERTY_COLUMNS, type PropertyRow } from "./properties";

/* ==================================================================
   HOMERA — AUTORISATIONS D’AGENTS (mandats)
   ------------------------------------------------------------------
   Règle fondatrice : un agent n’est jamais autorisé parce qu’un
   propriétaire a tapé son nom. L’autorisation est un objet serveur,
   lié à un propriétaire, un agent et un bien, avec un statut explicite :

     en-attente → active → expiree | revoquee | contestee
              ↘ refusee
     invite (agent pas encore inscrit) → en-attente

   Chaque transition est horodatée, attribuée à son auteur et notifiée
   aux trois acteurs concernés (propriétaire, agent, administration).
   ================================================================== */

export type AuthorizationStatus =
  | "en-attente"
  | "invite"
  | "active"
  | "refusee"
  | "revoquee"
  | "expiree"
  | "contestee";

export type AuthorizationRow = {
  id: string;
  reference: string;
  property_id: string;
  owner_id: string;
  agent_id: string | null;
  agency_id: string | null;
  invite_email: string | null;
  invite_token_hash: string | null;
  scope: string;
  mandate_type: string;
  status: AuthorizationStatus;
  proof_label: string;
  starts_at: string;
  expires_at: string;
  note: string;
  decision_note: string;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
};

export const SCOPE_LABELS: Record<string, string> = {
  visite: "Faire visiter le bien",
  location: "Louer et faire signer",
  annonce: "Modifier l’annonce",
  gestion: "Gérer le bien au quotidien",
  encaissement: "Encaisser pour le compte du propriétaire",
};

export const MANDATE_LABELS: Record<string, string> = {
  location: "Mandat de location",
  vente: "Mandat de vente",
  gerance: "Mandat de gérance",
  visite: "Autorisation de visite",
};

function adminIds(db: Db): string[] {
  return db
    .prepare<[], { user_id: string }>("SELECT user_id FROM user_roles WHERE role IN ('admin', 'superadmin')")
    .all()
    .map((row) => row.user_id);
}

function record(
  db: Db,
  input: {
    authorizationId: string;
    actorId?: string | null;
    actorLabel?: string;
    action: string;
    from?: AuthorizationStatus | null;
    to?: AuthorizationStatus;
    note?: string;
  },
): void {
  db.prepare(
    `INSERT INTO authorization_events (id, authorization_id, actor_id, actor_label, action, from_status, to_status, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    newId("EVA"),
    input.authorizationId,
    input.actorId ?? null,
    input.actorLabel ?? "",
    input.action,
    input.from ?? null,
    input.to ?? null,
    input.note ?? "",
    nowIso(),
  );
}

function nextReference(db: Db): string {
  const row = db
    .prepare<[], { value: string | null }>("SELECT reference AS value FROM authorizations ORDER BY reference DESC LIMIT 1")
    .get();
  const last = Number((row?.value ?? "MA-2026-000").split("-").pop() ?? "0");
  return `MA-${new Date().getUTCFullYear()}-${String(last + 1).padStart(3, "0")}`;
}

/* ------------------------------------------------------------------
   LECTURE
   ------------------------------------------------------------------ */

export type AuthorizationView = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  ownerId: string;
  ownerName: string;
  agentId: string | null;
  agentName: string | null;
  agentEmail: string | null;
  agentMatricule: string | null;
  inviteEmail: string | null;
  scope: string[];
  mandateType: string;
  status: AuthorizationStatus;
  proofLabel: string;
  startsAt: string;
  expiresAt: string;
  note: string;
  decisionNote: string;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  expired: boolean;
};

function hydrate(db: Db, row: AuthorizationRow): AuthorizationView {
  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ?`, [row.property_id]);
  const owner = queryOne<{ prenom: string; nom: string }>("SELECT prenom, nom FROM users WHERE id = ?", [row.owner_id]);
  const agent = row.agent_id
    ? queryOne<{ prenom: string; nom: string; email: string }>("SELECT prenom, nom, email FROM users WHERE id = ?", [row.agent_id])
    : null;
  const matricule = row.agent_id
    ? queryOne<{ matricule: string }>("SELECT matricule FROM agents WHERE user_id = ?", [row.agent_id])
    : null;
  let scope: string[] = [];
  try {
    const parsed = JSON.parse(row.scope) as unknown;
    if (Array.isArray(parsed)) scope = parsed.filter((value): value is string => typeof value === "string");
  } catch {
    scope = [];
  }
  return {
    id: row.id,
    reference: row.reference,
    propertyId: row.property_id,
    propertyTitle: property?.title ?? "Bien retiré du catalogue",
    propertyReference: property?.reference ?? "",
    ownerId: row.owner_id,
    ownerName: owner ? `${owner.prenom} ${owner.nom}`.trim() : "Propriétaire",
    agentId: row.agent_id,
    agentName: agent ? `${agent.prenom} ${agent.nom}`.trim() : null,
    agentEmail: agent?.email ?? null,
    agentMatricule: matricule?.matricule ?? null,
    inviteEmail: row.invite_email,
    scope,
    mandateType: row.mandate_type,
    status: row.status,
    proofLabel: row.proof_label,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    note: row.note,
    decisionNote: row.decision_note,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expired: row.status !== "expiree" && new Date(row.expires_at).getTime() <= Date.now(),
  };
}

export function listAuthorizations(
  db: Db,
  filter: { ownerId?: string; agentId?: string; propertyId?: string; status?: AuthorizationStatus[] },
): AuthorizationView[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.ownerId) {
    clauses.push("owner_id = ?");
    params.push(filter.ownerId);
  }
  if (filter.agentId) {
    clauses.push("agent_id = ?");
    params.push(filter.agentId);
  }
  if (filter.propertyId) {
    clauses.push("property_id = ?");
    params.push(filter.propertyId);
  }
  if (filter.status?.length) {
    clauses.push(`status IN (${filter.status.map(() => "?").join(", ")})`);
    params.push(...filter.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = queryAll<AuthorizationRow>(`SELECT * FROM authorizations ${where} ORDER BY created_at DESC`, params);
  return rows.map((row) => hydrate(db, row));
}

export function getAuthorization(db: Db, id: string): AuthorizationView | null {
  const row = queryOne<AuthorizationRow>("SELECT * FROM authorizations WHERE id = ? OR reference = ?", [id, id]);
  return row ? hydrate(db, row) : null;
}

/**
 * Autorisation réellement opposable : statut actif **et** non expirée.
 * Toute porte d’entrée agent (biens, visites, documents) passe par ici.
 */
export function activeAuthorizationFor(
  db: Db,
  propertyId: string,
  agentId: string,
): { status: string; agent_id: string; scope: string[] } | null {
  expireAuthorizations(db);
  const row = queryOne<{ status: string; agent_id: string; scope: string }>(
    "SELECT status, agent_id, scope FROM authorizations WHERE property_id = ? AND agent_id = ? AND status = 'active' AND expires_at >= ?",
    [propertyId, agentId, nowIso()],
  );
  if (!row) return null;
  let scope: string[] = [];
  try {
    const parsed = JSON.parse(row.scope) as unknown;
    if (Array.isArray(parsed)) scope = parsed.filter((value): value is string => typeof value === "string");
  } catch {
    scope = [];
  }
  return { status: row.status, agent_id: row.agent_id, scope };
}

/**
 * Mandat opposable affichable sur une fiche publique : actif, non expiré,
 * et limité à ce qu’un visiteur a le droit de savoir (nom de l’agent,
 * matricule, nature du mandat, échéance). Aucune donnée privée.
 */
export function publicMandate(
  db: Db,
  propertyId: string,
): { agentId: string; agentName: string; matricule: string | null; mandateType: string; expiresAt: string } | null {
  expireAuthorizations(db);
  const row = queryOne<{ agent_id: string | null; mandate_type: string; expires_at: string }>(
    "SELECT agent_id, mandate_type, expires_at FROM authorizations WHERE property_id = ? AND status = 'active' AND expires_at >= ? ORDER BY created_at DESC",
    [propertyId, nowIso()],
  );
  if (!row?.agent_id) return null;
  const agent = queryOne<{ prenom: string; nom: string }>("SELECT prenom, nom FROM users WHERE id = ?", [row.agent_id]);
  if (!agent) return null;
  const matricule = queryOne<{ matricule: string }>("SELECT matricule FROM agents WHERE user_id = ?", [row.agent_id]);
  return {
    agentId: row.agent_id,
    agentName: `${agent.prenom} ${agent.nom}`.trim() || "Agent HOMERA",
    matricule: matricule?.matricule ?? null,
    mandateType: row.mandate_type,
    expiresAt: row.expires_at,
  };
}

/**
 * Contrôle public d’un mandat : on ne répond que si le visiteur connaît
 * déjà les deux éléments du couple (matricule de l’agent + référence du
 * bien). La réponse ne contient alors que ce qu’un badge laisse voir :
 * l’existence du mandat, sa validité du jour, sa nature et son échéance.
 */
export function publicMandateCheck(
  db: Db,
  query: { agentRef: string; propertyRef: string },
): {
  active: boolean;
  status: AuthorizationStatus;
  agentName: string;
  matricule: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  propertyCity: string;
  mandateType: string;
  scope: string[];
  startsAt: string;
  expiresAt: string;
} | null {
  const agentRef = query.agentRef.trim().toUpperCase();
  const propertyRef = query.propertyRef.trim().toUpperCase();
  if (!agentRef || !propertyRef) return null;
  expireAuthorizations(db);

  const agent = queryOne<{ user_id: string; matricule: string }>(
    "SELECT user_id, matricule FROM agents WHERE UPPER(matricule) = ?",
    [agentRef],
  );
  if (!agent) return null;
  const property = queryOne<{ id: string; reference: string; title: string; city: string }>(
    "SELECT id, reference, title, city FROM properties WHERE UPPER(reference) = ?",
    [propertyRef],
  );
  if (!property) return null;

  const row = queryOne<AuthorizationRow>(
    "SELECT * FROM authorizations WHERE property_id = ? AND agent_id = ? ORDER BY created_at DESC",
    [property.id, agent.user_id],
  );
  if (!row) return null;

  const user = queryOne<{ prenom: string; nom: string }>("SELECT prenom, nom FROM users WHERE id = ?", [agent.user_id]);
  let scope: string[] = [];
  try {
    const parsed = JSON.parse(row.scope) as unknown;
    if (Array.isArray(parsed)) scope = parsed.filter((value): value is string => typeof value === "string");
  } catch {
    scope = [];
  }
  return {
    active: row.status === "active" && new Date(row.expires_at).getTime() >= Date.now(),
    status: row.status,
    agentName: user ? `${user.prenom} ${user.nom}`.trim() || "Agent HOMERA" : "Agent HOMERA",
    matricule: agent.matricule,
    propertyId: property.id,
    propertyTitle: property.title,
    propertyReference: property.reference,
    propertyCity: property.city,
    mandateType: row.mandate_type,
    scope,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
  };
}

/** Passe les mandats dépassés au statut « expiré » et prévient les acteurs. */
export function expireAuthorizations(db: Db): number {
  const rows = queryAll<AuthorizationRow>(
    "SELECT * FROM authorizations WHERE status = 'active' AND expires_at < ?",
    [nowIso()],
  );
  for (const row of rows) {
    const iso = nowIso();
    db.transaction(() => {
      db.prepare("UPDATE authorizations SET status = 'expiree', updated_at = ? WHERE id = ?").run(iso, row.id);
      record(db, { authorizationId: row.id, action: "expiration", from: "active", to: "expiree" });
      writeAudit(db, {
        action: "mandat.expire",
        entityType: "mandat",
        entityId: row.id,
        detail: { reference: row.reference },
      });
      notify(db, {
        userIds: [row.owner_id, row.agent_id, ...adminIds(db)],
        type: "agent",
        title: "Mandat expiré",
        body: `Le mandat ${row.reference} est arrivé à échéance.`,
        link: "/proprietaire/agents",
        entityType: "mandat",
        entityId: row.id,
      });
    })();
  }
  return rows.length;
}

/* ------------------------------------------------------------------
   DEMANDE D’AFFECTATION
   ------------------------------------------------------------------ */

export type CreateAuthorizationInput = {
  propertyId: string;
  agentId?: string | null;
  agentEmail?: string;
  agentName?: string;
  agencyName?: string;
  mandateType?: string;
  scope: string[];
  proofLabel: string;
  expiresAt: string;
  note?: string;
};

export function createAuthorization(
  db: Db,
  actor: UserContext,
  input: CreateAuthorizationInput,
  meta: { ip?: string } = {},
): ServiceResult<{ authorization: AuthorizationView; inviteToken?: string; inviteUrl?: string }> {
  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [
    input.propertyId,
    input.propertyId,
  ]);
  if (!property) return { ok: false, message: "Bien introuvable." };
  if (property.owner_id !== actor.id && !isAdminRole(actor.roles)) {
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "mandat.creation.refusee",
      entityType: "bien",
      entityId: property.id,
      detail: { raison: "proprietaire" },
      ip: meta.ip,
    });
    return { ok: false, code: "permission", message: "Seul le propriétaire du bien peut mandater un agent." };
  }
  if (input.expiresAt <= nowIso().slice(0, 10)) {
    return { ok: false, message: "La date de fin doit être dans le futur.", fields: { expiresAt: "Date dépassée." } };
  }

  const iso = nowIso();
  const id = newId("AUT");
  const reference = nextReference(db);

  let agentId: string | null = input.agentId ?? null;
  let status: AuthorizationStatus = "en-attente";
  let inviteEmail: string | null = null;
  let inviteToken: string | null = null;

  if (!agentId && input.agentEmail) {
    const emailKey = input.agentEmail.trim().toLowerCase();
    const existingUser = queryOne<{ id: string }>("SELECT id FROM users WHERE email_key = ?", [emailKey]);
    if (existingUser) {
      agentId = existingUser.id;
    } else {
      // L’agent n’existe pas encore : invitation sécurisée, jamais de compte
      // créé à la place de la personne concernée.
      status = "invite";
      inviteEmail = input.agentEmail.trim();
      inviteToken = randomToken(24);
    }
  }
  if (!agentId && !inviteEmail) {
    return {
      ok: false,
      message: "Choisissez un agent HOMERA existant ou indiquez son adresse e-mail pour l’inviter.",
      fields: { agentId: "Agent introuvable." },
    };
  }
  if (agentId) {
    const roles = queryAll<{ role: string }>("SELECT role FROM user_roles WHERE user_id = ?", [agentId]).map(
      (row) => row.role,
    );
    if (!roles.includes("agent")) {
      return {
        ok: false,
        message: "Ce compte n’a pas le rôle agent. Invitez-le d’abord à créer son espace agent.",
        fields: { agentId: "Compte sans rôle agent." },
      };
    }
    const duplicate = queryOne<{ id: string }>(
      "SELECT id FROM authorizations WHERE property_id = ? AND agent_id = ? AND status IN ('en-attente', 'invite', 'active')",
      [property.id, agentId],
    );
    if (duplicate) {
      return { ok: false, message: "Une demande est déjà en cours pour cet agent sur ce bien.", fields: { agentId: "Demande existante." } };
    }
  }

  const agencyId = input.agencyName
    ? queryOne<{ id: string }>("SELECT id FROM agencies WHERE name = ?", [input.agencyName])?.id ?? null
    : null;

  db.transaction(() => {
    db.prepare(
      `INSERT INTO authorizations (id, reference, property_id, owner_id, agent_id, agency_id, invite_email,
          invite_token_hash, scope, mandate_type, status, proof_label, starts_at, expires_at, note, decision_note,
          decided_at, decided_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', NULL, NULL, ?, ?)`,
    ).run(
      id,
      reference,
      property.id,
      property.owner_id ?? actor.id,
      agentId,
      agencyId,
      inviteEmail,
      inviteToken ? sha256(inviteToken) : null,
      JSON.stringify(input.scope),
      input.mandateType ?? "location",
      status,
      input.proofLabel,
      iso,
      `${input.expiresAt}T23:59:59.000Z`,
      input.note ?? "",
      iso,
      iso,
    );
    record(db, {
      authorizationId: id,
      actorId: actor.id,
      actorLabel: actor.email,
      action: status === "invite" ? "invitation.envoyee" : "demande.creee",
      to: status,
      note: input.proofLabel,
    });
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "mandat.demande",
      entityType: "mandat",
      entityId: id,
      detail: {
        reference,
        property: property.reference,
        agent: agentId ?? inviteEmail,
        scope: input.scope,
        statut: status,
      },
      ip: meta.ip,
    });
    notify(db, {
      userIds: [agentId, ...adminIds(db)],
      type: "agent",
      title: status === "invite" ? "Invitation à un mandat" : "Nouvelle demande de mandat",
      body: `${reference} · ${property.title} (${property.reference}). Portée : ${input.scope
        .map((key) => SCOPE_LABELS[key] ?? key)
        .join(", ")}.`,
      link: agentId ? "/agent/autorisations" : "/inscription",
      entityType: "mandat",
      entityId: id,
    });
    notify(db, {
      userIds: [property.owner_id],
      type: "agent",
      title: "Demande de mandat enregistrée",
      body: `${reference} · en attente de réponse de l’agent.`,
      link: "/proprietaire/agents",
      entityType: "mandat",
      entityId: id,
    });
  })();

  const authorization = getAuthorization(db, id)!;
  return {
    ok: true,
    data: {
      authorization,
      inviteToken: inviteToken ?? undefined,
      inviteUrl: inviteToken ? `/inscription?invitation=${encodeURIComponent(inviteToken)}` : undefined,
    },
  };
}

/* ------------------------------------------------------------------
   DÉCISIONS
   ------------------------------------------------------------------ */

export type AuthorizationDecision =
  | { action: "accepter"; reason?: string }
  | { action: "refuser"; reason?: string }
  | { action: "revoquer"; reason?: string }
  | { action: "contester"; reason?: string }
  | { action: "renouveler"; reason?: string; expiresAt?: string };

export function decideAuthorization(
  db: Db,
  actor: UserContext,
  authorizationId: string,
  decision: AuthorizationDecision,
  meta: { ip?: string } = {},
): ServiceResult<{ authorization: AuthorizationView }> {
  expireAuthorizations(db);
  const row = queryOne<AuthorizationRow>("SELECT * FROM authorizations WHERE id = ? OR reference = ?", [
    authorizationId,
    authorizationId,
  ]);
  if (!row) return { ok: false, message: "Demande introuvable." };

  const isOwner = row.owner_id === actor.id;
  const isAgent = Boolean(row.agent_id) && row.agent_id === actor.id;
  const isAdmin = isAdminRole(actor.roles);
  const iso = nowIso();

  const allowed = (() => {
    switch (decision.action) {
      case "accepter":
        return (isAgent && row.status === "en-attente") || (isAdmin && row.status === "en-attente");
      case "refuser":
        return (isAgent && row.status === "en-attente") || (isAdmin && row.status !== "refusee");
      case "revoquer":
        return isOwner || isAdmin;
      case "contester":
        return isOwner || isAgent;
      case "renouveler":
        return isOwner || isAdmin;
      default:
        return false;
    }
  })();
  if (!allowed) {
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "mandat.decision.refusee",
      entityType: "mandat",
      entityId: row.id,
      detail: { action: decision.action, statut: row.status },
      ip: meta.ip,
    });
    return { ok: false, code: "permission", message: "Cette action n’est pas possible sur cette demande." };
  }
  if ((decision.action === "refuser" || decision.action === "revoquer" || decision.action === "contester") && !decision.reason) {
    return {
      ok: false,
      message: "Indiquez le motif : il est conservé dans l’historique et montré aux autres acteurs.",
      fields: { reason: "Motif obligatoire." },
    };
  }

  const nextStatus: AuthorizationStatus =
    decision.action === "accepter" || decision.action === "renouveler"
      ? "active"
      : decision.action === "refuser"
        ? "refusee"
        : decision.action === "revoquer"
          ? "revoquee"
          : "contestee";
  const expiresAt =
    decision.action === "renouveler" && decision.expiresAt
      ? `${decision.expiresAt}T23:59:59.000Z`
      : row.expires_at;

  db.transaction(() => {
    db.prepare(
      "UPDATE authorizations SET status = ?, decision_note = ?, decided_at = ?, decided_by = ?, expires_at = ?, updated_at = ? WHERE id = ?",
    ).run(nextStatus, decision.reason ?? "", iso, actor.id, expiresAt, iso, row.id);
    record(db, {
      authorizationId: row.id,
      actorId: actor.id,
      actorLabel: actor.email,
      action: decision.action,
      from: row.status,
      to: nextStatus,
      note: decision.reason ?? "",
    });
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: `mandat.${decision.action}`,
      entityType: "mandat",
      entityId: row.id,
      detail: { reference: row.reference, from: row.status, to: nextStatus, motif: decision.reason ?? "" },
      ip: meta.ip,
    });
    const titles: Record<string, string> = {
      accepter: "Mandat accepté",
      refuser: "Mandat refusé",
      revoquer: "Mandat révoqué",
      contester: "Mandat contesté",
      renouveler: "Mandat renouvelé",
    };
    notify(db, {
      userIds: [row.owner_id, row.agent_id, ...adminIds(db)],
      type: "agent",
      title: titles[decision.action] ?? "Mandat mis à jour",
      body: `${row.reference} · ${decision.reason || "Statut mis à jour"}`,
      link: "/proprietaire/agents",
      entityType: "mandat",
      entityId: row.id,
    });
  })();

  return { ok: true, data: { authorization: getAuthorization(db, row.id)! } };
}

export function authorizationHistory(
  db: Db,
  authorizationId: string,
): { action: string; actor: string; from: string | null; to: string | null; note: string; createdAt: string }[] {
  return queryAll<{
    action: string;
    actor_id: string | null;
    actor_label: string;
    from_status: string | null;
    to_status: string | null;
    note: string;
    created_at: string;
  }>(
    "SELECT action, actor_id, actor_label, from_status, to_status, note, created_at FROM authorization_events WHERE authorization_id = ? ORDER BY created_at ASC",
    [authorizationId],
  ).map((row) => {
    const actor = row.actor_id
      ? queryOne<{ prenom: string; nom: string }>("SELECT prenom, nom FROM users WHERE id = ?", [row.actor_id])
      : null;
    return {
      action: row.action,
      actor: actor ? `${actor.prenom} ${actor.nom}`.trim() : row.actor_label || "Système",
      from: row.from_status,
      to: row.to_status,
      note: row.note,
      createdAt: row.created_at,
    };
  });
}

/** Événements liés à une adresse e-mail invitée (avant création du compte). */
export function findInvitation(db: Db, token: string): AuthorizationView | null {
  const row = queryOne<AuthorizationRow>(
    "SELECT * FROM authorizations WHERE invite_token_hash = ? AND status = 'invite'",
    [sha256(token)],
  );
  return row ? hydrate(db, row) : null;
}

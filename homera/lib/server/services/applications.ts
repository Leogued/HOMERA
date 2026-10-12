import type { Db } from "../db/client";
import { newId, nowIso, queryAll, queryOne } from "../db/client";
import { canModerate, isAdminRole, type UserContext } from "../authz";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import type { ServiceResult } from "./accounts";
import { PROPERTY_COLUMNS, type PropertyRow } from "./properties";
import { activeAuthorizationFor } from "./authorizations";

/* ==================================================================
   HOMERA — DEMANDES DE LOCATION
   ------------------------------------------------------------------
   Une candidature n’existe qu’au bout d’un parcours réel : il faut
   avoir visité le bien. Le serveur refuse donc toute demande qui ne
   s’appuie pas sur une visite « effectuée », sur un bien réellement
   proposé à la location, et dont le dossier n’a pas déjà été déposé.

   Statuts : envoyée → en cours → acceptée | refusée | annulée

   Règles tenues par le serveur (jamais par l’écran) :
   • une visite ne peut ouvrir qu’une seule candidature ;
   • la candidature porte le bien de la visite, jamais celui de l’URL ;
   • seuls le propriétaire, l’agent mandaté « location » ou
     l’administration peuvent instruire le dossier ;
   • un refus exige un motif, conservé et transmis ;
   • chaque transition est horodatée, tracée et notifiée.
   ================================================================== */

export type ApplicationStatus = "envoyee" | "en-cours" | "acceptee" | "refusee" | "annulee";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  "envoyee": "Envoyée",
  "en-cours": "En cours d’étude",
  "acceptee": "Acceptée",
  "refusee": "Refusée",
  "annulee": "Annulée",
};

export type ApplicationRow = {
  id: string;
  reference: string;
  property_id: string;
  client_id: string;
  visit_id: string | null;
  status: ApplicationStatus;
  message: string;
  monthly_income: number;
  decision_note: string;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationView = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  propertyCity: string;
  clientId: string;
  clientName: string;
  visitId: string | null;
  visitReference: string | null;
  visitDate: string | null;
  status: ApplicationStatus;
  message: string;
  monthlyIncome: number;
  decisionNote: string;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Vrai quand l’appelant peut instruire le dossier (accepter / refuser). */
  canDecide: boolean;
  /** Vrai quand l’appelant est le candidat et peut retirer sa demande. */
  canWithdraw: boolean;
};

export type ApplicationDecision = {
  action: "accepter" | "refuser" | "etudier" | "annuler";
  reason?: string;
};

/* ==================================================================
   LECTURE
   ================================================================== */

const APPLICATION_SELECT = `
  SELECT a.*,
         p.title        AS property_title,
         p.reference    AS property_reference,
         p.city         AS property_city,
         p.owner_id     AS property_owner_id,
         c.prenom       AS client_prenom,
         c.nom          AS client_nom,
         v.reference    AS visit_reference,
         v.requested_date AS visit_date
    FROM rental_applications a
    JOIN properties p ON p.id = a.property_id
    JOIN users c      ON c.id = a.client_id
    LEFT JOIN visits v ON v.id = a.visit_id
`;

type JoinedRow = ApplicationRow & {
  property_title: string;
  property_reference: string;
  property_city: string;
  property_owner_id: string;
  client_prenom: string;
  client_nom: string;
  visit_reference: string | null;
  visit_date: string | null;
};

function toView(db: Db, row: JoinedRow, actor: UserContext): ApplicationView {
  const authorization = activeAuthorizationFor(db, row.property_id, actor.id);
  const agentCanHandle =
    authorization?.agent_id === actor.id &&
    authorization.status === "active" &&
    (authorization.scope.includes("location") || authorization.scope.includes("gestion"));
  const canDecide =
    row.status === "envoyee" || row.status === "en-cours"
      ? isAdminRole(actor.roles) || row.property_owner_id === actor.id || agentCanHandle
      : false;
  return {
    id: row.id,
    reference: row.reference,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    propertyReference: row.property_reference,
    propertyCity: row.property_city,
    clientId: row.client_id,
    clientName: `${row.client_prenom ?? ""} ${row.client_nom ?? ""}`.trim(),
    visitId: row.visit_id,
    visitReference: row.visit_reference,
    visitDate: row.visit_date,
    status: row.status,
    message: row.message ?? "",
    monthlyIncome: row.monthly_income ?? 0,
    decisionNote: row.decision_note ?? "",
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canDecide,
    canWithdraw: row.client_id === actor.id && (row.status === "envoyee" || row.status === "en-cours"),
  };
}

/** Candidatures visibles par l’appelant : les siennes, celles de ses biens, ou toutes pour l’administration. */
export function listApplications(db: Db, actor: UserContext): ApplicationView[] {
  if (isAdminRole(actor.roles)) {
    return queryAll<JoinedRow>(`${APPLICATION_SELECT} ORDER BY a.created_at DESC`).map((row) => toView(db, row, actor));
  }
  const rows = queryAll<JoinedRow>(
    `${APPLICATION_SELECT} WHERE a.client_id = ? OR p.owner_id = ? OR EXISTS (
       SELECT 1 FROM authorizations z
        WHERE z.property_id = a.property_id
          AND z.agent_id = ?
          AND z.status = 'active'
          AND (z.scope LIKE '%location%' OR z.scope LIKE '%gestion%')
     )
     ORDER BY a.created_at DESC`,
    [actor.id, actor.id, actor.id],
  );
  return rows.map((row) => toView(db, row, actor));
}

export function getApplication(db: Db, id: string, actor: UserContext): ApplicationView | null {
  const row = queryOne<JoinedRow>(`${APPLICATION_SELECT} WHERE a.id = ? OR a.reference = ?`, [id, id]);
  if (!row) return null;
  const view = toView(db, row, actor);
  const other =
    view.clientId === actor.id ||
    isAdminRole(actor.roles) ||
    queryOne<{ c: number }>(
      `SELECT COUNT(*) AS c FROM properties p
        WHERE p.id = ? AND (p.owner_id = ? OR EXISTS (
          SELECT 1 FROM authorizations z
           WHERE z.property_id = p.id AND z.agent_id = ? AND z.status = 'active'
             AND (z.scope LIKE '%location%' OR z.scope LIKE '%gestion%')
        ))`,
      [view.propertyId, actor.id, actor.id],
    )?.c;
  return other ? view : null;
}

/* ==================================================================
   DÉPÔT
   ================================================================== */

export type ApplicationDraft = {
  visitId: string;
  message?: string;
  monthlyIncome?: number;
};

export function createApplication(
  db: Db,
  actor: UserContext,
  input: ApplicationDraft,
  meta: { ip?: string } = {},
): ServiceResult<{ application: ApplicationView }> {
  const visit = queryOne<{
    id: string;
    reference: string;
    property_id: string;
    client_id: string;
    status: string;
    requested_date: string;
  }>("SELECT id, reference, property_id, client_id, status, requested_date FROM visits WHERE id = ? OR reference = ?", [
    input.visitId,
    input.visitId,
  ]);
  if (!visit) return { ok: false, message: "Visite introuvable." };
  /* La visite doit appartenir au candidat : personne ne dépose un dossier
     sur le rendez-vous d’un autre en devinant un identifiant. */
  if (visit.client_id !== actor.id) {
    return { ok: false, message: "Cette visite ne vous appartient pas." };
  }
  if (visit.status !== "effectuee") {
    return { ok: false, message: "Une visite effectuée est nécessaire avant de déposer votre dossier." };
  }

  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ?`, [visit.property_id]);
  if (!property) return { ok: false, message: "Bien introuvable." };
  if (property.intent !== "louer") {
    return { ok: false, message: "Ce bien n’est pas proposé à la location." };
  }

  const existing = queryOne<{ id: string }>("SELECT id FROM rental_applications WHERE visit_id = ?", [visit.id]);
  if (existing) {
    return { ok: false, message: "Une demande est déjà liée à cette visite." };
  }

  const at = nowIso();
  const id = newId("CAND");
  const reference = `CAND-${at.slice(0, 10).replace(/-/g, "")}-${id.slice(-4).toUpperCase()}`;

  db.prepare(
    `INSERT INTO rental_applications
       (id, reference, property_id, client_id, visit_id, status, message, monthly_income, decision_note, decided_at, decided_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'envoyee', ?, ?, '', NULL, NULL, ?, ?)`,
  ).run(
    id,
    reference,
    property.id,
    actor.id,
    visit.id,
    (input.message ?? "").trim().slice(0, 1000),
    Math.max(0, Math.min(100_000_000, Math.round(input.monthlyIncome ?? 0))),
    at,
    at,
  );

  notify(db, {
    userIds: [property.owner_id, mandatedAgent(db, property.id)],
    type: "candidature",
    title: "Nouvelle candidature de location",
    body: `${actor.prenom} ${actor.nom} a déposé un dossier pour « ${property.title} » (${reference}).`,
    link: "/proprietaire/demandes",
    entityType: "candidature",
    entityId: id,
  });
  writeAudit(db, {
    actorId: actor.id,
    actorLabel: `${actor.prenom} ${actor.nom}`,
    action: "candidature.depot",
    entityType: "rental_application",
    entityId: id,
    detail: { reference, propertyId: property.id, visitId: visit.id },
    ip: meta.ip ?? "",
  });

  const view = getApplication(db, id, actor);
  if (!view) return { ok: false, message: "La demande n’a pas pu être relue après enregistrement." };
  return { ok: true, data: { application: view } };
}

/* ==================================================================
   INSTRUCTION
   ================================================================== */

export function decideApplication(
  db: Db,
  actor: UserContext,
  applicationId: string,
  decision: ApplicationDecision,
  meta: { ip?: string } = {},
): ServiceResult<{ application: ApplicationView }> {
  const row = queryOne<ApplicationRow>(
    "SELECT * FROM rental_applications WHERE id = ? OR reference = ?",
    [applicationId, applicationId],
  );
  if (!row) return { ok: false, message: "Candidature introuvable." };

  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ?`, [row.property_id]);
  if (!property) return { ok: false, message: "Bien introuvable." };

  const authorization = activeAuthorizationFor(db, row.property_id, actor.id);
  const agentCanHandle =
    authorization?.agent_id === actor.id &&
    authorization.status === "active" &&
    (authorization.scope.includes("location") || authorization.scope.includes("gestion"));
  const isOwner = property.owner_id === actor.id;
  const isCandidate = row.client_id === actor.id;
  const staff = canModerate(actor);

  const reason = (decision.reason ?? "").trim();
  const at = nowIso();

  if (decision.action === "annuler") {
    if (!isCandidate) return { ok: false, message: "Seul le candidat peut retirer sa demande." };
    if (row.status === "acceptee") return { ok: false, message: "Une candidature acceptée ne se retire plus : contactez le propriétaire." };
    if (row.status === "annulee" || row.status === "refusee") return { ok: false, message: "Cette demande est déjà close." };
    db.prepare("UPDATE rental_applications SET status = 'annulee', decision_note = ?, decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?")
      .run(reason || "Retirée par le candidat.", at, actor.id, at, row.id);
    notify(db, {
      userIds: [property.owner_id, mandatedAgent(db, property.id)],
      type: "candidature",
      title: "Candidature retirée",
      body: `Le candidat a retiré sa demande pour « ${property.title} » (${row.reference}).`,
      link: "/proprietaire/demandes",
      entityType: "candidature",
      entityId: row.id,
    });
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: `${actor.prenom} ${actor.nom}`,
      action: "candidature.annulation",
      entityType: "rental_application",
      entityId: row.id,
      detail: { reference: row.reference, reason },
      ip: meta.ip ?? "",
    });
  } else {
    if (!staff && !isOwner && !agentCanHandle) {
      return { ok: false, message: "Vous n’êtes pas habilité à instruire cette candidature." };
    }
    if (row.status !== "envoyee" && row.status !== "en-cours") {
      return { ok: false, message: "Cette candidature est déjà close." };
    }

    if (decision.action === "etudier") {
      if (row.status !== "envoyee") return { ok: false, message: "Cette candidature est déjà en cours d’étude." };
      db.prepare("UPDATE rental_applications SET status = 'en-cours', updated_at = ? WHERE id = ?").run(at, row.id);
    } else {
      if (decision.action === "refuser" && !reason) {
        return { ok: false, message: "Un refus doit être motivé : le motif est transmis au candidat.", fields: { reason: "Motif obligatoire." } };
      }
      db.prepare(
        "UPDATE rental_applications SET status = ?, decision_note = ?, decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?",
      ).run(decision.action === "accepter" ? "acceptee" : "refusee", reason, at, actor.id, at, row.id);
      notify(db, {
        userIds: [row.client_id],
        type: "candidature",
        title: decision.action === "accepter" ? "Candidature acceptée" : "Candidature refusée",
        body:
          decision.action === "accepter"
            ? `Votre dossier pour « ${property.title} » est accepté (${row.reference}). HOMERA vous accompagne pour la suite.`
            : `Votre dossier pour « ${property.title} » n’a pas été retenu. Motif : ${reason}`,
        link: "/client/demandes",
        entityType: "candidature",
        entityId: row.id,
      });
    }

    writeAudit(db, {
      actorId: actor.id,
      actorLabel: `${actor.prenom} ${actor.nom}`,
      action: `candidature.${decision.action}`,
      entityType: "rental_application",
      entityId: row.id,
      detail: { reference: row.reference, status: decision.action, reason },
      ip: meta.ip ?? "",
    });
  }

  const view = getApplication(db, row.id, actor);
  if (!view) return { ok: false, message: "La candidature n’a pas pu être relue après enregistrement." };
  return { ok: true, data: { application: view } };
}

/** Agent mandaté « location » ou « gestion » sur le bien, s’il existe. */
function mandatedAgent(db: Db, propertyId: string): string | null {
  const row = queryOne<{ agent_id: string }>(
    `SELECT agent_id FROM authorizations
      WHERE property_id = ? AND status = 'active'
        AND (scope LIKE '%location%' OR scope LIKE '%gestion%')
      ORDER BY updated_at DESC LIMIT 1`,
    [propertyId],
  );
  return row?.agent_id ?? null;
}

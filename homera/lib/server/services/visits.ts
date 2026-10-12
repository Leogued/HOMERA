import type { Db } from "../db/client";
import { newId, nowIso, queryAll, queryOne } from "../db/client";
import { canHandleVisits, canModerate, isAdminRole, type UserContext } from "../authz";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import type { ServiceResult } from "./accounts";
import { PROPERTY_COLUMNS, currentUnavailability, type PropertyRow } from "./properties";
import { activeAuthorizationFor } from "./authorizations";

/* ==================================================================
   HOMERA — VISITES
   ------------------------------------------------------------------
   Une visite est un objet partagé entre quatre acteurs : le client qui
   la demande, le propriétaire, l’agent mandaté (s’il existe) et
   l’administration qui peut tout relire.

   Statuts : demandée → confirmée → effectuée | absence
                     ↘ refusée | annulée | reprogrammée

   Règles tenues par le serveur :
   • une demande n’est jamais acceptée sur un créneau saturé ;
   • le créneau est réservé dans la même transaction que la création ;
   • chaque changement est horodaté, attribué et notifié ;
   • une annulation à moins de 24 h exige un motif ;
   • l’historique ne se réécrit jamais : il s’ajoute.
   ================================================================== */

export type VisitStatus =
  | "demandee"
  | "confirmee"
  | "refusee"
  | "reprogrammee"
  | "effectuee"
  | "annulee"
  | "absence";

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  demandee: "Demandée",
  confirmee: "Confirmée",
  refusee: "Refusée",
  reprogrammee: "Reprogrammée",
  effectuee: "Effectuée",
  annulee: "Annulée",
  absence: "Absence constatée",
};

export type VisitRow = {
  id: string;
  reference: string;
  property_id: string;
  client_id: string;
  owner_id: string | null;
  agent_id: string | null;
  slot_id: string | null;
  requested_date: string;
  requested_time: string;
  duration_min: number;
  status: VisitStatus;
  message: string;
  cancel_reason: string;
  decided_at: string | null;
  decided_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SlotRow = {
  id: string;
  property_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booked: number;
  status: string;
  note: string;
  created_at: string;
};

export type VisitView = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  clientId: string;
  clientName: string;
  ownerId: string | null;
  agentId: string | null;
  agentName: string | null;
  slotId: string | null;
  date: string;
  time: string;
  durationMin: number;
  status: VisitStatus;
  message: string;
  cancelReason: string;
  createdAt: string;
  updatedAt: string;
};

function nameOf(db: Db, userId: string | null): string | null {
  if (!userId) return null;
  const row = queryOne<{ prenom: string; nom: string }>("SELECT prenom, nom FROM users WHERE id = ?", [userId]);
  return row ? `${row.prenom} ${row.nom}`.trim() : null;
}

function hydrate(db: Db, row: VisitRow): VisitView {
  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ?`, [row.property_id]);
  return {
    id: row.id,
    reference: row.reference,
    propertyId: row.property_id,
    propertyTitle: property?.title ?? "Bien retiré du catalogue",
    propertyReference: property?.reference ?? "",
    clientId: row.client_id,
    clientName: nameOf(db, row.client_id) ?? "Client",
    ownerId: row.owner_id,
    agentId: row.agent_id,
    agentName: nameOf(db, row.agent_id),
    slotId: row.slot_id,
    date: row.requested_date,
    time: row.requested_time,
    durationMin: row.duration_min,
    status: row.status,
    message: row.message,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function record(
  db: Db,
  input: {
    visitId: string;
    actorId?: string | null;
    actorLabel?: string;
    action: string;
    from?: VisitStatus | null;
    to?: VisitStatus;
    note?: string;
  },
): void {
  db.prepare(
    `INSERT INTO visit_events (id, visit_id, actor_id, actor_label, action, from_status, to_status, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    newId("EVV"),
    input.visitId,
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
  const row = db.prepare<[], { value: string | null }>("SELECT reference AS value FROM visits ORDER BY reference DESC LIMIT 1").get();
  const last = Number((row?.value ?? "VIS-0000").split("-").pop() ?? "0");
  return `VIS-${String(last + 1).padStart(4, "0")}`;
}

function linkFor(role: "client" | "proprietaire" | "agent" | "admin"): string {
  if (role === "client") return "/client/visites";
  if (role === "proprietaire") return "/proprietaire/visites";
  if (role === "agent") return "/agent/visites";
  return "/admin/visites";
}

/* ------------------------------------------------------------------
   LECTURE
   ------------------------------------------------------------------ */

export function listVisits(
  db: Db,
  filter: { clientId?: string; ownerId?: string; agentId?: string; propertyId?: string; status?: VisitStatus[] },
): VisitView[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.clientId) {
    clauses.push("client_id = ?");
    params.push(filter.clientId);
  }
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
  const rows = queryAll<VisitRow>(`SELECT * FROM visits ${where} ORDER BY requested_date ASC, created_at DESC`, params);
  return rows.map((row) => hydrate(db, row));
}

export function getVisit(db: Db, id: string): VisitView | null {
  const row = queryOne<VisitRow>("SELECT * FROM visits WHERE id = ? OR reference = ?", [id, id]);
  return row ? hydrate(db, row) : null;
}

export function visitHistory(
  db: Db,
  visitId: string,
): { action: string; actor: string; from: string | null; to: string | null; note: string; createdAt: string }[] {
  return queryAll<{
    action: string;
    actor_id: string | null;
    actor_label: string;
    from_status: string | null;
    to_status: string | null;
    note: string;
    created_at: string;
  }>("SELECT action, actor_id, actor_label, from_status, to_status, note, created_at FROM visit_events WHERE visit_id = ? ORDER BY created_at ASC", [
    visitId,
  ]).map((row) => ({
    action: row.action,
    actor: nameOf(db, row.actor_id) ?? (row.actor_label || "Système"),
    from: row.from_status,
    to: row.to_status,
    note: row.note,
    createdAt: row.created_at,
  }));
}

/* ------------------------------------------------------------------
   CRÉNEAUX
   ------------------------------------------------------------------ */

export function listSlots(db: Db, propertyId: string, options: { onlyOpen?: boolean } = {}): SlotRow[] {
  const where = options.onlyOpen
    ? "WHERE property_id = ? AND status <> 'ferme' AND ends_at >= ?"
    : "WHERE property_id = ?";
  const params = options.onlyOpen ? [propertyId, nowIso()] : [propertyId];
  return queryAll<SlotRow>(`SELECT * FROM visit_slots ${where} ORDER BY starts_at ASC`, params);
}

export function createSlot(
  db: Db,
  actor: UserContext,
  propertyId: string,
  input: { startsAt: string; endsAt: string; capacity?: number; note?: string },
): ServiceResult<{ slots: SlotRow[] }> {
  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  if (!property) return { ok: false, message: "Bien introuvable." };
  const authorization = activeAuthorizationFor(db, property.id, actor.id);
  if (!canHandleVisits(actor, property, authorization)) {
    return { ok: false, code: "permission", message: "Vous n’avez pas la permission d’ouvrir des créneaux sur ce bien." };
  }
  if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
    return { ok: false, message: "La fin du créneau doit suivre son début.", fields: { endsAt: "Horaire incohérent." } };
  }
  db.prepare(
    "INSERT INTO visit_slots (id, property_id, starts_at, ends_at, capacity, booked, status, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, 0, 'ouvert', ?, ?, ?)",
  ).run(newId("SLT"), property.id, input.startsAt, input.endsAt, input.capacity ?? 1, input.note ?? "", actor.id, nowIso());
  writeAudit(db, {
    actorId: actor.id,
    action: "visite.creneau.cree",
    entityType: "bien",
    entityId: property.id,
    detail: { startsAt: input.startsAt, endsAt: input.endsAt },
  });
  return { ok: true, data: { slots: listSlots(db, property.id) } };
}

/* ------------------------------------------------------------------
   DEMANDE
   ------------------------------------------------------------------ */

export type VisitRequestInput = {
  propertyId: string;
  date: string;
  time?: string;
  slotId?: string | null;
  message?: string;
  durationMin?: number;
};

export function requestVisit(
  db: Db,
  actor: UserContext,
  input: VisitRequestInput,
  meta: { ip?: string } = {},
): ServiceResult<{ visit: VisitView; conflict: string | null }> {
  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [
    input.propertyId,
    input.propertyId,
  ]);
  if (!property) return { ok: false, message: "Bien introuvable." };
  if (property.publication_status !== "publie") {
    return { ok: false, message: "Ce bien n’est pas ouvert aux demandes de visite." };
  }
  if (property.owner_id === actor.id) {
    return { ok: false, message: "Vous êtes le propriétaire de ce bien : la demande de visite n’est pas nécessaire." };
  }

  // Disponibilité déclarée : on dit ce que l’on sait, et rien de plus.
  const unavailable = currentUnavailability(db, property.id, input.date);
  if (unavailable.unavailable) {
    const when = unavailable.until ? ` jusqu’au ${unavailable.until.slice(0, 10)}` : "";
    return {
      ok: false,
      code: "indisponible",
      message: unavailable.until
        ? `Le bien est déclaré indisponible${when}. Choisissez une date postérieure ou demandez à être prévenu.`
        : "Le bien est déclaré indisponible à la date demandée, sans date de retour connue.",
    };
  }

  const iso = nowIso();
  const id = newId("VIS");
  const reference = nextReference(db);
  const time = input.time ?? "09:00";
  const duration = input.durationMin ?? 45;

  let agentId: string | null = null;
  const mandate = queryOne<{ agent_id: string | null }>(
    "SELECT agent_id FROM authorizations WHERE property_id = ? AND status = 'active' AND expires_at >= ? ORDER BY updated_at DESC LIMIT 1",
    [property.id, iso],
  );
  agentId = mandate?.agent_id ?? null;

  const result = db.transaction(() => {
    let slotId: string | null = null;
    if (input.slotId) {
      const slot = queryOne<SlotRow>("SELECT * FROM visit_slots WHERE id = ? AND property_id = ?", [
        input.slotId,
        property.id,
      ]);
      if (!slot) return { ok: false as const, message: "Ce créneau n’existe pas pour ce bien." };
      if (slot.status === "ferme" || slot.booked >= slot.capacity) {
        return {
          ok: false as const,
          code: "creneau-plein",
          message: "Ce créneau vient d’être réservé. Choisissez un autre horaire.",
        };
      }
      // Incrément atomique : deux demandes simultanées ne passent pas.
      const updated = db
        .prepare("UPDATE visit_slots SET booked = booked + 1 WHERE id = ? AND booked < capacity")
        .run(slot.id);
      if (updated.changes === 0) {
        return {
          ok: false as const,
          code: "creneau-plein",
          message: "Ce créneau vient d’être réservé. Choisissez un autre horaire.",
        };
      }
      db.prepare("UPDATE visit_slots SET status = CASE WHEN booked >= capacity THEN 'complet' ELSE status END WHERE id = ?").run(
        slot.id,
      );
      slotId = slot.id;
    } else {
      const clash = queryOne<{ id: string }>(
        "SELECT id FROM visits WHERE property_id = ? AND requested_date = ? AND requested_time = ? AND status IN ('demandee', 'confirmee', 'reprogrammee')",
        [property.id, input.date, time],
      );
      if (clash) {
        return {
          ok: false as const,
          code: "creneau-plein",
          message: "Un autre visiteur a déjà réservé ce créneau. Choisissez un autre horaire.",
        };
      }
    }

    db.prepare(
      `INSERT INTO visits (id, reference, property_id, client_id, owner_id, agent_id, slot_id, requested_date,
          requested_time, duration_min, status, message, cancel_reason, decided_at, decided_by, completed_at,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demandee', ?, '', NULL, NULL, NULL, ?, ?)`,
    ).run(
      id,
      reference,
      property.id,
      actor.id,
      property.owner_id,
      agentId,
      slotId,
      input.date,
      time,
      duration,
      input.message ?? "",
      iso,
      iso,
    );
    record(db, {
      visitId: id,
      actorId: actor.id,
      actorLabel: actor.email,
      action: "demande",
      to: "demandee",
      note: `${input.date} ${time}`,
    });
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "visite.demandee",
      entityType: "visite",
      entityId: id,
      detail: { reference, property: property.reference, date: input.date, time, slot: slotId },
      ip: meta.ip,
    });
    notify(db, {
      userIds: [property.owner_id, agentId],
      type: "visite",
      title: "Nouvelle demande de visite",
      body: `${reference} · ${property.title} — ${input.date} à ${time}.`,
      link: linkFor("proprietaire"),
      entityType: "visite",
      entityId: id,
    });
    notify(db, {
      userIds: [actor.id],
      type: "visite",
      title: "Demande envoyée",
      body: `${reference} · votre demande est enregistrée et en attente de confirmation.`,
      link: linkFor("client"),
      entityType: "visite",
      entityId: id,
    });
    return { ok: true as const };
  })();

  if (!result.ok) return result;
  return { ok: true, data: { visit: getVisit(db, id)!, conflict: null } };
}

/* ------------------------------------------------------------------
   DÉCISIONS
   ------------------------------------------------------------------ */

export type VisitDecision = {
  action: "confirmer" | "refuser" | "annuler" | "reprogrammer" | "effectuer" | "absence";
  date?: string;
  time?: string;
  slotId?: string | null;
  reason?: string;
};

const CANCELLATION_NOTICE_HOURS = 24;

export function decideVisit(
  db: Db,
  actor: UserContext,
  visitId: string,
  decision: VisitDecision,
  meta: { ip?: string } = {},
): ServiceResult<{ visit: VisitView }> {
  const row = queryOne<VisitRow>("SELECT * FROM visits WHERE id = ? OR reference = ?", [visitId, visitId]);
  if (!row) return { ok: false, message: "Visite introuvable." };
  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ?`, [row.property_id]);
  if (!property) return { ok: false, message: "Bien introuvable." };

  const authorization = activeAuthorizationFor(db, property.id, actor.id);
  const isClient = row.client_id === actor.id;
  const isOwner = property.owner_id === actor.id;
  const isAgent = Boolean(authorization);
  const isAdmin = isAdminRole(actor.roles);
  const canDecide = isOwner || isAgent || isAdmin;

  const allowed = (() => {
    switch (decision.action) {
      case "confirmer":
      case "refuser":
        return canDecide && row.status === "demandee";
      case "reprogrammer":
        return (canDecide || isClient) && ["demandee", "confirmee", "reprogrammee"].includes(row.status);
      case "effectuer":
      case "absence":
        return canDecide && ["confirmee", "reprogrammee"].includes(row.status);
      case "annuler":
        return isClient || canDecide;
      default:
        return false;
    }
  })();

  if (!allowed) {
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "visite.decision.refusee",
      entityType: "visite",
      entityId: row.id,
      detail: { action: decision.action, statut: row.status },
      ip: meta.ip,
    });
    return { ok: false, code: "permission", message: "Cette action n’est pas possible sur cette visite." };
  }

  // Annulation tardive : un motif est demandé, il est conservé et montré.
  const hoursBefore = (new Date(`${row.requested_date}T${row.requested_time || "09:00"}:00Z`).getTime() - Date.now()) / 3_600_000;
  const lateCancellation = decision.action === "annuler" && hoursBefore < CANCELLATION_NOTICE_HOURS && hoursBefore > 0;
  const needsReason = decision.action === "refuser" || decision.action === "absence" || lateCancellation;
  if (needsReason && !decision.reason?.trim()) {
    return {
      ok: false,
      message: lateCancellation
        ? "L’annulation moins de 24 h avant la visite demande un motif : il est transmis aux autres acteurs."
        : "Indiquez le motif : il est conservé dans l’historique de la visite.",
      fields: { reason: "Motif obligatoire." },
    };
  }

  const iso = nowIso();
  const nextStatus: VisitStatus =
    decision.action === "confirmer"
      ? "confirmee"
      : decision.action === "refuser"
        ? "refusee"
        : decision.action === "annuler"
          ? "annulee"
          : decision.action === "reprogrammer"
            ? "reprogrammee"
            : decision.action === "effectuer"
              ? "effectuee"
              : "absence";

  const outcome = db.transaction(() => {
    let slotId = row.slot_id;
    let date = row.requested_date;
    let time = row.requested_time;

    if (decision.action === "reprogrammer") {
      if (!decision.date) return { ok: false as const, message: "Indiquez la nouvelle date proposée." };
      date = decision.date;
      time = decision.time ?? row.requested_time;
      // Le créneau d’origine est libéré : il redevient disponible.
      if (row.slot_id) {
        db.prepare("UPDATE visit_slots SET booked = MAX(booked - 1, 0) WHERE id = ?").run(row.slot_id);
        db.prepare("UPDATE visit_slots SET status = 'ouvert' WHERE id = ? AND booked < capacity").run(row.slot_id);
      }
      if (decision.slotId) {
        const updated = db
          .prepare("UPDATE visit_slots SET booked = booked + 1 WHERE id = ? AND booked < capacity")
          .run(decision.slotId);
        if (updated.changes === 0) {
          return { ok: false as const, code: "creneau-plein", message: "Le nouveau créneau est complet." };
        }
        slotId = decision.slotId;
      } else {
        slotId = null;
      }
    }
    if (decision.action === "annuler" || decision.action === "refuser") {
      if (row.slot_id) {
        db.prepare("UPDATE visit_slots SET booked = MAX(booked - 1, 0) WHERE id = ?").run(row.slot_id);
        db.prepare("UPDATE visit_slots SET status = 'ouvert' WHERE id = ? AND booked < capacity").run(row.slot_id);
      }
    }

    db.prepare(
      "UPDATE visits SET status = ?, requested_date = ?, requested_time = ?, slot_id = ?, cancel_reason = ?, decided_at = ?, decided_by = ?, completed_at = ?, updated_at = ? WHERE id = ?",
    ).run(
      nextStatus,
      date,
      time,
      slotId,
      decision.reason ?? "",
      ["confirmee", "refusee"].includes(nextStatus) || decision.action === "annuler" ? iso : row.decided_at,
      actor.id,
      nextStatus === "effectuee" || nextStatus === "absence" ? iso : row.completed_at,
      iso,
      row.id,
    );

    record(db, {
      visitId: row.id,
      actorId: actor.id,
      actorLabel: actor.email,
      action: decision.action,
      from: row.status,
      to: nextStatus,
      note: decision.reason ?? (decision.action === "reprogrammer" ? `${date} ${time}` : ""),
    });
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: `visite.${decision.action}`,
      entityType: "visite",
      entityId: row.id,
      detail: { reference: row.reference, from: row.status, to: nextStatus, motif: decision.reason ?? "" },
      ip: meta.ip,
    });

    const titles: Record<string, string> = {
      confirmer: "Visite confirmée",
      refuser: "Visite refusée",
      annuler: "Visite annulée",
      reprogrammer: "Visite reprogrammée",
      effectuer: "Visite effectuée",
      absence: "Absence constatée",
    };
    const body =
      decision.action === "reprogrammer"
        ? `${row.reference} · nouvelle proposition : ${date} à ${time}.`
        : `${row.reference} · ${property.title}, ${date} à ${time}. ${decision.reason ?? ""}`.trim();

    const recipients = new Set<string>();
    recipients.add(row.client_id);
    if (property.owner_id) recipients.add(property.owner_id);
    if (row.agent_id) recipients.add(row.agent_id);
    notify(db, {
      userIds: [...recipients],
      type: "visite",
      title: titles[decision.action] ?? "Visite mise à jour",
      body,
      link: linkFor("client"),
      entityType: "visite",
      entityId: row.id,
    });
    return { ok: true as const };
  })();

  if (!outcome.ok) return outcome;
  return { ok: true, data: { visit: getVisit(db, row.id)! } };
}

/** Vue administration : toutes les visites, avec l’historique résumé. */
export function adminVisitBoard(db: Db, limit = 100): VisitView[] {
  const rows = queryAll<VisitRow>("SELECT * FROM visits ORDER BY created_at DESC LIMIT ?", [limit]);
  return rows.map((row) => hydrate(db, row));
}

export function canActorSeeVisit(db: Db, actor: UserContext, visit: VisitRow): boolean {
  if (isAdminRole(actor.roles) || canModerate(actor)) return true;
  if (visit.client_id === actor.id) return true;
  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ?`, [visit.property_id]);
  if (!property) return false;
  if (property.owner_id === actor.id) return true;
  return Boolean(activeAuthorizationFor(db, property.id, actor.id));
}

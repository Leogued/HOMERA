import type { Db } from "../db/client";
import { newId, nowIso, queryAll, queryOne } from "../db/client";
import { SPOTLIGHT_SPOTS } from "../../content";
import { writeAudit } from "../audit";
import type { ServiceResult } from "./accounts";

/* ==================================================================
   HOMERA — VITRINE PAYANTE (service serveur)
   ------------------------------------------------------------------
   « Des biens qui méritent d'être vus » : 10 emplacements exactement,
   attribués selon la demande. Le paiement reste à brancher (agrégateur
   Mobile Money à évaluer en bac à sable) : aucun paiement n'est simulé
   ici — l'approbation manuelle attribue l'emplacement et journalise.
   ================================================================== */

export type SpotlightActor = { id: string; label: string };

export type SpotlightEntry = {
  slot: number;
  propertyId: string;
  since: string;
  until: string | null;
};

export type SpotlightRequest = {
  id: string;
  propertyId: string;
  contact: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  slot: number | null;
  createdAt: string;
  decidedAt: string | null;
};

type SlotRow = {
  slot: number;
  property_id: string;
  since: string;
  until: string | null;
};

type RequestRow = {
  id: string;
  property_id: string;
  contact: string;
  status: SpotlightRequest["status"];
  slot: number | null;
  created_at: string;
  decided_at: string | null;
};

function toEntry(row: SlotRow): SpotlightEntry {
  return { slot: row.slot, propertyId: row.property_id, since: row.since, until: row.until };
}

function toRequest(row: RequestRow): SpotlightRequest {
  return {
    id: row.id,
    propertyId: row.property_id,
    contact: row.contact,
    status: row.status,
    slot: row.slot,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}

function validSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 1 && slot <= SPOTLIGHT_SPOTS;
}

function propertyExists(db: Db, propertyId: string): boolean {
  return queryOne<{ id: string }>("SELECT id FROM properties WHERE id = ?", [propertyId]) !== null;
}

/** Emplacements actifs (non expirés), par rang croissant. */
export function listSpotlight(db: Db, options: { includeExpired?: boolean } = {}): SpotlightEntry[] {
  const now = nowIso();
  const rows = options.includeExpired
    ? queryAll<SlotRow>("SELECT * FROM spotlight_slots ORDER BY slot ASC")
    : queryAll<SlotRow>("SELECT * FROM spotlight_slots WHERE until IS NULL OR until > ? ORDER BY slot ASC", [now]);
  return rows.map(toEntry);
}

/** Premier emplacement libre (jamais occupé ou expiré), ou null si complet. */
export function firstFreeSlot(db: Db): number | null {
  const active = new Set(listSpotlight(db).map((entry) => entry.slot));
  for (let slot = 1; slot <= SPOTLIGHT_SPOTS; slot++) {
    if (!active.has(slot)) return slot;
  }
  return null;
}

export function assignSpotlight(
  db: Db,
  actor: SpotlightActor,
  slot: number,
  propertyId: string,
  options: { until?: string | null; note?: string } = {},
): ServiceResult<{ entry: SpotlightEntry }> {
  if (!validSlot(slot)) {
    return { ok: false, code: "slot", message: `L'emplacement doit être entre 1 et ${SPOTLIGHT_SPOTS}.` };
  }
  if (!propertyExists(db, propertyId)) {
    return { ok: false, code: "bien", message: "Ce bien n'existe pas dans le catalogue." };
  }
  const until = options.until ?? null;
  if (until !== null && until <= nowIso()) {
    return { ok: false, code: "fin", message: "La date de fin est déjà passée." };
  }
  const now = nowIso();
  const current = queryOne<SlotRow>("SELECT * FROM spotlight_slots WHERE slot = ?", [slot]);
  if (current && current.property_id !== propertyId && (current.until === null || current.until > now)) {
    return { ok: false, code: "occupe", message: `L'emplacement ${slot} est déjà occupé.` };
  }
  const elsewhere = queryOne<SlotRow>("SELECT * FROM spotlight_slots WHERE property_id = ? AND slot != ?", [
    propertyId,
    slot,
  ]);
  if (elsewhere && (elsewhere.until === null || elsewhere.until > now)) {
    return { ok: false, code: "doublon", message: "Ce bien occupe déjà un emplacement actif." };
  }
  const since = current ? current.since : nowIso().slice(0, 10);
  db.prepare(
    `INSERT INTO spotlight_slots (slot, property_id, since, until, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(slot) DO UPDATE SET property_id = excluded.property_id, until = excluded.until, note = excluded.note`,
  ).run(slot, propertyId, since, until, options.note ?? "");
  writeAudit(db, {
    actorId: actor.id,
    actorLabel: actor.label,
    action: "vitrine.attribution",
    entityType: "emplacement",
    entityId: String(slot),
    detail: { bien: propertyId, fin: until },
  });
  const row = queryOne<SlotRow>("SELECT * FROM spotlight_slots WHERE slot = ?", [slot]);
  if (!row) {
    return { ok: false, code: "lecture", message: "L'emplacement n'a pas pu être relu." };
  }
  return { ok: true, data: { entry: toEntry(row) } };
}

export function releaseSpotlight(
  db: Db,
  actor: SpotlightActor,
  slot: number,
): ServiceResult<{ released: boolean }> {
  if (!validSlot(slot)) {
    return { ok: false, code: "slot", message: `L'emplacement doit être entre 1 et ${SPOTLIGHT_SPOTS}.` };
  }
  const done = db.prepare("DELETE FROM spotlight_slots WHERE slot = ?").run(slot);
  if (done.changes === 0) {
    return { ok: false, code: "vide", message: `L'emplacement ${slot} est déjà libre.` };
  }
  writeAudit(db, {
    actorId: actor.id,
    actorLabel: actor.label,
    action: "vitrine.liberation",
    entityType: "emplacement",
    entityId: String(slot),
    detail: {},
  });
  return { ok: true, data: { released: true } };
}

export function requestSpotlight(
  db: Db,
  propertyId: string,
  contact: string,
): ServiceResult<{ request: SpotlightRequest }> {
  if (!propertyExists(db, propertyId)) {
    return { ok: false, code: "bien", message: "Ce bien n'existe pas dans le catalogue." };
  }
  if (contact.trim().length < 3) {
    return { ok: false, code: "contact", message: "Un contact valide est demandé pour la demande." };
  }
  const pending = queryOne<RequestRow>(
    "SELECT * FROM spotlight_requests WHERE property_id = ? AND status = 'pending'",
    [propertyId],
  );
  if (pending) {
    return { ok: false, code: "doublon", message: "Une demande est déjà en attente pour ce bien." };
  }
  const id = newId("SPOT");
  db.prepare("INSERT INTO spotlight_requests (id, property_id, contact, status) VALUES (?, ?, ?, 'pending')").run(
    id,
    propertyId,
    contact.trim(),
  );
  const row = queryOne<RequestRow>("SELECT * FROM spotlight_requests WHERE id = ?", [id]);
  if (!row) {
    return { ok: false, code: "lecture", message: "La demande n'a pas pu être relue." };
  }
  return { ok: true, data: { request: toRequest(row) } };
}

export function decideSpotlightRequest(
  db: Db,
  actor: SpotlightActor,
  id: string,
  decision: "approved" | "rejected",
  options: { slot?: number; until?: string | null; note?: string } = {},
): ServiceResult<{ request: SpotlightRequest }> {
  const row = queryOne<RequestRow>("SELECT * FROM spotlight_requests WHERE id = ?", [id]);
  if (!row) {
    return { ok: false, code: "demande", message: "Cette demande n'existe pas." };
  }
  if (row.status !== "pending") {
    return { ok: false, code: "statut", message: "Cette demande est déjà traitée." };
  }
  if (decision === "rejected") {
    db.prepare("UPDATE spotlight_requests SET status = 'rejected', decided_at = ?, decision_note = ? WHERE id = ?").run(
      nowIso(),
      options.note ?? "",
      id,
    );
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.label,
      action: "vitrine.refus",
      entityType: "demande",
      entityId: id,
      detail: { bien: row.property_id },
    });
    const updated = queryOne<RequestRow>("SELECT * FROM spotlight_requests WHERE id = ?", [id]);
    if (!updated) {
      return { ok: false, code: "lecture", message: "La demande n'a pas pu être relue." };
    }
    return { ok: true, data: { request: toRequest(updated) } };
  }
  const slot = options.slot ?? firstFreeSlot(db);
  if (slot === null || slot === undefined) {
    return { ok: false, code: "complet", message: "La vitrine est complète : aucun emplacement libre." };
  }
  const assigned = assignSpotlight(db, actor, slot, row.property_id, { until: options.until, note: options.note });
  if (!assigned.ok) return assigned;
  db.prepare("UPDATE spotlight_requests SET status = 'approved', slot = ?, decided_at = ?, decision_note = ? WHERE id = ?").run(
    slot,
    nowIso(),
    options.note ?? "",
    id,
  );
  const updated = queryOne<RequestRow>("SELECT * FROM spotlight_requests WHERE id = ?", [id]);
  if (!updated) {
    return { ok: false, code: "lecture", message: "La demande n'a pas pu être relue." };
  }
  return { ok: true, data: { request: toRequest(updated) } };
}

export function cancelSpotlightRequest(db: Db, id: string): ServiceResult<{ request: SpotlightRequest }> {
  const row = queryOne<RequestRow>("SELECT * FROM spotlight_requests WHERE id = ?", [id]);
  if (!row) {
    return { ok: false, code: "demande", message: "Cette demande n'existe pas." };
  }
  if (row.status !== "pending") {
    return { ok: false, code: "statut", message: "Seule une demande en attente peut être annulée." };
  }
  db.prepare("UPDATE spotlight_requests SET status = 'cancelled', decided_at = ? WHERE id = ?").run(nowIso(), id);
  const updated = queryOne<RequestRow>("SELECT * FROM spotlight_requests WHERE id = ?", [id]);
  if (!updated) {
    return { ok: false, code: "lecture", message: "La demande n'a pas pu être relue." };
  }
  return { ok: true, data: { request: toRequest(updated) } };
}

import type { Db } from "./db/client";
import { newId, nowIso, queryAll } from "./db/client";

/* ==================================================================
   HOMERA — JOURNAL D’AUDIT
   ------------------------------------------------------------------
   Append-only : aucune fonction de ce fichier ne modifie ni ne supprime
   une ligne existante. Chaque opération sensible (connexion, changement
   de rôle, décision de vérification, affectation d’agent, annulation de
   visite, action administrative) y laisse une trace datée et signée par
   son auteur.

   Le journal est lisible par l’administration, jamais par le public.
   ================================================================== */

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_label: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: string;
  ip: string;
  created_at: string;
};

export type AuditInput = {
  actorId?: string | null;
  actorLabel?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
  ip?: string;
};

export function writeAudit(db: Db, input: AuditInput): string {
  const id = newId("LOG");
  db.prepare(
    `INSERT INTO audit_log (id, actor_id, actor_label, action, entity_type, entity_id, detail, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.actorId ?? null,
    (input.actorLabel ?? "système").slice(0, 120),
    input.action,
    input.entityType ?? "",
    input.entityId ?? "",
    JSON.stringify(input.detail ?? {}),
    (input.ip ?? "").slice(0, 60),
    nowIso(),
  );
  return id;
}

export type AuditFilter = {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  limit?: number;
};

export function listAudit(db: Db, filter: AuditFilter = {}): AuditEntry[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.entityType) {
    clauses.push("entity_type = ?");
    params.push(filter.entityType);
  }
  if (filter.entityId) {
    clauses.push("entity_id = ?");
    params.push(filter.entityId);
  }
  if (filter.actorId) {
    clauses.push("actor_id = ?");
    params.push(filter.actorId);
  }
  if (filter.action) {
    clauses.push("action = ?");
    params.push(filter.action);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  return queryAll<AuditEntry>(
    `SELECT * FROM audit_log ${where} ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    [...params, limit],
  );
}

import type { Db } from "../db/client";
import { newId, nowIso, queryAll, queryOne } from "../db/client";
import { canModerate, type UserContext } from "../authz";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import type { ServiceResult } from "./accounts";
import { PROPERTY_COLUMNS, ensureSteps, type PropertyRow } from "./properties";
import { VERIFICATION_STEP_KEYS } from "./properties";

/* ==================================================================
   HOMERA — VÉRIFICATION DES BIENS (workflow administratif)
   ------------------------------------------------------------------
   Huit étapes, chacune avec un statut, un responsable, une date et un
   commentaire interne. Aucune décision globale n’est possible sans que
   les étapes aient été instruites : c’est ce qui distingue un dossier
   réellement contrôlé d’un simple bouton « Vérifier ».

   `documentary_only` / `onsite_done` : le contrôle documentaire et le
   contrôle sur place sont deux choses différentes, et l’interface les
   annonce séparément. Rien n’affirme une visite physique non réalisée.
   ================================================================== */

export type VerificationStepKey = (typeof VERIFICATION_STEP_KEYS)[number];

export const STEP_LABELS: Record<VerificationStepKey, string> = {
  completude: "Complétude du dossier",
  identite: "Identité du déclarant",
  pieces: "Pièces et autorisations",
  coherence: "Cohérence de l’annonce",
  photos: "Contrôle des photos",
  interlocuteur: "Interlocuteur autorisé",
  "sur-place": "Contrôle sur place",
  decision: "Décision",
};

export const STEP_STATUSES = ["a-faire", "en-cours", "valide", "refuse", "non-applicable"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export type VerificationStatus =
  | "a-examiner"
  | "incomplet"
  | "en-cours"
  | "accepte"
  | "refuse"
  | "suspendu"
  | "a-reexaminer";

export type VerificationRow = {
  id: string;
  property_id: string;
  status: VerificationStatus;
  documentary_only: number;
  onsite_done: number;
  assigned_to: string | null;
  decision_note: string;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StepView = {
  key: VerificationStepKey;
  label: string;
  status: StepStatus;
  comment: string;
  internal: boolean;
  actor: string | null;
  updatedAt: string;
};

export type VerificationCase = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  propertyType: string;
  city: string;
  district: string;
  publicationStatus: string;
  verificationStatus: string;
  status: VerificationStatus;
  assignedTo: string | null;
  assignedName: string | null;
  documentaryOnly: boolean;
  onsiteDone: boolean;
  decisionNote: string;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Nombre de jours depuis le dépôt : sert aux indicateurs de retard. */
  ageDays: number;
  steps: StepView[];
  completedSteps: number;
  documents: number;
  photos: number;
};

export function ensureVerification(db: Db, propertyId: string): VerificationRow {
  const existing = queryOne<VerificationRow>("SELECT * FROM verifications WHERE property_id = ?", [propertyId]);
  if (existing) {
    ensureSteps(db, existing.id);
    return existing;
  }
  const id = newId("VER");
  const iso = nowIso();
  db.prepare(
    "INSERT INTO verifications (id, property_id, status, documentary_only, onsite_done, assigned_to, decision_note, decided_at, decided_by, created_at, updated_at) VALUES (?, ?, 'a-examiner', 1, 0, NULL, '', NULL, NULL, ?, ?)",
  ).run(id, propertyId, iso, iso);
  ensureSteps(db, id);
  return queryOne<VerificationRow>("SELECT * FROM verifications WHERE id = ?", [id])!;
}

function hydrateCase(db: Db, row: VerificationRow): VerificationCase {
  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ?`, [row.property_id])!;
  const steps = queryAll<{
    step_key: string;
    status: StepStatus;
    comment: string;
    internal: number;
    actor_id: string | null;
    updated_at: string;
  }>("SELECT step_key, status, comment, internal, actor_id, updated_at FROM verification_steps WHERE verification_id = ?", [
    row.id,
  ]);
  const stepViews: StepView[] = VERIFICATION_STEP_KEYS.map((key) => {
    const found = steps.find((entry) => entry.step_key === key);
    const actor = found?.actor_id
      ? queryOne<{ prenom: string; nom: string }>("SELECT prenom, nom FROM users WHERE id = ?", [found.actor_id])
      : null;
    return {
      key,
      label: STEP_LABELS[key],
      status: (found?.status ?? "a-faire") as StepStatus,
      comment: found?.comment ?? "",
      internal: (found?.internal ?? 1) === 1,
      actor: actor ? `${actor.prenom} ${actor.nom}`.trim() : null,
      updatedAt: found?.updated_at ?? row.updated_at,
    };
  });
  const assigned = row.assigned_to
    ? queryOne<{ prenom: string; nom: string }>("SELECT prenom, nom FROM users WHERE id = ?", [row.assigned_to])
    : null;
  const documents = queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM documents WHERE entity_type = 'bien' AND entity_id = ?",
    [row.property_id],
  );
  const photos = queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM property_photos WHERE property_id = ?",
    [row.property_id],
  );
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86_400_000));
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: property?.title ?? "Bien",
    propertyReference: property?.reference ?? "",
    propertyType: property?.type ?? "",
    city: property?.city ?? "",
    district: property?.district ?? "",
    publicationStatus: property?.publication_status ?? "brouillon",
    verificationStatus: property?.verification_status ?? "non-verifie",
    status: row.status,
    assignedTo: row.assigned_to,
    assignedName: assigned ? `${assigned.prenom} ${assigned.nom}`.trim() : null,
    documentaryOnly: row.documentary_only === 1,
    onsiteDone: row.onsite_done === 1,
    decisionNote: row.decision_note,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ageDays,
    steps: stepViews,
    completedSteps: stepViews.filter((step) => step.status === "valide" || step.status === "non-applicable").length,
    documents: documents?.count ?? 0,
    photos: photos?.count ?? 0,
  };
}

export function listVerificationCases(
  db: Db,
  filter: { status?: VerificationStatus[]; assignedTo?: string } = {},
): VerificationCase[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.status?.length) {
    clauses.push(`status IN (${filter.status.map(() => "?").join(", ")})`);
    params.push(...filter.status);
  }
  if (filter.assignedTo) {
    clauses.push("assigned_to = ?");
    params.push(filter.assignedTo);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = queryAll<VerificationRow>(`SELECT * FROM verifications ${where} ORDER BY created_at DESC`, params);
  return rows.map((row) => hydrateCase(db, row));
}

export function getVerificationCase(db: Db, propertyId: string): VerificationCase | null {
  const row = queryOne<VerificationRow>("SELECT * FROM verifications WHERE property_id = ?", [propertyId]);
  return row ? hydrateCase(db, row) : null;
}

/* ------------------------------------------------------------------
   INSTRUCTION
   ------------------------------------------------------------------ */

export function setStep(
  db: Db,
  actor: UserContext,
  propertyId: string,
  input: { stepKey: string; status: StepStatus; comment?: string; internal?: boolean },
  meta: { ip?: string } = {},
): ServiceResult<{ verification: VerificationCase }> {
  if (!canModerate(actor)) {
    return { ok: false, code: "permission", message: "Seule l’administration instruit un dossier de vérification." };
  }
  if (!(VERIFICATION_STEP_KEYS as readonly string[]).includes(input.stepKey)) {
    return { ok: false, message: "Étape inconnue." };
  }
  const verification = ensureVerification(db, propertyId);
  const iso = nowIso();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO verification_steps (id, verification_id, step_key, status, actor_id, comment, internal, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (verification_id, step_key)
       DO UPDATE SET status = excluded.status, actor_id = excluded.actor_id, comment = excluded.comment,
                     internal = excluded.internal, updated_at = excluded.updated_at`,
    ).run(
      newId("STP"),
      verification.id,
      input.stepKey,
      input.status,
      actor.id,
      input.comment ?? "",
      input.internal === false ? 0 : 1,
      iso,
    );
    if (input.stepKey === "sur-place") {
      db.prepare("UPDATE verifications SET onsite_done = ?, updated_at = ? WHERE id = ?").run(
        input.status === "valide" ? 1 : 0,
        iso,
        verification.id,
      );
    }
    if (input.status === "en-cours") {
      db.prepare("UPDATE verifications SET status = 'en-cours', updated_at = ? WHERE id = ? AND status = 'a-examiner'").run(
        iso,
        verification.id,
      );
    }
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "verification.etape",
      entityType: "bien",
      entityId: propertyId,
      detail: { etape: input.stepKey, statut: input.status, interne: input.internal !== false },
      ip: meta.ip,
    });
  })();
  return { ok: true, data: { verification: getVerificationCase(db, propertyId)! } };
}

/** Demander des pièces complémentaires : le dossier repasse « incomplet ». */
export function requestDocuments(
  db: Db,
  actor: UserContext,
  propertyId: string,
  message: string,
  meta: { ip?: string } = {},
): ServiceResult<{ verification: VerificationCase }> {
  if (!canModerate(actor)) return { ok: false, code: "permission", message: "Action réservée à l’administration." };
  if (!message.trim()) return { ok: false, message: "Précisez les pièces ou corrections attendues." };
  const verification = ensureVerification(db, propertyId);
  const iso = nowIso();
  db.transaction(() => {
    db.prepare("UPDATE verifications SET status = 'incomplet', decision_note = ?, updated_at = ? WHERE id = ?").run(
      message,
      iso,
      verification.id,
    );
    db.prepare(
      `INSERT INTO verification_steps (id, verification_id, step_key, status, actor_id, comment, internal, updated_at)
       VALUES (?, ?, 'pieces', 'refuse', ?, ?, 0, ?)
       ON CONFLICT (verification_id, step_key)
       DO UPDATE SET status = 'refuse', actor_id = excluded.actor_id, comment = excluded.comment, internal = 0, updated_at = excluded.updated_at`,
    ).run(newId("STP"), verification.id, actor.id, message, iso);
    const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ?`, [propertyId]);
    db.prepare("UPDATE properties SET verification_status = 'en-cours', updated_at = ? WHERE id = ?").run(iso, propertyId);
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "verification.pieces.demandees",
      entityType: "bien",
      entityId: propertyId,
      detail: { message },
      ip: meta.ip,
    });
    notify(db, {
      userIds: [property?.owner_id ?? null],
      type: "verification",
      title: "Pièces complémentaires demandées",
      body: `${property?.reference ?? propertyId} · ${message}`,
      link: "/proprietaire/biens",
      entityType: "bien",
      entityId: propertyId,
    });
  })();
  return { ok: true, data: { verification: getVerificationCase(db, propertyId)! } };
}

export function assignVerification(
  db: Db,
  actor: UserContext,
  propertyId: string,
  adminId: string | null,
): ServiceResult<{ verification: VerificationCase }> {
  if (!canModerate(actor)) return { ok: false, code: "permission", message: "Action réservée à l’administration." };
  const verification = ensureVerification(db, propertyId);
  db.prepare("UPDATE verifications SET assigned_to = ?, updated_at = ? WHERE id = ?").run(adminId, nowIso(), verification.id);
  writeAudit(db, {
    actorId: actor.id,
    actorLabel: actor.email,
    action: "verification.affectation",
    entityType: "bien",
    entityId: propertyId,
    detail: { adminId },
  });
  return { ok: true, data: { verification: getVerificationCase(db, propertyId)! } };
}

export function decideVerification(
  db: Db,
  actor: UserContext,
  propertyId: string,
  input: { decision: VerificationStatus; note?: string; documentRequest?: string },
  meta: { ip?: string } = {},
): ServiceResult<{ verification: VerificationCase }> {
  if (!canModerate(actor)) return { ok: false, code: "permission", message: "Action réservée à l’administration." };
  const verification = ensureVerification(db, propertyId);
  const iso = nowIso();
  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ?`, [propertyId]);
  if (!property) return { ok: false, message: "Bien introuvable." };

  db.transaction(() => {
    db.prepare(
      "UPDATE verifications SET status = ?, decision_note = ?, decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?",
    ).run(input.decision, input.note ?? "", iso, actor.id, iso, verification.id);
    db.prepare(
      `INSERT INTO verification_steps (id, verification_id, step_key, status, actor_id, comment, internal, updated_at)
       VALUES (?, ?, 'decision', ?, ?, ?, 1, ?)
       ON CONFLICT (verification_id, step_key)
       DO UPDATE SET status = excluded.status, actor_id = excluded.actor_id, comment = excluded.comment, updated_at = excluded.updated_at`,
    ).run(
      newId("STP"),
      verification.id,
      input.decision === "accepte" ? "valide" : input.decision === "refuse" ? "refuse" : "en-cours",
      actor.id,
      input.note ?? "",
      iso,
    );

    if (input.decision === "accepte") {
      db.prepare(
        "UPDATE properties SET verification_status = 'verifie', verified_on = ?, publication_status = 'publie', published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?",
      ).run(iso, iso, iso, propertyId);
    } else if (input.decision === "refuse") {
      db.prepare("UPDATE properties SET verification_status = 'refuse', publication_status = 'suspendu', updated_at = ? WHERE id = ?").run(
        iso,
        propertyId,
      );
    } else if (input.decision === "suspendu") {
      db.prepare("UPDATE properties SET verification_status = 'suspendu', publication_status = 'suspendu', updated_at = ? WHERE id = ?").run(
        iso,
        propertyId,
      );
    } else {
      db.prepare("UPDATE properties SET verification_status = 'en-cours', updated_at = ? WHERE id = ?").run(iso, propertyId);
    }

    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: `verification.${input.decision}`,
      entityType: "bien",
      entityId: propertyId,
      detail: { note: input.note ?? "", pieces: input.documentRequest ?? "" },
      ip: meta.ip,
    });

    const titles: Record<string, string> = {
      accepte: "Dossier accepté",
      refuse: "Dossier refusé",
      suspendu: "Bien suspendu",
      incomplet: "Pièces complémentaires demandées",
      "a-reexaminer": "Dossier à réexaminer",
      "en-cours": "Dossier en cours d’instruction",
      "a-examiner": "Dossier remis en file d’attente",
    };
    notify(db, {
      userIds: [property.owner_id],
      type: "verification",
      title: titles[input.decision] ?? "Dossier mis à jour",
      body: `${property.reference} · ${input.note || input.documentRequest || "Décision enregistrée par l’administration."}`,
      link: "/proprietaire/biens",
      entityType: "bien",
      entityId: propertyId,
    });
  })();

  if (input.documentRequest) {
    requestDocuments(db, actor, propertyId, input.documentRequest, meta);
  }
  return { ok: true, data: { verification: getVerificationCase(db, propertyId)! } };
}

import type { Db } from "../db/client";
import { newId, nowIso, queryAll } from "../db/client";
import { canEditProperty, canModerate, type UserContext } from "../authz";
import { writeAudit } from "../audit";
import { PROPERTY_COLUMNS, type PropertyRow } from "./properties";
import { activeAuthorizationFor } from "./authorizations";
import type { ServiceResult } from "./accounts";

/* ==================================================================
   HOMERA — PIÈCES DU DOSSIER
   ------------------------------------------------------------------
   Le téléversement des fichiers arrive avec le stockage (lot 3). Ce
   service enregistre dès maintenant la déclaration de la pièce : qui
   l’a déposée, quand, pour quel bien, et ce qu’elle prétend prouver.
   Un dossier soumis sans pièce déclarée n’est pas recevable.
   ================================================================== */

export type DocumentRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  kind: string;
  filename: string;
  storage_path: string;
  status: string;
  uploaded_by: string | null;
  created_at: string;
};

/**
 * Vocabulaire unique des pièces. `propriete` est conservé parce que des
 * dossiers déjà en base l’utilisent : on ne perd pas une donnée écrite.
 */
export const DOCUMENT_KINDS: Record<string, string> = {
  propriete: "Pièce de propriété",
  "titre-foncier": "Titre foncier",
  acd: "ACD / convention",
  identite: "Pièce d’identité",
  "piece-identite": "Pièce d’identité",
  mandat: "Mandat / procuration",
  plan: "Plan ou croquis",
  "plan-localisation": "Plan de localisation",
  quittance: "Quittance",
  autre: "Autre pièce",
};

/** Libellé lisible d’un type de pièce, quelle que soit son ancienneté. */
export function documentKindLabel(kind: string): string {
  return DOCUMENT_KINDS[kind] ?? kind;
}

export function listDocuments(db: Db, entityType: string, entityId: string): DocumentRow[] {
  return queryAll<DocumentRow>(
    "SELECT * FROM documents WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC",
    [entityType, entityId],
  );
}

export function declareDocument(
  db: Db,
  actor: UserContext,
  input: { entityType: "bien" | "utilisateur" | "mandat" | "verification"; entityId: string; kind: string; filename: string },
  meta: { ip?: string } = {},
): ServiceResult<{ documents: DocumentRow[] }> {
  const filename = input.filename.trim();
  if (!filename) return { ok: false, message: "Indiquez le nom de la pièce déposée.", fields: { filename: "Nom attendu." } };
  if (!Object.prototype.hasOwnProperty.call(DOCUMENT_KINDS, input.kind)) {
    return { ok: false, message: "Type de pièce inconnu." };
  }
  if (input.entityType === "bien") {
    const property = queryOneProperty(db, input.entityId);
    if (!property) return { ok: false, message: "Bien introuvable." };
    const authorization = activeAuthorizationFor(db, property.id, actor.id);
    if (!canEditProperty(actor, property, authorization) && !canModerate(actor)) {
      return { ok: false, code: "permission", message: "Vous n’avez pas accès au dossier de ce bien." };
    }
  }
  const id = newId("DOC");
  db.transaction(() => {
    db.prepare(
      "INSERT INTO documents (id, entity_type, entity_id, kind, filename, storage_path, status, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, '', 'declare', ?, ?)",
    ).run(id, input.entityType, input.entityId, input.kind, filename.slice(0, 200), actor.id, nowIso());
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "document.declare",
      entityType: input.entityType,
      entityId: input.entityId,
      detail: { kind: input.kind, filename },
      ip: meta.ip,
    });
  })();
  return { ok: true, data: { documents: listDocuments(db, input.entityType, input.entityId) } };
}

function queryOneProperty(db: Db, id: string): PropertyRow | null {
  return db.prepare(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`).get(id, id) as PropertyRow | null;
}

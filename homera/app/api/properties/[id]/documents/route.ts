import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { canReadPropertyDossier } from "@/lib/server/authz";
import { activeAuthorizationFor } from "@/lib/server/services/authorizations";
import { declareDocument, listDocuments } from "@/lib/server/services/documents";
import { PROPERTY_COLUMNS, type PropertyRow } from "@/lib/server/services/properties";
import { queryOne } from "@/lib/server/db/client";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Les pièces d’un dossier sont privées : on ne les liste qu’après avoir
 * établi que l’appelant est le propriétaire, l’agent mandaté actif ou
 * l’administration. Un identifiant deviné ne donne accès à rien.
 */
function guard(propertyId: string) {
  const db = getDb();
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  return row ? { db, row } : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const found = guard(id);
  if (!found) return fail("Bien introuvable.", 404);
  const authorization = activeAuthorizationFor(found.db, found.row.id, user.id);
  if (!canReadPropertyDossier(user, found.row, authorization)) {
    return fail("Vous n’avez pas accès aux pièces de ce dossier.", 403, { code: "permission" });
  }
  return ok({ documents: listDocuments(found.db, "bien", found.row.id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const body = await readJson(request);
  const kind = typeof body.kind === "string" ? body.kind : "";
  const filename = typeof body.filename === "string" ? body.filename : "";
  if (!kind || !filename) return fail("Indiquez le type et le nom de la pièce.", 400, { fields: { filename: "Nom attendu." } });
  return fromService(
    declareDocument(getDb(), user, { entityType: "bien", entityId: id, kind, filename }, { ip: clientIp(request) }),
    201,
  );
}

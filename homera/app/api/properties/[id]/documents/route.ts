import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { declareDocument, listDocuments } from "@/lib/server/services/documents";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ok({ documents: listDocuments(getDb(), "bien", id) });
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

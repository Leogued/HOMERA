import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { loadProperty, updateProperty } from "@/lib/server/services/properties";
import { parseInput, propertyDraftSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = loadProperty(getDb(), id);
  if (!property) return fail("Bien introuvable.", 404, { code: "introuvable" });
  return ok({ property });
}

/** Modification : le propriétaire, l’agent mandaté (selon sa portée) ou l’administration. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const parsed = parseInput(propertyDraftSchema.partial(), await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(updateProperty(getDb(), user, id, parsed.data, { ip: clientIp(request) }));
}

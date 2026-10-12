import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { createAuthorization, expireAuthorizations, listAuthorizations } from "@/lib/server/services/authorizations";
import { parseInput, authorizationRequestSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";
import { isAdminRole } from "@/lib/server/authz";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "mine";
  const db = getDb();
  expireAuthorizations(db);
  if (scope === "all" && isAdminRole(user.roles)) {
    return ok({ authorizations: listAuthorizations(db, {}) });
  }
  const asOwner = listAuthorizations(db, { ownerId: user.id });
  const asAgent = listAuthorizations(db, { agentId: user.id });
  const seen = new Set<string>();
  const authorizations = [...asOwner, ...asAgent].filter((entry) =>
    seen.has(entry.id) ? false : (seen.add(entry.id), true),
  );
  return ok({ authorizations, pending: authorizations.filter((entry) => entry.status === "en-attente").length });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const parsed = parseInput(authorizationRequestSchema, await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(createAuthorization(getDb(), user, parsed.data, { ip: clientIp(request) }), 201);
}

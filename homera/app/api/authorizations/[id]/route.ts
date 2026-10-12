import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { authorizationHistory, decideAuthorization, getAuthorization } from "@/lib/server/services/authorizations";
import { parseInput, authorizationDecisionSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";
import { isAdminRole } from "@/lib/server/authz";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const authorization = getAuthorization(getDb(), id);
  if (!authorization) return fail("Demande introuvable.", 404);
  const involved =
    authorization.ownerId === user.id ||
    authorization.agentId === user.id ||
    isAdminRole(user.roles);
  if (!involved) return fail("Cette demande ne vous concerne pas.", 403, { code: "permission" });
  return ok({ authorization, history: authorizationHistory(getDb(), authorization.id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const parsed = parseInput(authorizationDecisionSchema, await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(decideAuthorization(getDb(), user, id, parsed.data, { ip: clientIp(request) }));
}

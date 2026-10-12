import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { decideVisit, getVisit, visitHistory } from "@/lib/server/services/visits";
import { parseInput, visitDecisionSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const visit = getVisit(getDb(), id);
  if (!visit) return fail("Visite introuvable.", 404);
  return ok({ visit, history: visitHistory(getDb(), visit.id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const parsed = parseInput(visitDecisionSchema, await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(decideVisit(getDb(), user, id, parsed.data, { ip: clientIp(request) }));
}

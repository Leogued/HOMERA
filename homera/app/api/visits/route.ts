import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { listVisits, requestVisit } from "@/lib/server/services/visits";
import { parseInput, visitRequestSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, ok, readJson, toStringArray } from "@/lib/server/http";
import type { VisitStatus } from "@/lib/server/services/visits";

export const dynamic = "force-dynamic";

/** Les visites visibles par l’appelant : client, propriétaire, agent mandaté, administration. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const url = new URL(request.url);
  const status = toStringArray(url.searchParams.get("statut")) as VisitStatus[];
  const db = getDb();
  const scope = url.searchParams.get("scope");
  if (scope === "admin" && (user.roles.includes("admin") || user.roles.includes("superadmin"))) {
    return ok({ visits: listVisits(db, status.length ? { status } : {}) });
  }
  const mine = [
    ...listVisits(db, { clientId: user.id, ...(status.length ? { status } : {}) }),
    ...listVisits(db, { ownerId: user.id, ...(status.length ? { status } : {}) }),
    ...listVisits(db, { agentId: user.id, ...(status.length ? { status } : {}) }),
  ];
  const seen = new Set<string>();
  const visits = mine.filter((visit) => (seen.has(visit.id) ? false : (seen.add(visit.id), true)));
  return ok({ visits });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Connectez-vous pour demander une visite.", 401, { code: "non-authentifie" });
  const parsed = parseInput(visitRequestSchema, await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(requestVisit(getDb(), user, parsed.data, { ip: clientIp(request) }), 201);
}

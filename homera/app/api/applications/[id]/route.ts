import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { decideApplication, getApplication } from "@/lib/server/services/applications";
import { parseInput, applicationDecisionSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const application = getApplication(getDb(), id, user);
  if (!application) return fail("Candidature introuvable ou hors de votre portée.", 404);
  return ok({ application });
}

/** Instruction : étudier, accepter, refuser (motivé) ou retirer sa propre candidature. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const parsed = parseInput(applicationDecisionSchema, await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(decideApplication(getDb(), user, id, parsed.data, { ip: clientIp(request) }));
}

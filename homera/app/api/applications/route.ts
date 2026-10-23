import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { createApplication, listApplications } from "@/lib/server/services/applications";
import { parseInput, applicationDraftSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Candidatures visibles par l’appelant : les siennes, celles de ses biens, ou toutes pour l’administration. */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  return ok({ applications: listApplications(getDb(), user) });
}

/** Dépôt d’un dossier : visite effectuée exigée, sauf bien explicitement réservable sans visite (vérifié par le serveur). */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Connectez-vous pour déposer une demande de location.", 401, { code: "non-authentifie" });
  const parsed = parseInput(applicationDraftSchema, await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(createApplication(getDb(), user, parsed.data, { ip: clientIp(request) }), 201);
}

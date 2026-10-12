import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { setReportStatus } from "@/lib/server/services/admin";
import { canModerate } from "@/lib/server/authz";
import { clientIp, fail, fromService, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Prendre en charge, clore ou rejeter un signalement d’annonce. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!canModerate(user)) return fail("Accès réservé à l’administration.", 403, { code: "permission" });
  const body = await readJson(request);
  const status = body.status === "en-cours" || body.status === "clos" || body.status === "rejete" ? body.status : null;
  if (!status) return fail("Statut de signalement invalide.");
  return fromService(setReportStatus(getDb(), user, id, status, { ip: clientIp(request) }));
}

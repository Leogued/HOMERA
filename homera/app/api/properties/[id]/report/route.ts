import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { createReport } from "@/lib/server/services/admin";
import { parseInput, reportSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Signaler une annonce.
 *
 * N’importe quel visiteur — connecté ou non — peut signaler : c’est le
 * seul moyen de remonter une annonce trompeuse avant qu’un contrôle
 * n’ait lieu. L’écriture est réelle, les administrateurs sont notifiés,
 * et le signalement arrive dans /admin/signalements.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const parsed = parseInput(reportSchema, { ...(await readJson(request)), propertyId: id });
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(
    createReport(getDb(), user, { propertyId: id, reason: parsed.data.reason, detail: parsed.data.detail }, { ip: clientIp(request) }),
    201,
  );
}

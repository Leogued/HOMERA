import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { recentAudit } from "@/lib/server/services/admin";
import { listAudit } from "@/lib/server/audit";
import { fail, ok } from "@/lib/server/http";
import { canModerate } from "@/lib/server/authz";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!canModerate(user)) return fail("Accès réservé à l’administration.", 403, { code: "permission" });
  const url = new URL(request.url);
  const entityType = url.searchParams.get("type");
  const entityId = url.searchParams.get("id");
  const db = getDb();
  const entries = entityType
    ? listAudit(db, { entityType, entityId: entityId ?? undefined, limit: 100 })
    : recentAudit(db, 80);
  return ok({ entries });
}

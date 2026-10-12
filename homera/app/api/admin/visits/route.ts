import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { adminVisitBoard } from "@/lib/server/services/visits";
import { fail, ok } from "@/lib/server/http";
import { canModerate } from "@/lib/server/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!canModerate(user)) return fail("Accès réservé à l’administration.", 403, { code: "permission" });
  return ok({ visits: adminVisitBoard(getDb()) });
}

import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { setUserStatus } from "@/lib/server/services/admin";
import { setStaffRole } from "@/lib/server/services/accounts";
import { clientIp, fail, fromService, readJson } from "@/lib/server/http";
import { canModerate } from "@/lib/server/authz";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!canModerate(user)) return fail("Accès réservé à l’administration.", 403, { code: "permission" });
  const body = await readJson(request);
  const db = getDb();

  if (typeof body.role === "string" || body.role === null) {
    const role = body.role === "admin" || body.role === "superadmin" || body.role === null ? body.role : undefined;
    if (role === undefined) return fail("Rôle d’administration invalide.");
    return fromService(setStaffRole(db, { actor: user, userId: id, role }));
  }

  const status = body.status === "suspendu" ? "suspendu" : body.status === "actif" ? "actif" : null;
  if (!status) return fail("Statut invalide.");
  return fromService(setUserStatus(db, user, id, status, String(body.reason ?? ""), { ip: clientIp(request) }));
}

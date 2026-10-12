import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { addRole } from "@/lib/server/services/accounts";
import { clientIp, fail, fromService, readJson } from "@/lib/server/http";
import { isAccountRole } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée : reconnectez-vous pour continuer.", 401, { code: "non-authentifie" });
  const body = await readJson(request);
  const role = isAccountRole(body.role) ? body.role : null;
  if (!role) return fail("Rôle invalide.");
  const values = (body.values && typeof body.values === "object" ? body.values : {}) as Record<string, string | boolean>;
  return fromService(await addRole(getDb(), { userId: user.id, role, values, ip: clientIp(request) }));
}

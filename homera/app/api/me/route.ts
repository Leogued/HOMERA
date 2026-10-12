import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { changeEmail, updateProfile } from "@/lib/server/services/accounts";
import { fail, fromService, readJson } from "@/lib/server/http";

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée : reconnectez-vous pour continuer.", 401, { code: "non-authentifie" });
  const body = await readJson(request);
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") patch[key] = value;
    if (typeof value === "boolean") patch[key] = value ? "true" : "false";
  }
  return fromService(updateProfile(getDb(), user.id, patch));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée : reconnectez-vous pour continuer.", 401, { code: "non-authentifie" });
  const body = await readJson(request);
  const email = typeof body.email === "string" ? body.email : "";
  if (!email) return fail("Indiquez la nouvelle adresse.", 400, { fields: { email: "Adresse attendue." } });
  return fromService(changeEmail(getDb(), user.id, email));
}

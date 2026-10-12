import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { issueVerificationCode, verifyEmailCode } from "@/lib/server/services/accounts";
import { fail, fromService, ok, readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée : reconnectez-vous pour continuer.", 401, { code: "non-authentifie" });
  const body = await readJson(request);
  const db = getDb();
  const action = typeof body.action === "string" ? body.action : "verifier";

  if (action === "renvoyer") {
    const issued = issueVerificationCode(db, user.id, user.email);
    if (!issued) return fail("Le code n’a pas pu être émis. Réessayez.");
    return ok({ code: issued.code, expiresAt: issued.expiresAt });
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!code) return fail("Saisissez le code reçu.", 400, { fields: { code: "Code attendu." } });
  return fromService(verifyEmailCode(db, user.id, code));
}

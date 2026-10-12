import { getDb } from "@/lib/server/db/client";
import { requestPasswordReset } from "@/lib/server/services/accounts";
import { clientIp, fail, fromService, readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = typeof body.email === "string" ? body.email : "";
  if (!email) return fail("Indiquez l’adresse e-mail du compte.", 400, { fields: { email: "Adresse attendue." } });
  return fromService(requestPasswordReset(getDb(), email, clientIp(request)));
}

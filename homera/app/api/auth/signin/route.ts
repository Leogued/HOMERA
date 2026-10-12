import { getDb } from "@/lib/server/db/client";
import { signIn } from "@/lib/server/services/accounts";
import { writeSessionCookie } from "@/lib/server/auth/current";
import { clientIp, fail, fromService, ok, readJson, toBoolean, userAgent } from "@/lib/server/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return fail("Indiquez votre adresse e-mail et votre mot de passe.");
  const remember = body.remember === undefined ? true : toBoolean(body.remember);
  const db = getDb();
  const result = await signIn(db, {
    email,
    password,
    remember,
    ip: clientIp(request),
    userAgent: userAgent(request),
  });
  if (!result.ok) return fromService(result);
  await writeSessionCookie(result.data.sessionToken, remember, result.data.sessionExpiresAt);
  return ok({ account: result.data.account, needsVerification: result.data.needsVerification, landing: result.data.landing });
}

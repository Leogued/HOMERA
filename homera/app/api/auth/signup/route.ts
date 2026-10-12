import { getDb } from "@/lib/server/db/client";
import { signUp } from "@/lib/server/services/accounts";
import { writeSessionCookie } from "@/lib/server/auth/current";
import { clientIp, fail, fromService, ok, readJson, toBoolean, userAgent } from "@/lib/server/http";
import { isAccountRole } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await readJson(request);
  const role = isAccountRole(body.role) ? body.role : null;
  if (!role) return fail("Choisissez le type de compte à créer.");
  const values = (body.values && typeof body.values === "object" ? body.values : {}) as Record<string, string | boolean>;
  const remember = body.remember === undefined ? true : toBoolean(body.remember);
  const db = getDb();
  const result = await signUp(db, {
    role,
    values,
    ip: clientIp(request),
    userAgent: userAgent(request),
    remember,
  });
  if (!result.ok) return fromService(result, 201);
  await writeSessionCookie(result.data.sessionToken, remember, result.data.sessionExpiresAt);
  return ok(
    {
      account: result.data.account,
      code: result.data.code,
      codeExpiresAt: result.data.codeExpiresAt,
      emailSent: result.data.emailSent,
      landing: result.data.landing,
    },
    201,
  );
}

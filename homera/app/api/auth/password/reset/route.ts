import { getDb } from "@/lib/server/db/client";
import { resetPassword } from "@/lib/server/services/accounts";
import { fromService, readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  return fromService(
    await resetPassword(getDb(), {
      token: typeof body.token === "string" ? body.token : undefined,
      code: typeof body.code === "string" ? body.code : undefined,
      password: typeof body.password === "string" ? body.password : "",
      confirmation: typeof body.confirmation === "string" ? body.confirmation : "",
    }),
  );
}

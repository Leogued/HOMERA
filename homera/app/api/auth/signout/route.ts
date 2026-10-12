import { destroySession } from "@/lib/server/auth/current";
import { ok } from "@/lib/server/http";

export async function POST() {
  await destroySession();
  return ok({ signedOut: true });
}

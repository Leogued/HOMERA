import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { cancelContract, getContract, signContract } from "@/lib/server/services/contracts";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const { id } = await params;
  const result = getContract(getDb(), user, id);
  if (!result.ok) return fromService(result);
  return ok({ contract: result.data });
}

/** Signature (locataire) ou annulation motivée (locataire, propriétaire, administration). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const { id } = await params;
  const payload = await readJson(request);
  const action = payload.action === "annuler" ? "annuler" : "signer";
  if (action === "signer") {
    return fromService(signContract(getDb(), user, id, String(payload.fullName ?? ""), { ip: clientIp(request) }));
  }
  return fromService(cancelContract(getDb(), user, id, String(payload.reason ?? ""), { ip: clientIp(request) }));
}

import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { propertiesOfOwner } from "@/lib/server/services/properties";
import { fail, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Biens dont le compte est réellement propriétaire — jamais une liste vide présentée comme un droit. */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!user.accountRoles.includes("proprietaire")) {
    return fail("Cet espace demande le rôle propriétaire.", 403, { code: "permission" });
  }
  return ok({ properties: propertiesOfOwner(getDb(), user.id) });
}

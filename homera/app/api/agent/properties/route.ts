import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { agentWorkspaceProperties } from "@/lib/server/services/properties";
import { fail, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Biens réellement couverts par un mandat actif — jamais déduits d’une déclaration. */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!user.accountRoles.includes("agent")) {
    return fail("Cet espace demande le rôle agent.", 403, { code: "permission" });
  }
  const properties = agentWorkspaceProperties(getDb(), user.id);
  return ok({ properties, matricule: user.agentMatricule });
}

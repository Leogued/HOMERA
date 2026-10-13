import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { createContractFromApplication, listContracts } from "@/lib/server/services/contracts";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Contrats de l’appelant : ceux qu’il signe, ceux de ses biens, ou tous pour l’administration. */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  return ok({ contracts: listContracts(getDb(), user) });
}

/** Rédiger un contrat à partir d’une candidature acceptée. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Connectez-vous pour rédiger un contrat.", 401, { code: "non-authentifie" });
  const payload = await readJson(request);
  const applicationId = typeof payload.applicationId === "string" ? payload.applicationId : "";
  if (!applicationId) {
    return fail("Rattachez le contrat à une candidature acceptée.", 400, {
      fields: { applicationId: "Rattachez le contrat à une candidature acceptée." },
    });
  }
  const startDate = typeof payload.startDate === "string" ? payload.startDate : "";
  const months = typeof payload.months === "number" ? payload.months : undefined;
  const depositMonths = typeof payload.depositMonths === "number" ? payload.depositMonths : undefined;
  return fromService(
    createContractFromApplication(getDb(), user, applicationId, { startDate, months, depositMonths }, { ip: clientIp(request) }),
    201,
  );
}

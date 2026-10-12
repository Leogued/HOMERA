import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { decideVerification, getVerificationCase, requestDocuments, setStep } from "@/lib/server/services/verifications";
import { parseInput, verificationDecisionSchema, verificationStepSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";
import { canModerate } from "@/lib/server/authz";
import type { StepStatus } from "@/lib/server/services/verifications";
import type { VerificationStatus } from "@/lib/server/services/verifications";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!canModerate(user)) return fail("Accès réservé à l’administration.", 403, { code: "permission" });
  const verification = getVerificationCase(getDb(), propertyId);
  if (!verification) return fail("Dossier introuvable.", 404);
  return ok({ verification });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!canModerate(user)) return fail("Accès réservé à l’administration.", 403, { code: "permission" });
  const body = await readJson(request);

  if (typeof body.action === "string" && body.action === "pieces") {
    const message = typeof body.message === "string" ? body.message : "";
    return fromService(requestDocuments(getDb(), user, propertyId, message, { ip: clientIp(request) }));
  }

  if (typeof body.decision === "string") {
    const parsed = parseInput(verificationDecisionSchema, body);
    if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
    return fromService(
      decideVerification(
        getDb(),
        user,
        propertyId,
        {
          decision: parsed.data.decision as VerificationStatus,
          note: parsed.data.note,
          documentRequest: parsed.data.documentRequest,
        },
        { ip: clientIp(request) },
      ),
    );
  }

  const parsed = parseInput(verificationStepSchema, body);
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(
    setStep(
      getDb(),
      user,
      propertyId,
      { stepKey: parsed.data.stepKey, status: parsed.data.status as StepStatus, comment: parsed.data.comment, internal: parsed.data.internal },
      { ip: clientIp(request) },
    ),
  );
}

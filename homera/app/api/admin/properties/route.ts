import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { adminProperties, setPublicationStatus } from "@/lib/server/services/properties";
import { canModerate } from "@/lib/server/authz";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Catalogue vu par l’administration : tous les statuts, avec le propriétaire et l’agent mandaté. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!canModerate(user)) return fail("Accès réservé à l’administration.", 403, { code: "permission" });
  const url = new URL(request.url);
  return ok({
    properties: adminProperties(getDb(), {
      q: url.searchParams.get("q") ?? "",
      publication: url.searchParams.get("publication") ?? "",
    }),
  });
}

/** Publication : remettre en ligne, suspendre, archiver ou renvoyer en instruction. */
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  if (!canModerate(user)) return fail("Accès réservé à l’administration.", 403, { code: "permission" });
  const body = await readJson(request);
  const status = body.status === "publie" || body.status === "suspendu" || body.status === "archive" || body.status === "soumis" ? body.status : null;
  if (!status) return fail("Statut de publication invalide.");
  const id = typeof body.propertyId === "string" ? body.propertyId : "";
  if (!id) return fail("Indiquez le bien concerné.");
  return fromService(
    setPublicationStatus(getDb(), user, id, { status, reason: String(body.reason ?? "") }, { ip: clientIp(request) }),
  );
}

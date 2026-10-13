import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { contactableProperties, listConversations, openConversation, unreadMessageCount } from "@/lib/server/services/messaging";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Les conversations de l’appelant — uniquement celles dont il est
 * participant, avec le nombre de messages qu’il n’a pas encore lus.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const db = getDb();
  return ok({
    conversations: listConversations(db, user),
    unread: unreadMessageCount(db, user),
    contactable: contactableProperties(db, user),
  });
}

/** Ouvre une conversation sur un bien : droits vérifiés, destinataires réels, notifications envoyées. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Connectez-vous pour écrire au propriétaire.", 401, { code: "non-authentifie" });
  const payload = await readJson(request);
  const body = typeof payload.body === "string" ? payload.body : "";
  const propertyId = typeof payload.propertyId === "string" ? payload.propertyId : "";
  if (!propertyId) return fail("Choisissez le bien concerné.", 400, { fields: { propertyId: "Choisissez le bien concerné." } });
  if (body.trim().length < 4) {
    return fail("Votre message est trop court pour être envoyé.", 400, {
      fields: { body: "Votre message est trop court pour être envoyé." },
    });
  }
  const visitId = typeof payload.visitId === "string" && payload.visitId ? payload.visitId : null;
  const subject = typeof payload.subject === "string" ? payload.subject.slice(0, 140) : "";
  return fromService(
    openConversation(getDb(), user, { propertyId, visitId, subject, body }, { ip: clientIp(request) }),
    201,
  );
}

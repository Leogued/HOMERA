import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { markConversationRead, postMessage, readConversation } from "@/lib/server/services/messaging";
import { clientIp, fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Un fil : refusé net si l’appelant n’en est pas participant. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const { id } = await params;
  const result = readConversation(getDb(), user, id);
  if (!result.ok) return fromService(result);
  return ok({ conversation: result.data });
}

/** Répondre dans un fil existant. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const { id } = await params;
  const payload = await readJson(request);
  const body = typeof payload.body === "string" ? payload.body : "";
  return fromService(postMessage(getDb(), user, id, body, { ip: clientIp(request) }), 201);
}

/** Marquer comme lu — le curseur est propre à l’appelant. */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const { id } = await params;
  return fromService(markConversationRead(getDb(), user, id));
}

import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { listNotifications, markRead, unreadCount } from "@/lib/server/notifications";
import { fail, ok, readJson, toBoolean, toStringArray } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const url = new URL(request.url);
  const db = getDb();
  const unreadOnly = toBoolean(url.searchParams.get("unread"));
  const items = listNotifications(db, user.id, { unreadOnly });
  return ok({ items, unread: unreadCount(db, user.id) });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const body = await readJson(request);
  const ids = toStringArray(body.ids);
  const updated = markRead(getDb(), user.id, ids.length ? ids : undefined);
  return ok({ updated });
}

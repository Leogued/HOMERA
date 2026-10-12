import { currentUser } from "@/lib/server/auth/current";
import { getDb } from "@/lib/server/db/client";
import { accessibleWorkspaces, defaultLanding } from "@/lib/server/authz";
import { unreadCount } from "@/lib/server/notifications";
import { publicAccount } from "@/lib/server/services/accounts";
import { ok } from "@/lib/server/http";
import type { SessionResponse } from "@/lib/server/contracts";

export const dynamic = "force-dynamic";

/** État de session : la seule façon, pour l’interface, de savoir qui elle est. */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    const payload: SessionResponse = {
      authenticated: false,
      account: null,
      workspaces: [],
      landing: "/client",
      unreadNotifications: 0,
    };
    return ok(payload);
  }
  const db = getDb();
  const payload: SessionResponse = {
    authenticated: true,
    account: publicAccount(user),
    workspaces: accessibleWorkspaces(user.roles),
    landing: defaultLanding(user.roles),
    unreadNotifications: unreadCount(db, user.id),
  };
  return ok(payload);
}

import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { submitProperty } from "@/lib/server/services/properties";
import { clientIp, fail, fromService } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  return fromService(submitProperty(getDb(), user, id, { ip: clientIp(request) }));
}

import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/server/services/favorites";
import { fail, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  return ok(listFavorites(getDb(), user.id));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const body = await readJson(request);
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  if (!propertyId) return fail("Indiquez le bien concerné.");
  const added = addFavorite(getDb(), user.id, propertyId);
  if (!added.ok) return fail(added.message, 404);
  return ok(added.data);
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (!propertyId) return fail("Indiquez le bien concerné.");
  const removed = removeFavorite(getDb(), user.id, propertyId);
  if (!removed.ok) return fail(removed.message);
  return ok(removed.data);
}

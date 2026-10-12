import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { listProperties } from "@/lib/server/services/properties";
import { fail, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const db = getDb();
  const rows = db
    .prepare<[string], { property_id: string }>("SELECT property_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id);
  const ids = new Set(rows.map((row) => row.property_id));
  const items = listProperties(db).filter((property) => ids.has(property.id));
  return ok({ items, ids: [...ids] });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const body = await readJson(request);
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  if (!propertyId) return fail("Indiquez le bien concerné.");
  const db = getDb();
  const exists = db.prepare<[string], { id: string }>("SELECT id FROM properties WHERE id = ?").get(propertyId);
  if (!exists) return fail("Bien introuvable.", 404);
  db.prepare("INSERT OR IGNORE INTO favorites (user_id, property_id, created_at) VALUES (?, ?, ?)").run(
    user.id,
    propertyId,
    new Date().toISOString(),
  );
  return ok({ favorite: true });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (!propertyId) return fail("Indiquez le bien concerné.");
  getDb().prepare("DELETE FROM favorites WHERE user_id = ? AND property_id = ?").run(user.id, propertyId);
  return ok({ favorite: false });
}

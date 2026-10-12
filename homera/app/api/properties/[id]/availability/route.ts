import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { availabilityWindows, currentUnavailability, setAvailability } from "@/lib/server/services/properties";
import { parseInput, availabilitySchema } from "@/lib/server/validation";
import { fail, fromService, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const property = db.prepare<[string, string], { id: string }>("SELECT id FROM properties WHERE id = ? OR reference = ?").get(id, id);
  if (!property) return fail("Bien introuvable.", 404);
  return ok({
    windows: availabilityWindows(db, property.id),
    current: currentUnavailability(db, property.id),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const parsed = parseInput(availabilitySchema, await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(setAvailability(getDb(), user, id, parsed.data), 201);
}

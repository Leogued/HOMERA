import { getDb } from "@/lib/server/db/client";
import { listSlots } from "@/lib/server/services/visits";
import { ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Créneaux de visite proposés pour un bien (lecture publique). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const property = db.prepare<[string, string], { id: string }>("SELECT id FROM properties WHERE id = ? OR reference = ?").get(id, id);
  if (!property) return ok({ slots: [] });
  return ok({ slots: listSlots(db, property.id, { onlyOpen: true }) });
}

import type { Db } from "../db/client";
import { nowIso, queryAll, queryOne } from "../db/client";
import { listProperties } from "./properties";
import type { Property } from "../../content";
import type { ServiceResult } from "./accounts";

/* ==================================================================
   HOMERA — FAVORIS DU COMPTE (service serveur)
   ------------------------------------------------------------------
   La liste est lue sur le compte : le cœur d'une fiche, la page
   publique /favoris et l'espace client montrent exactement la même
   liste. L'ordre est garanti : le plus récemment ajouté d'abord
   (created_at DESC), pour un tri « Plus récents » honnête.
   ================================================================== */

export function listFavorites(db: Db, userId: string): { items: Property[]; ids: string[] } {
  const rows = queryAll<{ property_id: string }>(
    "SELECT property_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
  const ids = rows.map((row) => row.property_id);
  const rank = new Map(ids.map((id, index) => [id, index]));
  const items = listProperties(db)
    .filter((property) => rank.has(property.id))
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  return { items, ids };
}

export function addFavorite(
  db: Db,
  userId: string,
  propertyId: string,
): ServiceResult<{ favorite: true }> {
  const exists = queryOne<{ id: string }>("SELECT id FROM properties WHERE id = ?", [propertyId]);
  if (!exists) {
    return { ok: false, code: "introuvable", message: "Bien introuvable." };
  }
  db.prepare("INSERT OR IGNORE INTO favorites (user_id, property_id, created_at) VALUES (?, ?, ?)").run(
    userId,
    propertyId,
    nowIso(),
  );
  return { ok: true, data: { favorite: true } };
}

export function removeFavorite(
  db: Db,
  userId: string,
  propertyId: string,
): ServiceResult<{ favorite: false }> {
  db.prepare("DELETE FROM favorites WHERE user_id = ? AND property_id = ?").run(userId, propertyId);
  return { ok: true, data: { favorite: false } };
}

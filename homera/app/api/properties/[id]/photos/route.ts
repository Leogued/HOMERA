import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { addPhoto, removePhoto, reorderPhotos, setMainPhoto } from "@/lib/server/services/properties";
import { parseInput, photoSchema } from "@/lib/server/validation";
import { fail, fromService, ok, readJson, toStringArray } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const property = db.prepare<[string, string], { id: string }>("SELECT id FROM properties WHERE id = ? OR reference = ?").get(id, id);
  if (!property) return fail("Bien introuvable.", 404);
  const photos = db
    .prepare("SELECT * FROM property_photos WHERE property_id = ? ORDER BY position ASC, created_at ASC")
    .all(property.id);
  return ok({ photos });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const parsed = parseInput(photoSchema, await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(addPhoto(getDb(), user, id, parsed.data), 201);
}

/** Réorganisation de la galerie : l’ordre est enregistré durablement. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const body = await readJson(request);
  if (typeof body.main === "string") {
    return fromService(setMainPhoto(getDb(), user, id, body.main));
  }
  const requested = toStringArray(body.order);
  if (requested.length === 0) return fail("Indiquez l’ordre des photos.");
  // L’écran manipule des visuels, pas des identifiants internes : la
  // traduction se fait ici, côté serveur.
  const db = getDb();
  const rows = db
    .prepare<[string, string], { id: string }>("SELECT id FROM properties WHERE id = ? OR reference = ?")
    .get(id, id);
  if (!rows) return fail("Bien introuvable.", 404);
  const known = db
    .prepare<[string], { id: string; media_key: string }>("SELECT id, media_key FROM property_photos WHERE property_id = ?")
    .all(rows.id);
  const order = requested
    .map((key) => known.find((photo) => photo.media_key === key)?.id ?? key)
    .filter((photoId) => known.some((photo) => photo.id === photoId));
  if (order.length === 0) return fail("Aucune photo ne correspond à l’ordre envoyé.");
  return fromService(reorderPhotos(db, user, id, order));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const url = new URL(request.url);
  const photoId = url.searchParams.get("photo");
  if (!photoId) return fail("Indiquez la photo à retirer.");
  return fromService(removePhoto(getDb(), user, id, photoId));
}

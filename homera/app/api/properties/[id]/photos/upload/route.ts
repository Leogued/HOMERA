import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { uploadPhotos } from "@/lib/server/services/properties";
import { fail, fromService } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Envoi de photos réelles (`multipart/form-data`, champ `photos`,
 * plusieurs fichiers acceptés).
 *
 * Tout est vérifié côté serveur : la session, le droit sur le bien, le
 * poids réel des octets reçus et la nature du fichier lue dans son
 * en-tête. Le nom annoncé par le navigateur ne sert qu’à l’affichage,
 * jamais à écrire sur le disque.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Envoi illisible : le formulaire n’a pas pu être lu.", 400);
  }

  const entries = [...form.getAll("photos"), ...form.getAll("photo")].filter(
    (entry): entry is File => typeof entry !== "string" && typeof (entry as File).arrayBuffer === "function",
  );
  if (entries.length === 0) {
    return fail("Choisissez une photo à envoyer.", 400, { fields: { photo: "Choisissez une photo." } });
  }

  const payload = await Promise.all(
    entries.map(async (file) => ({
      name: typeof file.name === "string" && file.name ? file.name : "photo",
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  );

  const result = uploadPhotos(getDb(), user, id, payload);
  if (!result.ok) return fromService(result);

  const { added, rejected } = result.data;
  const message =
    rejected.length === 0
      ? added === 1
        ? "Photo ajoutée."
        : `${added} photos ajoutées.`
      : `${added === 1 ? "1 photo ajoutée" : `${added} photos ajoutées`} · ${rejected.length} refusée(s) : ${rejected
          .map((entry) => `${entry.name} — ${entry.reason}`)
          .join(" ; ")}`;

  return Response.json({ ok: true, message, data: result.data }, { status: 201 });
}

import fs from "node:fs";
import path from "node:path";
import { contentTypeOf, resolveUpload, UPLOAD_URL_PREFIX } from "@/lib/server/uploads";

export const dynamic = "force-dynamic";

/**
 * Diffusion des photos téléversées.
 *
 * Les fichiers ne sont pas dans `public/` : ce dossier est figé à la
 * compilation, un fichier écrit après le build ne serait pas servi. Ils
 * sont donc lus depuis `data/uploads` et rendus ici, avec trois gardes :
 * le chemin doit rester sous la racine des téléversements, l’extension
 * doit être une image connue, et aucun dossier n’est listé.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const url = UPLOAD_URL_PREFIX + segments.join("/");
  const file = resolveUpload(url);
  if (!file) return new Response("Fichier introuvable.", { status: 404 });

  const contentType = contentTypeOf(path.extname(file).slice(1).toLowerCase());
  if (!contentType) return new Response("Type de fichier non pris en charge.", { status: 415 });

  const bytes = fs.readFileSync(file);
  return new Response(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
      /* Le nom de fichier est un identifiant unique : la réponse peut
         être mise en cache sans risque de servir une ancienne photo. */
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

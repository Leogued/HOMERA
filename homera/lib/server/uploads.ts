import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { databasePath } from "./db/client";

/* ==================================================================
   HOMERA — FICHIERS TÉLÉVERSÉS (photos de bien)
   ------------------------------------------------------------------
   Les fichiers ne vont ni dans `public/` ni dans la base :

   • `public/` est figé à la compilation : un fichier écrit après le
     build ne serait pas servi par `next start`. Les photos vivent donc
     dans `data/uploads/`, à côté de la base, hors de Git ;
   • la base ne stocke aucun binaire : une ligne `property_photos`
     garde l’URL servie, le nom d’origine et le poids ;
   • la diffusion passe par `GET /api/uploads/...`, qui vérifie que le
     chemin demandé reste sous la racine — jamais d’accès arbitraire au
     disque, jamais de listage de dossier.

   Aucun traitement d’image n’est appliqué : HOMERA ne recadre pas et ne
   réencode pas la photo du propriétaire. Le contrôle porte sur la
   nature réelle du fichier (octets d’en-tête), pas sur ce que le
   navigateur déclare.
   ================================================================== */

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_MAX_PER_PROPERTY = 12;

/** Extensions acceptées, et le type MIME servi pour chacune. */
const IMAGE_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
} as const;

export type ImageExtension = keyof typeof IMAGE_TYPES;

/** Dossier racine des fichiers : `data/uploads`, jamais versionné. */
export function uploadRoot(): string {
  return path.join(path.dirname(databasePath()), "uploads");
}

/** Préfixe d’URL sous lequel les fichiers sont servis. */
export const UPLOAD_URL_PREFIX = "/api/uploads/";

/**
 * Reconnaît une image à ses octets d’en-tête. Le type MIME annoncé par
 * le navigateur n’est jamais une preuve : c’est le contenu qui décide.
 */
export function sniffImage(bytes: Uint8Array): ImageExtension | null {
  if (bytes.length < 12) return null;
  const at = (...expected: number[]) => expected.every((byte, index) => bytes[index] === byte);
  const tag = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));

  if (at(0xff, 0xd8, 0xff)) return "jpg";
  if (at(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (tag(0, 4) === "RIFF" && tag(8, 12) === "WEBP") return "webp";
  if (tag(4, 8) === "ftyp" && ["avif", "avis", "mif1"].includes(tag(8, 12))) return "avif";
  return null;
}

export function contentTypeOf(extension: string): string | null {
  return extension in IMAGE_TYPES ? IMAGE_TYPES[extension as ImageExtension] : null;
}

/** Nettoie le nom d’origine : jamais de chemin, jamais de caractère exotique. */
function safeName(name: string): string {
  const base = path.basename(name || "").replace(/[^\p{L}\p{N}._-]+/gu, "-");
  return base.slice(0, 120) || "photo";
}

/**
 * Écrit la photo d’un bien et renvoie l’URL servie.
 * Le nom sur le disque est un identifiant imprévisible : deux envois du
 * même fichier ne se marchent pas dessus, et l’URL ne se devine pas.
 */
export function saveUpload(
  folder: string,
  bytes: Uint8Array,
  extension: ImageExtension,
  originalName: string,
): { url: string; filename: string } {
  const directory = path.join(uploadRoot(), folder);
  fs.mkdirSync(directory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  fs.writeFileSync(path.join(directory, filename), bytes);
  return { url: `${UPLOAD_URL_PREFIX}${folder}/${filename}`, filename: safeName(originalName) };
}

/** Supprime un fichier déjà enregistré (retrait d’une photo, envoi refusé). */
export function deleteUpload(url: string | null | undefined): void {
  if (!url || !url.startsWith(UPLOAD_URL_PREFIX)) return;
  const target = resolveUpload(url);
  if (!target) return;
  try {
    fs.rmSync(target, { force: true });
  } catch {
    /* Un fichier déjà absent n’est pas une erreur : la ligne de base, elle, est bien retirée. */
  }
}

/**
 * Traduit une URL servie en chemin disque, à condition qu’elle reste
 * sous la racine des téléversements. Toute tentative de remonter
 * (`../`), tout lien symbolique et tout dossier renvoie `null`.
 */
export function resolveUpload(url: string): string | null {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return null;
  const relative = url.slice(UPLOAD_URL_PREFIX.length).split("?")[0];
  if (!relative || relative.includes("\0")) return null;
  const root = uploadRoot();
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (!stat?.isFile()) return null;
  return target;
}

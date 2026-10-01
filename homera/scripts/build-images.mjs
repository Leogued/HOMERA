/**
 * HOMERA — pipeline d'images
 * ------------------------------------------------------------------
 * Transforme les visuels sources (pleine résolution) en fichiers
 * optimisés pour le web, puis génère le manifeste typé utilisé par
 * les composants (`lib/media.generated.ts`).
 *
 *   npm run images
 *
 * Sources  : $HOMERA_MEDIA_SRC (défaut : /tmp/homera-media)
 * Sortie   : public/images/*.jpg  +  lib/media.generated.ts
 *
 * Chaque visuel est recadré au bon rapport d'image, redimensionné au
 * format réellement affiché, puis compressé (JPEG progressif, mozjpeg)
 * et accompagné d'un blurDataURL (placeholder LQIP de 14 px) : aucune
 * image ne « saute » à l'arrivée et le premier rendu reste instantané.
 *
 * Les fichiers sources ne sont pas versionnés : seuls les dérivés
 * optimisés le sont, afin de garder le dépôt léger.
 */

import { mkdir, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = process.env.HOMERA_MEDIA_SRC || "/tmp/homera-media";
const OUT_DIR = path.join(ROOT, "public/images");
const MANIFEST = path.join(ROOT, "lib/media.generated.ts");

/** @type {{key:string,width:number,height:number,quality:number}[]} */
const RECIPES = [
  // Intentions — scènes verticales (4:5)
  { key: "intent-acheter", width: 1100, height: 1375, quality: 76 },
  { key: "intent-louer", width: 1100, height: 1375, quality: 76 },
  { key: "intent-sejourner", width: 1100, height: 1375, quality: 76 },
  { key: "intent-investir", width: 1100, height: 1375, quality: 76 },

  // Biens — cartes panoramiques (16:10)
  { key: "prop-villa", width: 1440, height: 900, quality: 76 },
  { key: "prop-appartement", width: 1440, height: 900, quality: 76 },
  { key: "prop-terrain", width: 1440, height: 900, quality: 76 },
  { key: "prop-duplex", width: 1440, height: 900, quality: 76 },

  // Services — visuels d'illustration (4:3)
  { key: "service-gestion", width: 1280, height: 960, quality: 76 },
  { key: "service-maintenance", width: 1280, height: 960, quality: 76 },
  { key: "service-demenagement", width: 1280, height: 960, quality: 76 },
  { key: "service-travaux", width: 1280, height: 960, quality: 76 },

  // Éditorial — couvertures de magazine (4:5)
  { key: "editorial-architecture", width: 1100, height: 1375, quality: 76 },
  { key: "editorial-quartier", width: 1100, height: 1375, quality: 76 },
  { key: "editorial-lifestyle", width: 1100, height: 1375, quality: 76 },

  // Bandeau final — cinématique (21:9)
  { key: "cta-night", width: 1920, height: 823, quality: 74 },
];

async function findSource(key) {
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    const candidate = path.join(SRC_DIR, `${key}${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(MANIFEST), { recursive: true });

  /** @type {Record<string, {src:string,width:number,height:number,blurDataURL:string}>} */
  const manifest = {};
  const skipped = [];

  for (const recipe of RECIPES) {
    const source = await findSource(recipe.key);
    if (!source) {
      skipped.push(recipe.key);
      continue;
    }

    const pipeline = sharp(source, { failOn: "none" })
      .rotate()
      .resize(recipe.width, recipe.height, {
        fit: "cover",
        position: "attention",
        withoutEnlargement: true,
      });

    const buffer = await pipeline
      .clone()
      .jpeg({ quality: recipe.quality, progressive: true, mozjpeg: true })
      .toBuffer();

    const outFile = path.join(OUT_DIR, `${recipe.key}.jpg`);
    await writeFile(outFile, buffer);

    const blur = await pipeline
      .clone()
      .resize(14, null, { fit: "inside" })
      .jpeg({ quality: 42 })
      .toBuffer();

    const meta = await sharp(buffer).metadata();
    manifest[recipe.key] = {
      src: `/images/${recipe.key}.jpg`,
      width: meta.width ?? recipe.width,
      height: meta.height ?? recipe.height,
      blurDataURL: `data:image/jpeg;base64,${blur.toString("base64")}`,
    };

    const { size } = await stat(outFile);
    console.log(
      `✓ ${recipe.key.padEnd(24)} ${meta.width}×${meta.height}  ${(size / 1024).toFixed(0)} Ko`,
    );
  }

  const file = `// GÉNÉRÉ AUTOMATIQUEMENT par scripts/build-images.mjs — ne pas éditer à la main.
// Régénérer avec : npm run images

export type MediaAsset = {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly blurDataURL: string;
};

export const MEDIA: Record<string, MediaAsset> = ${JSON.stringify(manifest, null, 2)} as const;

export type MediaKey = keyof typeof MEDIA;
`;

  await writeFile(MANIFEST, file);
  console.log(`\n→ ${Object.keys(manifest).length} visuels · manifeste écrit dans lib/media.generated.ts`);
  if (skipped.length) console.log(`… sources absentes (ignorées) : ${skipped.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/* ==================================================================
   HOMERA — CHARGEUR DE MODULES POUR LES TESTS SERVEUR
   ------------------------------------------------------------------
   Les scripts de test tournent en Node pur (`node --experimental-strip-types`).
   Deux besoins simples que Node ne couvre pas nativement :

   1. l’alias `@/lib/...` utilisé par tout le projet Next.js ;
   2. les importations sans extension (`./client`, `@/lib/content`),
      habituelles côté bundler mais interdites en ESM strict.

   Ce chargeur résout les deux, sans toucher au code applicatif.
   ================================================================== */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const CANDIDATES = [".ts", ".tsx", ".mts", ".js", ".mjs", ".json"];

function resolveFile(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of CANDIDATES) {
    if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return base + ext;
  }
  for (const ext of CANDIDATES) {
    const index = path.join(base, `index${ext}`);
    if (fs.existsSync(index)) return index;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const file = resolveFile(path.join(ROOT, specifier.slice(2)));
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parent = context.parentURL ? path.dirname(new URL(context.parentURL).pathname) : ROOT;
    const file = resolveFile(path.resolve(parent, specifier));
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  if (specifier.endsWith(".ts") || specifier.endsWith(".mts")) {
    return { url: new URL(specifier, context.parentURL).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

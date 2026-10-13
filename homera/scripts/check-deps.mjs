/* ==================================================================
   HOMERA — GARDE AU DÉMARRAGE (enchaîné dans `dev` et `build`)
   ------------------------------------------------------------------
   Sans lui, un `npm install` oublié, interrompu ou lancé dans le
   mauvais dossier échoue plus tard sous une erreur cryptique du
   bundler (« Module not found: Can't resolve 'better-sqlite3' »).
   Ici, l’utilisateur reçoit la cause et la marche à suivre.

   Le garde est appelé explicitement (`node scripts/check-deps.mjs && …`),
   PAS via `predev`/`prebuild` : `.npmrc` positionne `ignore-scripts`,
   et npm neutralise aussi les crochets pre/post dans ce cas — vérifié
   par l’expérience, le crochet ne s’exécutait jamais.

   Le script ne fait que constater : il n’installe rien, ne modifie
   rien, et reste silencieux quand tout est en place.
   ================================================================== */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/* Next.js 16 exige Node 20.9 minimum ; le pilote SQLite natif exige,
   lui, une version récente pour ses binaires précompilés. */
const MIN_NODE = [20, 9, 0];

function nodeOk() {
  const [major, minor, patch] = process.versions.node.split(".").map((part) => Number.parseInt(part, 10));
  if (major !== MIN_NODE[0]) return major > MIN_NODE[0];
  if (minor !== MIN_NODE[1]) return minor > MIN_NODE[1];
  return patch >= MIN_NODE[2];
}

if (!nodeOk()) {
  console.error(
    `\n[HOMERA] Node.js ${process.versions.node} détecté : HOMERA exige Node.js 20.9 ou plus (22 LTS recommandé).\n` +
      `         Installez Node 22 LTS depuis https://nodejs.org, fermez puis rouvrez le terminal,\n` +
      `         et relancez « npm install » dans le dossier homera/.\n`,
  );
  process.exit(1);
}

try {
  /* On charge vraiment le module, pas seulement son chemin : un paquet
     présent mais au binaire manquant ou corrompu est détecté aussi. */
  require("better-sqlite3");
} catch {
  console.error(
    `\n[HOMERA] La base embarquée (better-sqlite3) n’est pas installée dans ce dossier, ou son binaire est inutilisable.\n` +
      `         Cause habituelle : « npm install » oublié, interrompu, échoué, ou lancé ailleurs que dans homera/.\n` +
      `         Marche à suivre :\n` +
      `           1. ouvrez le dossier homera/ — celui qui contient package.json — dans le terminal ;\n` +
      `           2. mettez à jour le projet (git pull) puis supprimez node_modules et package-lock.json ;\n` +
      `           3. lancez « npm install » et attendez la fin (« added … packages », sans ligne ERR) ;\n` +
      `           4. relancez « npm run dev ».\n`,
  );
  process.exit(1);
}

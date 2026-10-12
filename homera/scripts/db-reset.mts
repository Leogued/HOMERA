/* Réinitialise la base locale : supprime le fichier, rouvre, migre, amorce.
   Jamais utilisé en production — c’est un outil de développement. */

import fs from "node:fs";
import path from "node:path";

const file = process.env.HOMERA_DB_PATH || path.join(process.cwd(), "data", "homera.db");
for (const suffix of ["", "-wal", "-shm"]) {
  fs.rmSync(file + suffix, { force: true });
}

const { getDb, closeDb } = await import("../lib/server/db/client");
const db = getDb();
const counts = db
  .prepare<[], { biens: number; comptes: number }>(
    "SELECT (SELECT COUNT(*) FROM properties) AS biens, (SELECT COUNT(*) FROM users) AS comptes",
  )
  .get()!;
closeDb();
console.log(`Base réinitialisée : ${file}`);
console.log(`${counts.biens} biens · ${counts.comptes} comptes`);

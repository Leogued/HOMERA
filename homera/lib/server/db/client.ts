import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { MIGRATIONS } from "./migrations";
import { seedDatabase } from "./seed";

/* ==================================================================
   HOMERA — ACCÈS À LA BASE
   ------------------------------------------------------------------
   Une seule connexion par processus, ouverte à la demande : rien n’est
   touché au chargement du module, ce qui évite d’ouvrir un fichier
   pendant la génération statique d’une page qui n’en a pas besoin.

   Le schéma est appliqué puis la base est amorcée si elle est vide.
   Tout passe par `getDb()` : c’est le seul point à remplacer le jour
   où HOMERA bascule sur PostgreSQL/Supabase.
   ================================================================== */

export type Db = Database.Database;

const DEFAULT_PATH = path.join(process.cwd(), "data", "homera.db");

let instance: Db | null = null;
let seeding = false;

export function databasePath(): string {
  return process.env.HOMERA_DB_PATH || DEFAULT_PATH;
}

/** Applique les migrations manquantes dans une transaction. */
export function applyMigrations(db: Db): string[] {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)",
  );
  const applied = new Set(
    db.prepare<[], { id: string }>("SELECT id FROM schema_migrations").all().map((row) => row.id),
  );
  const executed: string[] = [];
  /* Une reconstruction de table (DROP + RENAME) casserait les clés
     étrangères filles : les migrations tournent hors contraintes, puis
     l’état précédent est restauré. Chaque migration reste atomique. */
  const foreignKeys = (db.pragma("foreign_keys") as { foreign_keys: number }[])[0]?.foreign_keys === 1;
  db.pragma("foreign_keys = OFF");
  try {
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) continue;
      const run = db.transaction(() => {
        db.exec(migration.sql);
        db.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(
          migration.id,
          migration.name,
          new Date().toISOString(),
        );
      });
      run();
      executed.push(migration.id);
    }
  } finally {
    db.pragma(`foreign_keys = ${foreignKeys ? "ON" : "OFF"}`);
  }
  return executed;
}

/** Ouvre (ou réutilise) la connexion, migre et amorce si nécessaire. */
export function getDb(): Db {
  if (instance) return instance;
  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  // WAL : les lectures ne bloquent pas les écritures — indispensable dès
  // qu’un propriétaire et un admin travaillent en même temps.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  applyMigrations(db);
  instance = db;
  // Amorçage : uniquement si aucun bien n’existe. Rejouer le seed sur une
  // base déjà remplie ne doit jamais écraser les données réelles.
  if (!seeding) {
    seeding = true;
    try {
      seedDatabase(db);
    } finally {
      seeding = false;
    }
  }
  return db;
}

/** Réinitialise la connexion (tests, changement de fichier). */
export function closeDb(): void {
  if (!instance) return;
  instance.close();
  instance = null;
}

/* ------------------------------------------------------------------
   UTILITAIRES DE REQUÊTE — écrits ici pour garder les services lisibles
   ------------------------------------------------------------------ */

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${random}`;
}

export type Row = Record<string, unknown>;

export function queryAll<T = Row>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}

export function queryOne<T = Row>(sql: string, params: unknown[] = []): T | null {
  const row = getDb().prepare(sql).get(...(params as never[])) as T | undefined;
  return row ?? null;
}

export function execute(sql: string, params: unknown[] = []): Database.RunResult {
  return getDb().prepare(sql).run(...(params as never[]));
}

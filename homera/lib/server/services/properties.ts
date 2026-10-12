import type { Db } from "../db/client";
import { newId, nowIso, queryAll, queryOne } from "../db/client";
import type {
  LandTitle,
  Property,
  PropertyAvailability,
  PropertyFeature,
  PropertyIntent,
  PropertyType,
  PropertyVerificationStatus,
} from "../../content";
import { FEATURE_LABELS } from "../../content";
import { canEditProperty, canModerate, type UserContext } from "../authz";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import type { ServiceResult } from "./accounts";
import type { PropertyDraftInput } from "../validation";

/* ==================================================================
   HOMERA — BIENS (service serveur)
   ------------------------------------------------------------------
   Le catalogue public est lu ici, pas dans un fichier : ce que la base
   contient est ce que le visiteur voit. Les 36 biens du catalogue
   servent uniquement à l’amorçage (`lib/server/db/seed.ts`).

   Deux statuts distincts, jamais confondus :
   • `publication_status` — cycle de vie de l’annonce ;
   • `verification_status` — résultat du contrôle du dossier.
   Un bien non vérifié n’est jamais présenté comme vérifié.
   ================================================================== */

export type PropertyRow = {
  id: string;
  reference: string;
  title: string;
  type: PropertyType;
  intent: PropertyIntent;
  price: number;
  price_period: string;
  country: string;
  department: string;
  commune: string;
  city: string;
  district: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  surface: number;
  rooms: number | null;
  floor: string;
  land_title: string | null;
  min_nights: number | null;
  description: string;
  conditions: string;
  furnished: number;
  availability: string;
  unavailable_until: string | null;
  availability_note: string;
  publication_status: string;
  verification_status: string;
  verified_on: string | null;
  owner_id: string | null;
  agency_id: string | null;
  main_photo_id: string | null;
  latitude: number | null;
  longitude: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PhotoRow = {
  id: string;
  property_id: string;
  media_key: string;
  alt: string;
  position: number;
  is_main: number;
  approved: number;
};

/* ------------------------------------------------------------------
   LECTURE
   ------------------------------------------------------------------ */

const PROPERTY_COLUMNS = "SELECT * FROM properties";

function photosOf(db: Db, propertyId: string): PhotoRow[] {
  return queryAll<PhotoRow>(
    "SELECT * FROM property_photos WHERE property_id = ? ORDER BY position ASC, created_at ASC",
    [propertyId],
  );
}

function featuresOf(db: Db, propertyId: string): PropertyFeature[] {
  return queryAll<{ feature: string }>("SELECT feature FROM property_features WHERE property_id = ?", [propertyId])
    .map((row) => row.feature)
    .filter((feature): feature is PropertyFeature => Object.prototype.hasOwnProperty.call(FEATURE_LABELS, feature));
}

/** JJ/MM/AAAA — le format affiché partout sur le site. */
export function frenchDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

export function toProperty(row: PropertyRow, photos: PhotoRow[], features: PropertyFeature[]): Property {
  const main = photos.find((photo) => photo.id === row.main_photo_id) ?? photos.find((photo) => photo.is_main === 1) ?? photos[0];
  const availability: PropertyAvailability = row.availability === "indisponible" || row.availability === "suspendu"
    ? "indisponible"
    : "disponible";
  const verification: PropertyVerificationStatus = row.verification_status === "verifie" ? "verifie" : "en-verification";
  return {
    id: row.id,
    homeraId: row.reference,
    title: row.title,
    type: row.type,
    intent: row.intent,
    price: row.price,
    pricePeriod: row.price_period || undefined,
    city: row.city,
    district: row.district,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    surface: row.surface,
    rooms: row.rooms ?? undefined,
    floor: row.floor || undefined,
    landTitle: (row.land_title as LandTitle | null) ?? undefined,
    minNights: row.min_nights ?? undefined,
    features,
    description: row.description || undefined,
    availabilityStatus: availability,
    verificationStatus: verification,
    verifiedOn: frenchDate(row.verified_on),
    publishedAt: (row.published_at ?? row.created_at).slice(0, 10),
    media: main?.media_key ?? "",
    alt: main?.alt ?? row.title,
    coordinates: row.latitude !== null && row.longitude !== null ? { lat: row.latitude, lng: row.longitude } : undefined,
  };
}

export function loadProperty(db: Db, id: string): Property | null {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [id, id]);
  if (!row) return null;
  return toProperty(row, photosOf(db, row.id), featuresOf(db, row.id));
}

export type CatalogFilters = {
  intent?: PropertyIntent | "";
  types?: PropertyType[];
  cities?: string[];
  districts?: string[];
  features?: PropertyFeature[];
  landTitles?: LandTitle[];
  q?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  bedroomsMin?: number | null;
  roomsMin?: number | null;
  surfaceMin?: number | null;
  surfaceMax?: number | null;
  stayNights?: number | null;
  recentOnly?: boolean;
  availableOnly?: boolean;
  verifiedOnly?: boolean;
  furnishedOnly?: boolean;
  sort?: "pertinence" | "recent" | "prix-asc" | "prix-desc" | "surface-desc";
};

const RECENT_DAYS = 15;

function inClause(values: string[], column: string, params: unknown[]): string {
  const placeholders = values.map(() => "?").join(", ");
  params.push(...values);
  return `${column} IN (${placeholders})`;
}

/** Liste les biens publiés, filtrés en SQL (mêmes règles que `matchesQuery`). */
export function listProperties(db: Db, filters: CatalogFilters = {}, options: { onlyPublished?: boolean } = {}): Property[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (options.onlyPublished !== false) {
    clauses.push("publication_status = 'publie'");
  } else {
    clauses.push("publication_status <> 'archive'");
  }

  if (filters.intent) {
    clauses.push("intent = ?");
    params.push(filters.intent);
  }
  if (filters.types?.length) clauses.push(inClause([...filters.types], "type", params));
  if (filters.cities?.length) clauses.push(inClause([...filters.cities], "city", params));
  if (filters.districts?.length) clauses.push(inClause([...filters.districts], "district", params));
  if (filters.landTitles?.length) clauses.push(inClause([...filters.landTitles], "land_title", params));
  if (filters.priceMin !== null && filters.priceMin !== undefined) {
    clauses.push("price >= ?");
    params.push(filters.priceMin);
  }
  if (filters.priceMax !== null && filters.priceMax !== undefined) {
    clauses.push("price <= ?");
    params.push(filters.priceMax);
  }
  if (filters.bedroomsMin !== null && filters.bedroomsMin !== undefined) {
    clauses.push("bedrooms >= ?");
    params.push(filters.bedroomsMin);
  }
  if (filters.roomsMin !== null && filters.roomsMin !== undefined) {
    clauses.push("COALESCE(rooms, bedrooms) >= ?");
    params.push(filters.roomsMin);
  }
  if (filters.surfaceMin !== null && filters.surfaceMin !== undefined) {
    clauses.push("surface >= ?");
    params.push(filters.surfaceMin);
  }
  if (filters.surfaceMax !== null && filters.surfaceMax !== undefined) {
    clauses.push("surface <= ?");
    params.push(filters.surfaceMax);
  }
  if (filters.availableOnly) clauses.push("availability = 'disponible'");
  if (filters.verifiedOnly) clauses.push("verification_status = 'verifie'");
  if (filters.furnishedOnly) clauses.push("furnished = 1");
  if (filters.stayNights !== null && filters.stayNights !== undefined) {
    clauses.push("(intent <> 'sejour' OR COALESCE(min_nights, 1) <= ?)");
    params.push(filters.stayNights);
  }
  if (filters.recentOnly) {
    const latest = queryOne<{ value: string | null }>(
      "SELECT MAX(published_at) AS value FROM properties WHERE publication_status = 'publie'",
    );
    if (latest?.value) {
      const threshold = new Date(new Date(latest.value).getTime() - RECENT_DAYS * 86_400_000).toISOString();
      clauses.push("COALESCE(published_at, created_at) >= ?");
      params.push(threshold);
    }
  }
  if (filters.features?.length) {
    for (const feature of filters.features) {
      clauses.push(
        "EXISTS (SELECT 1 FROM property_features pf WHERE pf.property_id = properties.id AND pf.feature = ?)",
      );
      params.push(feature);
    }
  }
  if (filters.q) {
    clauses.push(
      "(lower(title) LIKE ? OR lower(district) LIKE ? OR lower(city) LIKE ? OR lower(description) LIKE ? OR lower(reference) LIKE ?)",
    );
    const needle = `%${filters.q.toLowerCase()}%`;
    params.push(needle, needle, needle, needle, needle);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  let order = "ORDER BY COALESCE(verified_on, '1970-01-01') DESC, COALESCE(published_at, created_at) DESC, title ASC";
  if (filters.sort === "recent") order = "ORDER BY COALESCE(published_at, created_at) DESC, title ASC";
  if (filters.sort === "prix-asc") order = "ORDER BY price ASC, title ASC";
  if (filters.sort === "prix-desc") order = "ORDER BY price DESC, title ASC";
  if (filters.sort === "surface-desc") order = "ORDER BY surface DESC, title ASC";

  const rows = queryAll<PropertyRow>(`${PROPERTY_COLUMNS} ${where} ${order}`, params);
  const photoRows = queryAll<PhotoRow>(
    "SELECT * FROM property_photos ORDER BY property_id, position ASC, created_at ASC",
  );
  const featureRows = queryAll<{ property_id: string; feature: string }>("SELECT * FROM property_features");
  const photosByProperty = new Map<string, PhotoRow[]>();
  for (const photo of photoRows) {
    const list = photosByProperty.get(photo.property_id) ?? [];
    list.push(photo);
    photosByProperty.set(photo.property_id, list);
  }
  const featuresByProperty = new Map<string, PropertyFeature[]>();
  for (const entry of featureRows) {
    const list = featuresByProperty.get(entry.property_id) ?? [];
    if (Object.prototype.hasOwnProperty.call(FEATURE_LABELS, entry.feature)) {
      list.push(entry.feature as PropertyFeature);
    }
    featuresByProperty.set(entry.property_id, list);
  }
  return rows.map((row) => toProperty(row, photosByProperty.get(row.id) ?? [], featuresByProperty.get(row.id) ?? []));
}

/** Biens d’un propriétaire (tous statuts) — espace propriétaire. */
export function propertiesOfOwner(db: Db, ownerId: string): Property[] {
  const rows = queryAll<PropertyRow>(
    `${PROPERTY_COLUMNS} WHERE owner_id = ? ORDER BY created_at DESC`,
    [ownerId],
  );
  return rows.map((row) => toProperty(row, photosOf(db, row.id), featuresOf(db, row.id)));
}

/** Biens confiés à un agent : uniquement les mandats actifs, expirés exclus. */
export function propertiesOfAgent(db: Db, agentId: string): Property[] {
  const rows = queryAll<PropertyRow>(
    `${PROPERTY_COLUMNS}
     WHERE id IN (SELECT property_id FROM authorizations
                  WHERE agent_id = ? AND status = 'active' AND expires_at >= ?)
     ORDER BY updated_at DESC`,
    [agentId, nowIso()],
  );
  return rows.map((row) => toProperty(row, photosOf(db, row.id), featuresOf(db, row.id)));
}

/* ------------------------------------------------------------------
   ÉCRITURE
   ------------------------------------------------------------------ */

const CITY_CODE: Record<string, string> = {
  Cotonou: "CTN",
  "Abomey-Calavi": "CAL",
  "Porto-Novo": "PNV",
  Ouidah: "OUI",
};

function nextReference(db: Db, city: string): string {
  const code = CITY_CODE[city] ?? "BJ";
  const row = queryOne<{ value: string | null }>(
    "SELECT reference AS value FROM properties WHERE reference LIKE ? ORDER BY reference DESC LIMIT 1",
    [`HOM-${code}-%`],
  );
  const last = Number((row?.value ?? "").split("-").pop() ?? "0");
  return `HOM-${code}-${String(last + 1).padStart(6, "0")}`;
}

export function createProperty(
  db: Db,
  actor: UserContext,
  input: PropertyDraftInput,
  meta: { ip?: string } = {},
): ServiceResult<{ property: Property }> {
  if (!actor.accountRoles.includes("proprietaire") && !actor.roles.includes("admin") && !actor.roles.includes("superadmin")) {
    return {
      ok: false,
      code: "permission",
      message: "Le dépôt d’un bien demande le rôle propriétaire. Ajoutez-le depuis votre compte.",
    };
  }
  const id = input.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const propertyId = `${id || "bien"}-${Math.random().toString(36).slice(2, 6)}`;
  const iso = nowIso();
  const reference = nextReference(db, input.city);
  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO properties (id, reference, title, type, intent, price, price_period, country, department, commune,
          city, district, address, bedrooms, bathrooms, surface, rooms, floor, land_title, min_nights, description,
          conditions, furnished, availability, unavailable_until, availability_note, publication_status,
          verification_status, verified_on, owner_id, agency_id, main_photo_id, latitude, longitude, published_at,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disponible', NULL, '',
               'brouillon', 'non-verifie', NULL, ?, NULL, NULL, ?, ?, NULL, ?, ?)`,
    ).run(
      propertyId,
      reference,
      input.title,
      input.type,
      input.intent,
      input.price,
      input.pricePeriod ?? "",
      input.country ?? "Bénin",
      input.department ?? "",
      input.commune ?? input.city,
      input.city,
      input.district,
      input.address ?? "",
      input.bedrooms ?? 0,
      input.bathrooms ?? 0,
      input.surface ?? 0,
      input.rooms ?? null,
      input.floor ?? "",
      input.landTitle ?? null,
      input.minNights ?? null,
      input.description ?? "",
      input.conditions ?? "",
      input.furnished ? 1 : 0,
      actor.id,
      input.latitude ?? null,
      input.longitude ?? null,
      iso,
      iso,
    );
    for (const feature of input.features ?? []) {
      db.prepare("INSERT OR IGNORE INTO property_features (property_id, feature) VALUES (?, ?)").run(propertyId, feature);
    }
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "bien.cree",
      entityType: "bien",
      entityId: propertyId,
      detail: { reference, publication: "brouillon" },
      ip: meta.ip,
    });
  });
  run();
  const property = loadProperty(db, propertyId);
  if (!property) return { ok: false, message: "Le bien n’a pas pu être enregistré." };
  return { ok: true, data: { property } };
}

/** Champs protégés : modifier un bien publié et vérifié rouvre le contrôle. */
const PROTECTED_FIELDS = new Set(["price", "surface", "landTitle", "type", "intent", "city", "district", "reference"]);

export function updateProperty(
  db: Db,
  actor: UserContext,
  propertyId: string,
  patch: Partial<PropertyDraftInput>,
  meta: { ip?: string } = {},
): ServiceResult<{ property: Property; reopenedVerification: boolean }> {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  if (!row) return { ok: false, message: "Bien introuvable." };
  const authorization = actor.accountRoles.includes("agent")
    ? queryOne<{ status: string; agent_id: string | null; scope: string }>(
        "SELECT status, agent_id, scope FROM authorizations WHERE property_id = ? AND agent_id = ? AND status = 'active'",
        [row.id, actor.id],
      )
    : null;
  const scoped = authorization ? { ...authorization, scope: JSON.parse(authorization.scope) as string[] } : null;
  if (!canEditProperty(actor, row, scoped)) {
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "bien.modification.refusee",
      entityType: "bien",
      entityId: row.id,
      detail: { raison: "permission" },
      ip: meta.ip,
    });
    return { ok: false, code: "permission", message: "Vous n’avez pas l’autorisation de modifier ce bien." };
  }

  const iso = nowIso();
  const reopened = Object.keys(patch).some((key) => PROTECTED_FIELDS.has(key)) && row.verification_status === "verifie";
  const run = db.transaction(() => {
    const assignments: string[] = [];
    const values: unknown[] = [];
    const push = (column: string, value: unknown) => {
      assignments.push(`${column} = ?`);
      values.push(value);
    };
    if (patch.title !== undefined) push("title", patch.title);
    if (patch.intent !== undefined) push("intent", patch.intent);
    if (patch.type !== undefined) push("type", patch.type);
    if (patch.price !== undefined) push("price", patch.price);
    if (patch.pricePeriod !== undefined) push("price_period", patch.pricePeriod);
    if (patch.city !== undefined) push("city", patch.city);
    if (patch.district !== undefined) push("district", patch.district);
    if (patch.commune !== undefined) push("commune", patch.commune);
    if (patch.department !== undefined) push("department", patch.department);
    if (patch.address !== undefined) push("address", patch.address);
    if (patch.bedrooms !== undefined) push("bedrooms", patch.bedrooms);
    if (patch.bathrooms !== undefined) push("bathrooms", patch.bathrooms);
    if (patch.surface !== undefined) push("surface", patch.surface);
    if (patch.rooms !== undefined) push("rooms", patch.rooms ?? null);
    if (patch.floor !== undefined) push("floor", patch.floor);
    if (patch.landTitle !== undefined) push("land_title", patch.landTitle ?? null);
    if (patch.minNights !== undefined) push("min_nights", patch.minNights ?? null);
    if (patch.description !== undefined) push("description", patch.description);
    if (patch.conditions !== undefined) push("conditions", patch.conditions);
    if (patch.furnished !== undefined) push("furnished", patch.furnished ? 1 : 0);
    if (patch.latitude !== undefined) push("latitude", patch.latitude ?? null);
    if (patch.longitude !== undefined) push("longitude", patch.longitude ?? null);
    if (assignments.length === 0 && patch.features === undefined) {
      return;
    }
    if (assignments.length) {
      values.push(iso, row.id);
      db.prepare(`UPDATE properties SET ${assignments.join(", ")}, updated_at = ? WHERE id = ?`).run(...values);
    }
    if (patch.features) {
      db.prepare("DELETE FROM property_features WHERE property_id = ?").run(row.id);
      for (const feature of patch.features) {
        db.prepare("INSERT OR IGNORE INTO property_features (property_id, feature) VALUES (?, ?)").run(row.id, feature);
      }
      // « Meublé » est une caractéristique, mais c’est aussi un filtre :
      // les deux écritures restent cohérentes.
      db.prepare("UPDATE properties SET furnished = ? WHERE id = ?").run(patch.features.includes("meuble") ? 1 : 0, row.id);
    }
    if (reopened) {
      db.prepare("UPDATE properties SET verification_status = 'en-cours', updated_at = ? WHERE id = ?").run(iso, row.id);
      db.prepare(
        "INSERT OR IGNORE INTO verifications (id, property_id, status, documentary_only, onsite_done, assigned_to, decision_note, created_at, updated_at) VALUES (?, ?, 'a-reexaminer', 1, 0, NULL, '', ?, ?)",
      ).run(newId("VER"), row.id, iso, iso);
    }
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "bien.modifie",
      entityType: "bien",
      entityId: row.id,
      detail: { champs: Object.keys(patch), verificationReouverte: reopened },
      ip: meta.ip,
    });
  });
  run();
  const property = loadProperty(db, row.id);
  if (!property) return { ok: false, message: "Bien introuvable après modification." };
  return { ok: true, data: { property, reopenedVerification: reopened } };
}

/** Soumettre un dossier : il entre en vérification, l’administration est notifiée. */
export function submitProperty(
  db: Db,
  actor: UserContext,
  propertyId: string,
  meta: { ip?: string } = {},
): ServiceResult<{ property: Property }> {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  if (!row) return { ok: false, message: "Bien introuvable." };
  if (row.owner_id !== actor.id && !canModerate(actor)) {
    return { ok: false, code: "permission", message: "Seul le propriétaire peut soumettre ce dossier." };
  }
  const missing: string[] = [];
  if (!row.description) missing.push("la description");
  if (!row.surface) missing.push("la surface");
  if (row.price <= 0) missing.push("le montant");
  const photos = photosOf(db, row.id);
  if (photos.length === 0) missing.push("au moins une photo");
  const documents = queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM documents WHERE entity_type = 'bien' AND entity_id = ?",
    [row.id],
  );
  if ((documents?.count ?? 0) === 0) missing.push("au moins une pièce justificative");
  if (missing.length) {
    return {
      ok: false,
      message: `Dossier incomplet : il manque ${missing.join(", ")}.`,
    };
  }
  const iso = nowIso();
  const run = db.transaction(() => {
    db.prepare("UPDATE properties SET publication_status = 'soumis', updated_at = ? WHERE id = ?").run(iso, row.id);
    db.prepare(
      "INSERT OR IGNORE INTO verifications (id, property_id, status, documentary_only, onsite_done, assigned_to, decision_note, created_at, updated_at) VALUES (?, ?, 'a-examiner', 1, 0, NULL, '', ?, ?)",
    ).run(newId("VER"), row.id, iso, iso);
    const verification = queryOne<{ id: string }>("SELECT id FROM verifications WHERE property_id = ?", [row.id]);
    if (verification) {
      db.prepare(
        "UPDATE verifications SET status = 'a-examiner', updated_at = ? WHERE id = ? AND status NOT IN ('accepte')",
      ).run(iso, verification.id);
      ensureSteps(db, verification.id, iso);
    }
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "bien.soumis",
      entityType: "bien",
      entityId: row.id,
      detail: { reference: row.reference },
      ip: meta.ip,
    });
    const admins = queryAll<{ user_id: string }>(
      "SELECT user_id FROM user_roles WHERE role IN ('admin', 'superadmin')",
    ).map((entry) => entry.user_id);
    notify(db, {
      userIds: [...admins, row.owner_id],
      type: "verification",
      title: "Dossier déposé",
      body: `${row.reference} · ${row.title} est en attente de vérification.`,
      link: `/admin/verifications`,
      entityType: "bien",
      entityId: row.id,
    });
  });
  run();
  const property = loadProperty(db, row.id);
  return property ? { ok: true, data: { property } } : { ok: false, message: "Bien introuvable." };
}

/* ------------------------------------------------------------------
   PHOTOS — ordre, image principale, suppression
   ------------------------------------------------------------------ */

export function addPhoto(
  db: Db,
  actor: UserContext,
  propertyId: string,
  input: { mediaKey: string; alt?: string },
): ServiceResult<{ photos: PhotoRow[] }> {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  if (!row) return { ok: false, message: "Bien introuvable." };
  if (!canEditProperty(actor, row, null) && !canModerate(actor)) {
    return { ok: false, code: "permission", message: "Vous n’avez pas l’autorisation d’ajouter une photo sur ce bien." };
  }
  const existing = photosOf(db, row.id);
  const id = newId("PHO");
  const isMain = existing.length === 0 ? 1 : 0;
  db.transaction(() => {
    db.prepare(
      "INSERT INTO property_photos (id, property_id, media_key, alt, position, is_main, approved, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
    ).run(id, row.id, input.mediaKey, input.alt ?? "", existing.length, isMain, actor.id, nowIso());
    if (isMain) db.prepare("UPDATE properties SET main_photo_id = ?, updated_at = ? WHERE id = ?").run(id, nowIso(), row.id);
    writeAudit(db, {
      actorId: actor.id,
      action: "bien.photo.ajoutee",
      entityType: "bien",
      entityId: row.id,
      detail: { mediaKey: input.mediaKey },
    });
  })();
  return { ok: true, data: { photos: photosOf(db, row.id) } };
}

export function setMainPhoto(db: Db, actor: UserContext, propertyId: string, photoId: string): ServiceResult<{ photos: PhotoRow[] }> {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  if (!row) return { ok: false, message: "Bien introuvable." };
  if (!canEditProperty(actor, row, null) && !canModerate(actor)) {
    return { ok: false, code: "permission", message: "Action non autorisée." };
  }
  db.transaction(() => {
    db.prepare("UPDATE property_photos SET is_main = 0 WHERE property_id = ?").run(row.id);
    db.prepare("UPDATE property_photos SET is_main = 1 WHERE id = ? AND property_id = ?").run(photoId, row.id);
    db.prepare("UPDATE properties SET main_photo_id = ?, updated_at = ? WHERE id = ?").run(photoId, nowIso(), row.id);
    writeAudit(db, {
      actorId: actor.id,
      action: "bien.photo.principale",
      entityType: "bien",
      entityId: row.id,
      detail: { photoId },
    });
  })();
  return { ok: true, data: { photos: photosOf(db, row.id) } };
}

export function reorderPhotos(
  db: Db,
  actor: UserContext,
  propertyId: string,
  orderedIds: string[],
): ServiceResult<{ photos: PhotoRow[] }> {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  if (!row) return { ok: false, message: "Bien introuvable." };
  if (!canEditProperty(actor, row, null) && !canModerate(actor)) {
    return { ok: false, code: "permission", message: "Action non autorisée." };
  }
  db.transaction(() => {
    const update = db.prepare("UPDATE property_photos SET position = ? WHERE id = ? AND property_id = ?");
    orderedIds.forEach((photoId, index) => update.run(index, photoId, row.id));
    writeAudit(db, {
      actorId: actor.id,
      action: "bien.photo.ordre",
      entityType: "bien",
      entityId: row.id,
      detail: { ordre: orderedIds },
    });
  })();
  return { ok: true, data: { photos: photosOf(db, row.id) } };
}

export function removePhoto(db: Db, actor: UserContext, propertyId: string, photoId: string): ServiceResult<{ photos: PhotoRow[] }> {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  if (!row) return { ok: false, message: "Bien introuvable." };
  if (!canEditProperty(actor, row, null) && !canModerate(actor)) {
    return { ok: false, code: "permission", message: "Action non autorisée." };
  }
  db.transaction(() => {
    db.prepare("DELETE FROM property_photos WHERE id = ? AND property_id = ?").run(photoId, row.id);
    const remaining = photosOf(db, row.id);
    if (remaining.length > 0 && (!row.main_photo_id || !remaining.some((photo) => photo.id === row.main_photo_id))) {
      db.prepare("UPDATE property_photos SET is_main = 1 WHERE id = ?").run(remaining[0].id);
      db.prepare("UPDATE properties SET main_photo_id = ?, updated_at = ? WHERE id = ?").run(remaining[0].id, nowIso(), row.id);
    }
    writeAudit(db, {
      actorId: actor.id,
      action: "bien.photo.supprimee",
      entityType: "bien",
      entityId: row.id,
      detail: { photoId },
    });
  })();
  return { ok: true, data: { photos: photosOf(db, row.id) } };
}

/* ------------------------------------------------------------------
   DISPONIBILITÉ
   ------------------------------------------------------------------ */

export function setAvailability(
  db: Db,
  actor: UserContext,
  propertyId: string,
  input: { start: string; end: string; kind: "disponible" | "indisponible"; reason?: string },
): ServiceResult<{ windows: { start: string; end: string; kind: string; reason: string }[] }> {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  if (!row) return { ok: false, message: "Bien introuvable." };
  const authorization = queryOne<{ status: string; agent_id: string | null; scope: string }>(
    "SELECT status, agent_id, scope FROM authorizations WHERE property_id = ? AND agent_id = ? AND status = 'active'",
    [row.id, actor.id],
  );
  const scoped = authorization ? { ...authorization, scope: JSON.parse(authorization.scope) as string[] } : null;
  if (!canEditProperty(actor, row, scoped)) {
    return { ok: false, code: "permission", message: "Action non autorisée sur ce bien." };
  }
  if (input.end < input.start) {
    return { ok: false, message: "La date de fin doit suivre la date de début.", fields: { end: "Date incohérente." } };
  }
  const id = newId("DIS");
  db.transaction(() => {
    db.prepare(
      "INSERT INTO property_availability (id, property_id, start_date, end_date, kind, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(id, row.id, input.start, input.end, input.kind, input.reason ?? "", actor.id, nowIso());
    // Le statut affiché suit la dernière fenêtre connue : jamais inventé.
    db.prepare(
      "UPDATE properties SET availability = ?, unavailable_until = ?, availability_note = ?, updated_at = ? WHERE id = ?",
    ).run(
      input.kind === "indisponible" ? "indisponible" : "disponible",
      input.kind === "indisponible" ? input.end : null,
      input.reason ?? "",
      nowIso(),
      row.id,
    );
    writeAudit(db, {
      actorId: actor.id,
      action: "bien.disponibilite",
      entityType: "bien",
      entityId: row.id,
      detail: { kind: input.kind, start: input.start, end: input.end },
    });
  })();
  return { ok: true, data: { windows: availabilityWindows(db, row.id) } };
}

export function availabilityWindows(
  db: Db,
  propertyId: string,
): { start: string; end: string; kind: string; reason: string }[] {
  return queryAll<{ start_date: string; end_date: string; kind: string; reason: string }>(
    "SELECT start_date, end_date, kind, reason FROM property_availability WHERE property_id = ? ORDER BY start_date ASC",
    [propertyId],
  ).map((row) => ({ start: row.start_date, end: row.end_date, kind: row.kind, reason: row.reason }));
}

/** Indisponibilité en cours à la date donnée, avec la date de retour si elle est connue. */
export function currentUnavailability(
  db: Db,
  propertyId: string,
  date = nowIso().slice(0, 10),
): { unavailable: boolean; until: string | null; reason: string } {
  const row = queryOne<{ end_date: string; reason: string }>(
    "SELECT end_date, reason FROM property_availability WHERE property_id = ? AND kind = 'indisponible' AND start_date <= ? AND end_date >= ? ORDER BY end_date DESC LIMIT 1",
    [propertyId, date, date],
  );
  if (!row) return { unavailable: false, until: null, reason: "" };
  return { unavailable: true, until: row.end_date, reason: row.reason };
}

/* ------------------------------------------------------------------
   VÉRIFICATION — les étapes du contrôle (voir services/verifications.ts
   pour le workflow complet ; ces deux fonctions sont utilisées ici pour
   garder la soumission et la modification cohérentes)
   ------------------------------------------------------------------ */

export const VERIFICATION_STEP_KEYS = [
  "completude",
  "identite",
  "pieces",
  "coherence",
  "photos",
  "interlocuteur",
  "sur-place",
  "decision",
] as const;

export function ensureSteps(db: Db, verificationId: string, at = nowIso()): void {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO verification_steps (id, verification_id, step_key, status, actor_id, comment, internal, updated_at) VALUES (?, ?, ?, 'a-faire', NULL, '', 1, ?)",
  );
  for (const key of VERIFICATION_STEP_KEYS) insert.run(newId("STP"), verificationId, key, at);
}

export { PROPERTY_COLUMNS };

import { listAudit } from "@/lib/server/audit";
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
    gallery: photos.length
      ? photos.map((photo) => ({ mediaKey: photo.media_key, alt: photo.alt || row.title }))
      : undefined,
    coordinates: row.latitude !== null && row.longitude !== null ? { lat: row.latitude, lng: row.longitude } : undefined,
  };
}

export function loadProperty(db: Db, id: string): Property | null {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [id, id]);
  if (!row) return null;
  return toProperty(row, photosOf(db, row.id), featuresOf(db, row.id));
}

/**
 * Chronologie publique d’un bien : uniquement des événements réellement
 * écrits dans le journal d’audit, traduits en langage lisible. Rien n’est
 * illustré, aucune date n’est inventée : sans entrée, l’étape n’existe pas.
 */
const PUBLIC_PROPERTY_EVENTS: Record<string, string> = {
  "bien.cree": "Dossier créé",
  "bien.soumis": "Dossier soumis à la vérification",
  "bien.modifie": "Fiche mise à jour",
  "bien.disponibilite": "Disponibilité déclarée par le propriétaire",
  "bien.publication.publie": "Publication dans le catalogue public",
  "bien.publication.suspendu": "Annonce suspendue",
  "bien.publication.loue": "Bien marqué comme loué",
  "bien.publication.vendu": "Bien marqué comme vendu",
  "bien.publication.archive": "Dossier archivé",
  "bien.modification.refusee": "Modification refusée par l’administration",
  "verification.etape": "Étape de vérification renseignée",
  "verification.pieces.demandees": "Pièces complémentaires demandées",
  "verification.valide": "Vérification documentaire validée",
  "verification.refuse": "Vérification refusée",
  "verification.suspendu": "Vérification suspendue",
};

const PUBLICATION_LABELS: Record<string, string> = {
  brouillon: "brouillon",
  soumis: "dossier soumis",
  "en-verification": "vérification en cours",
  publie: "publié",
  suspendu: "suspendu",
  loue: "loué",
  vendu: "vendu",
  archive: "archivé",
};

export type PublicHistoryEvent = {
  title: string;
  date: string;
  detail: string;
  status: "done" | "current";
};

export function publicPropertyHistory(
  db: Db,
  reference: string,
): {
  reference: string;
  title: string;
  place: string;
  propertyId: string;
  verifiedOn: string | null;
  publishedAt: string | null;
  events: PublicHistoryEvent[];
} | null {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE reference = ? OR id = ?`, [reference, reference]);
  if (!row) return null;

  /* Ordre : la date, puis le rang logique de l’action — deux écritures
     du même jour doivent tout de même se lire dans le bon sens. */
  const RANK: Record<string, number> = {
    "bien.cree": 0,
    "bien.soumis": 1,
    "verification.pieces.demandees": 2,
    "verification.etape": 3,
    "verification.valide": 4,
    "verification.refuse": 4,
    "verification.suspendu": 4,
    "bien.publication.publie": 5,
    "bien.publication.suspendu": 6,
    "bien.publication.loue": 6,
    "bien.publication.vendu": 6,
    "bien.publication.archive": 6,
    "bien.modifie": 7,
    "bien.disponibilite": 7,
    "bien.modification.refusee": 7,
  };
  const entries = listAudit(db, { entityType: "bien", entityId: row.id, limit: 100 })
    .filter((entry) => PUBLIC_PROPERTY_EVENTS[entry.action])
    .sort((a, b) => {
      const byDate = a.created_at.localeCompare(b.created_at);
      if (byDate !== 0) return byDate;
      return (RANK[a.action] ?? 9) - (RANK[b.action] ?? 9);
    });

  const events: PublicHistoryEvent[] = entries.map((entry) => ({
    title: PUBLIC_PROPERTY_EVENTS[entry.action],
    date: frenchDate(entry.created_at) || entry.created_at.slice(0, 10),
    detail:
      entry.action === "verification.etape" || entry.action === "verification.pieces.demandees"
        ? "Étape du contrôle documentaire. Le détail du dossier reste réservé au propriétaire et à l’administration."
        : entry.action.startsWith("verification.")
          ? "Décision du contrôle documentaire HOMERA."
          : "Événement enregistré dans le journal HOMERA.",
    status: "done",
  }));

  events.push({
    title: "État actuel du dossier",
    date: frenchDate(row.updated_at) || frenchDate(row.created_at),
    detail: `Le bien est « ${PUBLICATION_LABELS[row.publication_status] ?? row.publication_status} »${
      row.verified_on ? `, vérifié le ${frenchDate(row.verified_on)}` : ", sans vérification documentaire à ce jour"
    }.`,
    status: "current",
  });

  return {
    reference: row.reference,
    title: row.title,
    place: [row.district, row.commune || row.city].filter(Boolean).join(", ") || row.city,
    propertyId: row.id,
    verifiedOn: row.verified_on,
    publishedAt: row.published_at,
    events,
  };
}

export type CatalogFilters = {
  intent?: PropertyIntent | "";
  types?: PropertyType[];
  cities?: string[];
  districts?: string[];
  /** Hiérarchie béninoise : département puis commune (ville ou arrondissement). */
  department?: string;
  commune?: string;
  features?: PropertyFeature[];
  landTitles?: LandTitle[];
  q?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  bedroomsMin?: number | null;
  bathroomsMin?: number | null;
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

/**
 * Construction de la clause WHERE du catalogue.
 *
 * `skip` permet de calculer une facette : on retire alors la dimension
 * que l’on est en train de compter, sinon chaque case afficherait zéro
 * dès qu’elle est cochée.
 */
type Skip = "intent" | "types" | "cities" | "districts" | "department" | "commune" | "features" | "landTitles" | "available" | "verified" | "furnished";

function catalogWhere(
  db: Db,
  filters: CatalogFilters,
  options: { onlyPublished?: boolean; skip?: Skip[]; alias?: string } = {},
): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const skip = new Set(options.skip ?? []);
  const t = options.alias ? `${options.alias}.` : "";
  if (options.onlyPublished !== false) {
    clauses.push(`${t}publication_status = 'publie'`);
  } else {
    clauses.push(`${t}publication_status <> 'archive'`);
  }

  if (filters.intent && !skip.has("intent")) {
    clauses.push(`${t}intent = ?`);
    params.push(filters.intent);
  }
  if (filters.types?.length && !skip.has("types")) clauses.push(inClause([...filters.types], `${t}type`, params));
  if (filters.cities?.length && !skip.has("cities")) clauses.push(inClause([...filters.cities], `${t}city`, params));
  if (filters.districts?.length && !skip.has("districts")) clauses.push(inClause([...filters.districts], `${t}district`, params));
  if (filters.department && !skip.has("department")) {
    // Même tolérance qu’à l’affichage : un bien sans département renseigné
    // est rattaché à sa commune, puis à sa ville.
    clauses.push(`(COALESCE(NULLIF(${t}department, ''), NULLIF(${t}commune, ''), ${t}city) = ?)`);
    params.push(filters.department);
  }
  if (filters.commune && !skip.has("commune")) {
    clauses.push(`(COALESCE(NULLIF(${t}commune, ''), ${t}city) = ?)`);
    params.push(filters.commune);
  }
  if (filters.landTitles?.length && !skip.has("landTitles")) clauses.push(inClause([...filters.landTitles], `${t}land_title`, params));
  if (filters.priceMin !== null && filters.priceMin !== undefined) {
    clauses.push(`${t}price >= ?`);
    params.push(filters.priceMin);
  }
  if (filters.priceMax !== null && filters.priceMax !== undefined) {
    clauses.push(`${t}price <= ?`);
    params.push(filters.priceMax);
  }
  if (filters.bedroomsMin !== null && filters.bedroomsMin !== undefined) {
    clauses.push(`${t}bedrooms >= ?`);
    params.push(filters.bedroomsMin);
  }
  if (filters.bathroomsMin !== null && filters.bathroomsMin !== undefined) {
    clauses.push(`${t}bathrooms >= ?`);
    params.push(filters.bathroomsMin);
  }
  if (filters.roomsMin !== null && filters.roomsMin !== undefined) {
    clauses.push(`COALESCE(${t}rooms, ${t}bedrooms) >= ?`);
    params.push(filters.roomsMin);
  }
  if (filters.surfaceMin !== null && filters.surfaceMin !== undefined) {
    clauses.push(`${t}surface >= ?`);
    params.push(filters.surfaceMin);
  }
  if (filters.surfaceMax !== null && filters.surfaceMax !== undefined) {
    clauses.push(`${t}surface <= ?`);
    params.push(filters.surfaceMax);
  }
  if (filters.availableOnly && !skip.has("available")) clauses.push(`${t}availability = 'disponible'`);
  if (filters.verifiedOnly && !skip.has("verified")) clauses.push(`${t}verification_status = 'verifie'`);
  if (filters.furnishedOnly && !skip.has("furnished")) clauses.push(`${t}furnished = 1`);
  if (filters.stayNights !== null && filters.stayNights !== undefined) {
    clauses.push(`(${t}intent <> 'sejour' OR COALESCE(${t}min_nights, 1) <= ?)`);
    params.push(filters.stayNights);
  }
  if (filters.recentOnly) {
    const latest = queryOne<{ value: string | null }>(
      "SELECT MAX(published_at) AS value FROM properties WHERE publication_status = 'publie'",
    );
    if (latest?.value) {
      const threshold = new Date(new Date(latest.value).getTime() - RECENT_DAYS * 86_400_000).toISOString();
      clauses.push(`COALESCE(${t}published_at, ${t}created_at) >= ?`);
      params.push(threshold);
    }
  }
  if (filters.features?.length && !skip.has("features")) {
    for (const feature of filters.features) {
      clauses.push(
        `EXISTS (SELECT 1 FROM property_features pf WHERE pf.property_id = ${t}id AND pf.feature = ?)`,
      );
      params.push(feature);
    }
  }
  if (filters.q) {
    clauses.push(
      `(lower(${t}title) LIKE ? OR lower(${t}district) LIKE ? OR lower(${t}city) LIKE ? OR lower(${t}description) LIKE ? OR lower(${t}reference) LIKE ?)`,
    );
    const needle = `%${filters.q.toLowerCase()}%`;
    params.push(needle, needle, needle, needle, needle);
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function catalogOrder(sort: CatalogFilters["sort"]): string {
  if (sort === "recent") return "ORDER BY COALESCE(published_at, created_at) DESC, title ASC";
  if (sort === "prix-asc") return "ORDER BY price ASC, title ASC";
  if (sort === "prix-desc") return "ORDER BY price DESC, title ASC";
  if (sort === "surface-desc") return "ORDER BY surface DESC, title ASC";
  return "ORDER BY COALESCE(verified_on, '1970-01-01') DESC, COALESCE(published_at, created_at) DESC, title ASC";
}

/** Liste les biens publiés, filtrés en SQL (mêmes règles que `matchesQuery`). */
export function listProperties(db: Db, filters: CatalogFilters = {}, options: { onlyPublished?: boolean } = {}): Property[] {
  const { sql: where, params } = catalogWhere(db, filters, options);
  const rows = queryAll<PropertyRow>(`${PROPERTY_COLUMNS} ${where} ${catalogOrder(filters.sort)}`, params);
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

export type CatalogPage = {
  items: Property[];
  total: number;
  page: number;
  pages: number;
  perPage: number;
};

/**
 * Recherche paginée, entièrement calculée en base.
 *
 * Le client n’a plus à charger tout le catalogue pour en afficher une
 * page : il reçoit la page demandée, le nombre total de résultats et le
 * nombre de pages. Une rechercher reste donc valable quand le catalogue
 * passera de trente-six biens à trente mille.
 */
export function searchProperties(
  db: Db,
  filters: CatalogFilters,
  paging: { page?: number; perPage?: number } = {},
  options: { onlyPublished?: boolean } = {},
): CatalogPage {
  const perPage = Math.min(48, Math.max(1, Math.round(paging.perPage ?? 9)));
  const { sql: where, params } = catalogWhere(db, filters, options);
  const total = queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM properties ${where}`, params)?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, Math.round(paging.page ?? 1)), pages);
  const offset = (page - 1) * perPage;

  const rows = queryAll<PropertyRow>(
    `${PROPERTY_COLUMNS} ${where} ${catalogOrder(filters.sort)} LIMIT ? OFFSET ?`,
    [...params, perPage, offset],
  );
  const items = rows.map((row) => toProperty(row, photosOf(db, row.id), featuresOf(db, row.id)));
  return { items, total, page, pages, perPage };
}

export type FacetCount = { value: string; count: number };

/**
 * Compteurs de facettes, calculés en SQL.
 *
 * Chaque compteur retire sa propre dimension : la case « Cotonou »
 * affiche combien de biens on obtiendrait en la cochant, pas le nombre
 * de résultats déjà filtrés par Cotonou.
 */
export function catalogFacets(db: Db, filters: CatalogFilters, options: { onlyPublished?: boolean } = {}): ServerFacets {
  const countBy = (column: string, skip: Skip[], extra?: Skip[]) => {
    const { sql: where, params } = catalogWhere(db, filters, { ...options, skip: [...skip, ...(extra ?? [])] });
    return queryAll<{ value: string; count: number }>(
      `SELECT ${column} AS value, COUNT(*) AS count FROM properties ${where} GROUP BY ${column} ORDER BY count DESC, value ASC`,
      params,
    ).filter((row) => Boolean(row.value));
  };
  const countAll = (skip: Skip[], clause = "") => {
    const { sql: where, params } = catalogWhere(db, filters, { ...options, skip });
    const extra = clause ? ` AND ${clause}` : "";
    return (
      queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM properties ${where}${extra}`, params)?.total ?? 0
    );
  };

  // Les équipements se comptent un par un : un bien en cumule plusieurs.
  const { sql: featureWhere, params: featureParams } = catalogWhere(db, filters, { ...options, skip: ["features"], alias: "p" });
  const featureCounts = queryAll<{ value: string; count: number }>(
    `SELECT pf.feature AS value, COUNT(DISTINCT pf.property_id) AS count
       FROM property_features pf
       JOIN properties p ON p.id = pf.property_id
      ${featureWhere}
      GROUP BY pf.feature
      ORDER BY count DESC, value ASC`,
    featureParams,
  );

  return {
    intents: countBy("intent", ["intent"]) as ServerFacets["intents"],
    types: countBy("type", ["types"]) as ServerFacets["types"],
    cities: countBy("city", ["cities", "districts"]),
    districts: countBy("district", ["districts"]),
    landTitles: countBy("land_title", ["landTitles"]) as ServerFacets["landTitles"],
    features: featureCounts as ServerFacets["features"],
    total: countAll([]),
    allIntents: countAll(["intent"]),
    available: countAll(["available"], "availability = 'disponible'"),
    verified: countAll(["verified"], "verification_status = 'verifie'"),
    furnished: countAll(["furnished"], "furnished = 1"),
  };
}

export type ServerFacets = {
  intents: { value: PropertyIntent; count: number }[];
  types: { value: PropertyType; count: number }[];
  cities: { value: string; count: number }[];
  districts: { value: string; count: number }[];
  landTitles: { value: LandTitle; count: number }[];
  features: { value: PropertyFeature; count: number }[];
  total: number;
  allIntents: number;
  available: number;
  verified: number;
  furnished: number;
};

/** Bornes de prix du périmètre courant, arrondies au pas de 10 000 FCFA. */
export function catalogPriceBounds(db: Db, filters: CatalogFilters, options: { onlyPublished?: boolean } = {}): { min: number; max: number } {
  const { sql: where, params } = catalogWhere(db, filters, options);
  const row = queryOne<{ min: number | null; max: number | null }>(
    `SELECT MIN(price) AS min, MAX(price) AS max FROM properties ${where}`,
    params,
  );
  const step = 10_000;
  const min = Math.floor((row?.min ?? 0) / step) * step;
  const max = Math.ceil((row?.max ?? 0) / step) * step;
  return { min, max };
}

/**
 * Biens comparables : même intention, même ville si possible, même
 * gamme de prix à ±40 %. Un bien suspendu ou archivé n’est jamais
 * proposé : on ne recommande pas une annonce retirée.
 */
export function similarProperties(db: Db, property: Property, limit = 3): Property[] {
  const rows = queryAll<PropertyRow>(
    `${PROPERTY_COLUMNS}
      WHERE publication_status = 'publie'
        AND id <> ?
        AND intent = ?
        AND price BETWEEN ? AND ?
      ORDER BY (city = ?) DESC, (district = ?) DESC,
               (verification_status = 'verifie') DESC,
               ABS(price - ?) ASC
      LIMIT ?`,
    [
      property.id,
      property.intent,
      Math.round(property.price * 0.6),
      Math.round(property.price * 1.4),
      property.city,
      property.district,
      property.price,
      limit,
    ],
  );
  if (rows.length) return rows.map((row) => toProperty(row, photosOf(db, row.id), featuresOf(db, row.id)));
  // Repli : même intention, sans contrainte de prix.
  const fallback = queryAll<PropertyRow>(
    `${PROPERTY_COLUMNS} WHERE publication_status = 'publie' AND id <> ? AND intent = ? ORDER BY (verification_status = 'verifie') DESC, COALESCE(published_at, created_at) DESC LIMIT ?`,
    [property.id, property.intent, limit],
  );
  return fallback.map((row) => toProperty(row, photosOf(db, row.id), featuresOf(db, row.id)));
}

/** Profil public du propriétaire : ce qu’un visiteur a le droit de savoir, rien de plus. */
export type PublicOwnerProfile = {
  id: string;
  name: string;
  memberSince: string;
  publishedProperties: number;
  verifiedProperties: number;
  emailVerified: boolean;
};

export function publicOwnerProfile(db: Db, ownerId: string | null): PublicOwnerProfile | null {
  if (!ownerId) return null;
  const user = queryOne<{ id: string; prenom: string; nom: string; created_at: string; email_verified: number }>(
    "SELECT id, prenom, nom, created_at, email_verified FROM users WHERE id = ?",
    [ownerId],
  );
  if (!user) return null;
  const counts = queryOne<{ published: number; verified: number }>(
    "SELECT COUNT(*) AS published, SUM(CASE WHEN verification_status = 'verifie' THEN 1 ELSE 0 END) AS verified FROM properties WHERE owner_id = ? AND publication_status = 'publie'",
    [ownerId],
  );
  return {
    id: user.id,
    name: `${user.prenom} ${user.nom}`.trim() || "Propriétaire HOMERA",
    memberSince: user.created_at,
    publishedProperties: counts?.published ?? 0,
    verifiedProperties: counts?.verified ?? 0,
    emailVerified: user.email_verified === 1,
  };
}

/** Biens d’un propriétaire (tous statuts) — espace propriétaire. */
export function propertiesOfOwner(db: Db, ownerId: string): Property[] {
  const rows = queryAll<PropertyRow>(
    `${PROPERTY_COLUMNS} WHERE owner_id = ? ORDER BY created_at DESC`,
    [ownerId],
  );
  return rows.map((row) => toProperty(row, photosOf(db, row.id), featuresOf(db, row.id)));
}

/* ------------------------------------------------------------------
   VUE PROPRIÉTAIRE / AGENT
   ------------------------------------------------------------------
   L’écran d’un espace a besoin de plus que la fiche publique : le statut
   de publication réel, l’état du contrôle et le nombre de pièces
   fournies. Ces champs viennent de la base, ils ne sont jamais déduits.
   ------------------------------------------------------------------ */

export type PropertyWorkspaceView = Property & {
  publicationStatus: PublicationStatus;
  verification: string;
  availability: string;
  photos: number;
  documents: number;
  updatedAt: string;
  /** Mandat actif, le cas échéant (vue agent). */
  mandate?: { reference: string; status: string; scope: string[]; expiresAt: string } | null;
};

export type PublicationStatus =
  | "brouillon"
  | "soumis"
  | "en-verification"
  | "publie"
  | "suspendu"
  | "loue"
  | "vendu"
  | "archive";

function workspaceViews(db: Db, rows: PropertyRow[]): PropertyWorkspaceView[] {
  const count = db.prepare<[string], { total: number }>(
    "SELECT COUNT(*) AS total FROM property_photos WHERE property_id = ?",
  );
  const docs = db.prepare<[string], { total: number }>(
    "SELECT COUNT(*) AS total FROM documents WHERE entity_type = 'bien' AND entity_id = ?",
  );
  return rows.map((row) => {
    const property = toProperty(row, photosOf(db, row.id), featuresOf(db, row.id));
    return {
      ...property,
      publicationStatus: row.publication_status as PublicationStatus,
      verification: row.verification_status,
      availability: row.availability,
      photos: count.get(row.id)?.total ?? 0,
      documents: docs.get(row.id)?.total ?? 0,
      updatedAt: row.updated_at,
    };
  });
}

/** Dossiers du propriétaire, tous statuts confondus : un brouillon doit rester visible. */
export function ownerWorkspaceProperties(db: Db, ownerId: string): PropertyWorkspaceView[] {
  const rows = queryAll<PropertyRow>(
    `${PROPERTY_COLUMNS} WHERE owner_id = ? ORDER BY updated_at DESC`,
    [ownerId],
  );
  return workspaceViews(db, rows);
}

/** Biens réellement couverts par un mandat actif, avec la portée du mandat. */
export function agentWorkspaceProperties(db: Db, agentId: string): PropertyWorkspaceView[] {
  const rows = queryAll<PropertyRow & { aut_reference: string | null; aut_status: string | null; aut_scope: string | null; aut_expires: string | null }>(
    `${PROPERTY_COLUMNS.replace(" FROM properties", ", a.reference AS aut_reference, a.status AS aut_status, a.scope AS aut_scope, a.expires_at AS aut_expires FROM properties")}
     JOIN authorizations a ON a.property_id = properties.id
     WHERE a.agent_id = ? AND a.status = 'active' AND a.expires_at >= ?
     ORDER BY properties.updated_at DESC`,
    [agentId, nowIso().slice(0, 10)],
  );
  return rows.map((row) => ({
    ...workspaceViews(db, [row])[0],
    mandate: row.aut_reference
      ? {
          reference: row.aut_reference,
          status: row.aut_status ?? "",
          scope: (row.aut_scope ?? "").split(",").filter(Boolean),
          expiresAt: row.aut_expires ?? "",
        }
      : null,
  }));
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
  // Le département se déduit de la commune quand il n’est pas saisi :
  // la table de référence béninoise est la seule source, pas une supposition.
  const commune = input.commune ?? input.city;
  const department =
    input.department ??
    queryOne<{ department: string }>(
      "SELECT department FROM locations WHERE kind = 'commune' AND commune = ? LIMIT 1",
      [commune],
    )?.department ??
    "";
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
      department,
      commune,
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

/* ==================================================================
   VUE ADMINISTRATIVE DU CATALOGUE
   ------------------------------------------------------------------
   L’administration doit pouvoir répondre à trois questions simples :
   combien de biens, dans quel état de publication, et à qui
   appartiennent-ils. Rien de plus, rien de moins : les pièces du
   dossier ne remontent pas ici, elles se lisent dossier par dossier.
   ================================================================== */

export type AdminPropertyView = {
  id: string;
  reference: string;
  title: string;
  type: string;
  intent: string;
  city: string;
  district: string;
  price: number;
  publicationStatus: string;
  verificationStatus: string;
  availabilityStatus: string;
  ownerId: string | null;
  ownerName: string;
  ownerEmail: string;
  agentName: string | null;
  photos: number;
  documents: number;
  createdAt: string;
  updatedAt: string;
  ageDays: number;
};

export function adminProperties(db: Db, filters: { q?: string; publication?: string } = {}): AdminPropertyView[] {
  const params: string[] = [];
  const where: string[] = [];
  const q = (filters.q ?? "").trim();
  if (q) {
    where.push("(p.title LIKE ? OR p.reference LIKE ? OR p.city LIKE ? OR p.district LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (filters.publication) {
    where.push("p.publication_status = ?");
    params.push(filters.publication);
  }
  const rows = queryAll<PropertyRow & { owner_prenom: string; owner_nom: string; owner_email: string }>(
    `${PROPERTY_COLUMNS.replace(" FROM properties", ", p.owner_id AS ownerId, u.prenom AS owner_prenom, u.nom AS owner_nom, u.email AS owner_email FROM properties p JOIN users u ON u.id = p.owner_id")} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY p.updated_at DESC`.replace("SELECT *", "SELECT p.*"),
    params,
  );
  return rows.map((row) => {
    const photos = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM property_photos WHERE property_id = ?", [row.id])?.c ?? 0;
    const documents = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM documents WHERE entity_type = 'bien' AND entity_id = ?", [row.id])?.c ?? 0;
    const agent = queryOne<{ agent_id: string; prenom: string; nom: string }>(
      `SELECT a.agent_id, u.prenom, u.nom FROM authorizations a JOIN users u ON u.id = a.agent_id
        WHERE a.property_id = ? AND a.status = 'active' ORDER BY a.updated_at DESC LIMIT 1`,
      [row.id],
    );
    return {
      id: row.id,
      reference: row.reference,
      title: row.title,
      type: row.type,
      intent: row.intent,
      city: row.city,
      district: row.district,
      price: row.price,
      publicationStatus: row.publication_status,
      verificationStatus: row.verification_status,
      availabilityStatus: row.availability,
      ownerId: row.owner_id,
      ownerName: `${row.owner_prenom ?? ""} ${row.owner_nom ?? ""}`.trim(),
      ownerEmail: row.owner_email ?? "",
      agentName: agent ? `${agent.prenom} ${agent.nom}`.trim() : null,
      photos,
      documents,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ageDays: Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86_400_000)),
    };
  });
}

/**
 * Changement de statut de publication par l’administration : suspendre
 * une annonce qui ment, la remettre en ligne, ou l’archiver. Le motif
 * est obligatoire pour toute mesure défavorable — il est notifié au
 * propriétaire et conservé au journal.
 */
export function setPublicationStatus(
  db: Db,
  actor: UserContext,
  propertyId: string,
  input: { status: "publie" | "suspendu" | "archive" | "soumis"; reason?: string },
  meta: { ip?: string } = {},
): ServiceResult<{ property: AdminPropertyView }> {
  const row = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [propertyId, propertyId]);
  if (!row) return { ok: false, message: "Bien introuvable." };
  const reason = (input.reason ?? "").trim();
  if ((input.status === "suspendu" || input.status === "archive") && !reason) {
    return { ok: false, message: "Une mesure défavorable doit être motivée.", fields: { reason: "Motif obligatoire." } };
  }
  const at = nowIso();
  db.transaction(() => {
    db.prepare("UPDATE properties SET publication_status = ?, updated_at = ? WHERE id = ?").run(input.status, at, row.id);
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: `bien.publication.${input.status}`,
      entityType: "bien",
      entityId: row.id,
      detail: { depuis: row.publication_status, motif: reason },
      ip: meta.ip ?? "",
    });
    notify(db, {
      userIds: [row.owner_id],
      type: "publication",
      title:
        input.status === "publie" ? "Annonce remise en ligne" : input.status === "soumis" ? "Dossier renvoyé en instruction" : "Annonce retirée du catalogue",
      body: `${row.reference} · ${reason || "Décision de l’administration HOMERA."}`,
      link: "/proprietaire/biens",
      entityType: "bien",
      entityId: row.id,
    });
  })();
  const property = adminProperties(db).find((entry) => entry.id === row.id);
  if (!property) return { ok: false, message: "Le bien n’a pas pu être relu après enregistrement." };
  return { ok: true, data: { property } };
}

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

/* ------------------------------------------------------------------
   HIÉRARCHIE ADMINISTRATIVE (Bénin)
   ------------------------------------------------------------------
   Le pays se découpe en départements, communes et quartiers
   (arrondissements compris). Les listes sont calculées depuis les
   biens **publiés** : proposer une commune sans annonce serait une
   promesse vide.
   ------------------------------------------------------------------ */

export type LocationCount = { value: string; count: number };

function countByColumn(
  db: Db,
  column: "department" | "commune" | "district",
  where: string,
  params: unknown[],
): LocationCount[] {
  // Un bien créé avant la hiérarchie, ou saisi sans elle, reste trouvable :
  // la ville tient lieu de commune, et la commune tient lieu de département.
  const value =
    column === "department"
      ? "COALESCE(NULLIF(department, ''), NULLIF(commune, ''), city)"
      : column === "commune"
        ? "COALESCE(NULLIF(commune, ''), city)"
        : "district";
  return queryAll<LocationCount>(
    `SELECT ${value} AS value, COUNT(*) AS count
       FROM properties
      WHERE publication_status = 'publie' AND ${value} <> '' ${where}
      GROUP BY ${value}
      ORDER BY count DESC, value ASC`,
    params,
  );
}

export function locationTree(
  db: Db,
  scope: { department?: string; commune?: string } = {},
): { country: string; departments: LocationCount[]; communes: LocationCount[]; districts: LocationCount[] } {
  return {
    country: "Bénin",
    departments: countByColumn(db, "department", "", []),
    communes: countByColumn(db, "commune", scope.department ? "AND department = ?" : "", scope.department ? [scope.department] : []),
    districts: countByColumn(
      db,
      "district",
      scope.commune ? "AND (commune = ? OR city = ?)" : scope.department ? "AND department = ?" : "",
      scope.commune ? [scope.commune, scope.commune] : scope.department ? [scope.department] : [],
    ),
  };
}

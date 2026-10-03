import {
  FEATURE_ORDER,
  PROPERTIES,
  type LandTitle,
  type Property,
  type PropertyFeature,
  type PropertyIntent,
  type PropertyType,
} from "@/lib/content";
import {
  FEATURE_LABELS,
  INTENT_LABELS,
  SEARCH_TYPE_TO_PROPERTY_TYPE,
  TYPE_LABELS,
  type SearchCriteria,
} from "@/lib/format";

/* ==================================================================
   HOMERA — MOTEUR DU CATALOGUE PUBLIC
   ------------------------------------------------------------------
   Un seul endroit décide ce qu’un visiteur voit dans l’explorateur :
   filtres, tri, facettes, pagination et adresse partageable.

   Le module est pur : aucun état React, aucun accès au navigateur.
   Les pages lui passent une requête (`CatalogQuery`), il rend une
   liste — ce qui le rend testable hors navigateur (scripts/test-motion).

   Vocabulaire de l’adresse :
     intention, type, ville, quartier, equipement, titre, q, tri, page,
     prix-min, prix-max, chambres, pieces, surface-min, surface-max,
     nuits, nouveautes
   ================================================================== */

export type SortId = "pertinence" | "recent" | "prix-asc" | "prix-desc" | "surface-desc";

export const SORTS: { id: SortId; label: string }[] = [
  { id: "pertinence", label: "Pertinence" },
  { id: "recent", label: "Plus récents" },
  { id: "prix-asc", label: "Prix croissant" },
  { id: "prix-desc", label: "Prix décroissant" },
  { id: "surface-desc", label: "Surface, du plus grand" },
];

export const INTENT_IDS: PropertyIntent[] = ["acheter", "louer", "sejour"];

/** Catégories proposées par projet — « studios » n’existent qu’à la location et au séjour. */
export const TYPES_BY_INTENT: Record<PropertyIntent, PropertyType[]> = {
  acheter: ["villa", "appartement", "terrain", "local"],
  louer: ["villa", "appartement", "studio", "local"],
  sejour: ["villa", "appartement", "studio"],
};

/** Catégories d’une page de projet, dans l’ordre éditorial (voir lib/nav.ts). */
export const PER_PAGE = 9;

/** Fenêtre des « nouveautés » : quinze jours après la dernière publication. */
export const RECENT_DAYS = 15;

export type CatalogQuery = {
  intent: PropertyIntent | "";
  types: PropertyType[];
  cities: string[];
  districts: string[];
  features: PropertyFeature[];
  landTitles: LandTitle[];
  q: string;
  priceMin: number | null;
  priceMax: number | null;
  bedroomsMin: number | null;
  roomsMin: number | null;
  surfaceMin: number | null;
  surfaceMax: number | null;
  /** Séjour : durée souhaitée, en nuitées. */
  stayNights: number | null;
  /** Uniquement les biens publiés dans les trente derniers jours du catalogue. */
  recentOnly: boolean;
  sort: SortId;
  page: number;
};

export const EMPTY_QUERY: CatalogQuery = {
  intent: "",
  types: [],
  cities: [],
  districts: [],
  features: [],
  landTitles: [],
  q: "",
  priceMin: null,
  priceMax: null,
  bedroomsMin: null,
  roomsMin: null,
  surfaceMin: null,
  surfaceMax: null,
  stayNights: null,
  recentOnly: false,
  sort: "pertinence",
  page: 1,
};

/* ------------------------------------------------------------------
   LECTURE / ÉCRITURE DE L’ADRESSE
   ------------------------------------------------------------------ */

const list = (params: URLSearchParams, key: string) =>
  params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

const integer = (params: URLSearchParams, key: string) => {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw.replace(/[^\d]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
};

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | "" =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : "";

const LAND_TITLES: LandTitle[] = ["titre-foncier", "acd", "en-cours"];

export function parseCatalogQuery(input: URLSearchParams | string): CatalogQuery {
  const params = typeof input === "string" ? new URLSearchParams(input.replace(/^\?/, "")) : input;
  const sort = oneOf(params.get("tri"), SORTS.map((entry) => entry.id));
  const page = integer(params, "page");

  return {
    ...EMPTY_QUERY,
    intent: oneOf(params.get("intention"), INTENT_IDS),
    types: list(params, "type").filter((value): value is PropertyType =>
      (Object.keys(TYPE_LABELS) as string[]).includes(value)),
    cities: list(params, "ville"),
    districts: list(params, "quartier"),
    features: list(params, "equipement").filter((value): value is PropertyFeature =>
      Object.keys(FEATURE_LABELS).includes(value)),
    landTitles: list(params, "titre").filter((value): value is LandTitle =>
      (LAND_TITLES as string[]).includes(value)),
    q: (params.get("q") ?? "").trim(),
    priceMin: integer(params, "prix-min"),
    priceMax: integer(params, "prix-max"),
    bedroomsMin: integer(params, "chambres"),
    roomsMin: integer(params, "pieces"),
    surfaceMin: integer(params, "surface-min"),
    surfaceMax: integer(params, "surface-max"),
    stayNights: integer(params, "nuits"),
    recentOnly: params.get("nouveautes") === "1",
    sort: sort || "pertinence",
    page: page ?? 1,
  };
}

export function buildCatalogParams(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.intent) params.set("intention", query.intent);
  for (const type of query.types) params.append("type", type);
  for (const city of query.cities) params.append("ville", city);
  for (const district of query.districts) params.append("quartier", district);
  for (const feature of query.features) params.append("equipement", feature);
  for (const title of query.landTitles) params.append("titre", title);
  if (query.q) params.set("q", query.q);
  if (query.priceMin !== null) params.set("prix-min", String(query.priceMin));
  if (query.priceMax !== null) params.set("prix-max", String(query.priceMax));
  if (query.bedroomsMin !== null) params.set("chambres", String(query.bedroomsMin));
  if (query.roomsMin !== null) params.set("pieces", String(query.roomsMin));
  if (query.surfaceMin !== null) params.set("surface-min", String(query.surfaceMin));
  if (query.surfaceMax !== null) params.set("surface-max", String(query.surfaceMax));
  if (query.stayNights !== null) params.set("nuits", String(query.stayNights));
  if (query.recentOnly) params.set("nouveautes", "1");
  if (query.sort !== "pertinence") params.set("tri", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

/** Adresse complète et partageable d’une recherche. */
export function catalogHref(query: CatalogQuery, path = "/explorer"): string {
  const search = buildCatalogParams(query).toString();
  return search ? `${path}?${search}` : path;
}

/** Tous les filtres actifs ont-ils été retirés ? (hors tri et pagination) */
export function isPristine(query: CatalogQuery): boolean {
  return (
    !query.intent &&
    query.types.length === 0 &&
    query.cities.length === 0 &&
    query.districts.length === 0 &&
    query.features.length === 0 &&
    query.landTitles.length === 0 &&
    !query.q &&
    query.priceMin === null &&
    query.priceMax === null &&
    query.bedroomsMin === null &&
    query.roomsMin === null &&
    query.surfaceMin === null &&
    query.surfaceMax === null &&
    query.stayNights === null &&
    !query.recentOnly
  );
}

/** Nombre de filtres actifs — badge du bouton « Filtres » sur mobile. */
export function activeFilterCount(query: CatalogQuery): number {
  return (
    (query.intent ? 1 : 0) +
    query.types.length +
    query.cities.length +
    query.districts.length +
    query.features.length +
    query.landTitles.length +
    (query.q ? 1 : 0) +
    (query.priceMin !== null ? 1 : 0) +
    (query.priceMax !== null ? 1 : 0) +
    (query.bedroomsMin !== null ? 1 : 0) +
    (query.roomsMin !== null ? 1 : 0) +
    (query.surfaceMin !== null ? 1 : 0) +
    (query.surfaceMax !== null ? 1 : 0) +
    (query.stayNights !== null ? 1 : 0) +
    (query.recentOnly ? 1 : 0)
  );
}

/* ------------------------------------------------------------------
   PASSERELLE AVEC LA RECHERCHE DE L’ACCUEIL
   ------------------------------------------------------------------
   Le module du hero travaille avec des libellés choisis dans une
   liste (Localisation, Type de bien, Montant). L’explorateur, lui,
   travaille avec des critères structurés. Cette conversion évite que
   les deux recherches racontent des choses différentes.
   ------------------------------------------------------------------ */

const CITY_NAMES = [...new Set(PROPERTIES.map((property) => property.city))];
const DISTRICT_NAMES = [...new Set(PROPERTIES.map((property) => property.district))];

export function criteriaToCatalogQuery(criteria: SearchCriteria): CatalogQuery {
  const budget = criteria.budget ? Number(criteria.budget.replace(/[^\d]/g, "")) : Number.NaN;
  const intent = (INTENT_IDS as string[]).includes(criteria.project) ? (criteria.project as PropertyIntent) : "";
  const types = criteria.propertyType ? (SEARCH_TYPE_TO_PROPERTY_TYPE[criteria.propertyType] ?? []) : [];
  const place = criteria.location;
  const cities = place && CITY_NAMES.includes(place) ? [place] : [];
  const districts = place && !cities.length && DISTRICT_NAMES.includes(place) ? [place] : [];

  return {
    ...EMPTY_QUERY,
    intent,
    types,
    cities,
    districts,
    priceMax: Number.isFinite(budget) && budget > 0 ? budget : null,
  };
}

/* ------------------------------------------------------------------
   FILTRES
   ------------------------------------------------------------------ */

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Date JJ/MM/AAAA → rang comparable (AAAAMMJJ). */
export function frenchDateRank(value: string): number {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return match ? Number(`${match[3]}${match[2]}${match[1]}`) : 0;
}

/** Dernière publication du catalogue : repère stable pour les « nouveautés ». */
export const LATEST_PUBLISHED_AT = PROPERTIES.reduce(
  (latest, property) => (property.publishedAt > latest ? property.publishedAt : latest),
  PROPERTIES[0].publishedAt,
);

function daysBefore(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const RECENT_FROM = daysBefore(LATEST_PUBLISHED_AT, RECENT_DAYS);

export function matchesQuery(property: Property, query: CatalogQuery): boolean {
  if (query.intent && property.intent !== query.intent) return false;
  if (query.types.length && !query.types.includes(property.type)) return false;
  if (query.cities.length && !query.cities.includes(property.city)) return false;
  if (query.districts.length && !query.districts.includes(property.district)) return false;

  if (query.features.length) {
    const features = property.features ?? [];
    if (!query.features.every((feature) => features.includes(feature))) return false;
  }
  if (query.landTitles.length && (!property.landTitle || !query.landTitles.includes(property.landTitle))) {
    return false;
  }

  if (query.priceMin !== null && property.price < query.priceMin) return false;
  if (query.priceMax !== null && property.price > query.priceMax) return false;
  if (query.bedroomsMin !== null && property.bedrooms < query.bedroomsMin) return false;
  if (query.roomsMin !== null && (property.rooms ?? property.bedrooms) < query.roomsMin) return false;
  if (query.surfaceMin !== null && property.surface < query.surfaceMin) return false;
  if (query.surfaceMax !== null && property.surface > query.surfaceMax) return false;

  // Séjour : une durée souhaitée n’est recevable que si le bien l’accepte.
  if (query.stayNights !== null && property.intent === "sejour") {
    if ((property.minNights ?? 1) > query.stayNights) return false;
  }

  if (query.recentOnly && property.publishedAt < RECENT_FROM) return false;

  if (query.q) {
    const haystack = normalize(
      `${property.title} ${property.district} ${property.city} ${property.description ?? ""} ${property.homeraId}`,
    );
    if (!query.q.split(/\s+/).every((word) => haystack.includes(normalize(word)))) return false;
  }

  return true;
}

/* ------------------------------------------------------------------
   TRI
   ------------------------------------------------------------------ */

/** Un prix de vente, un loyer et une nuitée ne se comparent pas : le tri prix regroupe par projet. */
const INTENT_RANK: Record<PropertyIntent, number> = { acheter: 0, louer: 1, sejour: 2 };

export function sortProperties(items: Property[], sort: SortId, query?: CatalogQuery): Property[] {
  const grouped = query?.intent ? false : true;
  const byIntent = (a: Property, b: Property) => (grouped ? INTENT_RANK[a.intent] - INTENT_RANK[b.intent] : 0);
  const sorted = [...items];

  switch (sort) {
    case "recent":
      sorted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title, "fr"));
      break;
    case "prix-asc":
      sorted.sort((a, b) => byIntent(a, b) || a.price - b.price || a.title.localeCompare(b.title, "fr"));
      break;
    case "prix-desc":
      sorted.sort((a, b) => byIntent(a, b) || b.price - a.price || a.title.localeCompare(b.title, "fr"));
      break;
    case "surface-desc":
      sorted.sort((a, b) => b.surface - a.surface || a.title.localeCompare(b.title, "fr"));
      break;
    default:
      // Pertinence : vérification la plus récente d’abord, puis mise en ligne.
      sorted.sort((a, b) =>
        frenchDateRank(b.verifiedOn) - frenchDateRank(a.verifiedOn) ||
        b.publishedAt.localeCompare(a.publishedAt) ||
        a.title.localeCompare(b.title, "fr"));
  }
  return sorted;
}

/* ------------------------------------------------------------------
   APPLICATION COMPLÈTE + PAGINATION
   ------------------------------------------------------------------ */

export type CatalogPage = {
  items: Property[];
  total: number;
  page: number;
  pages: number;
  from: number;
  to: number;
  perPage: number;
};

export function searchCatalog(query: CatalogQuery, source: Property[] = PROPERTIES): Property[] {
  return sortProperties(source.filter((property) => matchesQuery(property, query)), query.sort, query);
}

export function paginate(items: Property[], page: number, perPage = PER_PAGE): CatalogPage {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(total, current * perPage);
  return {
    items: items.slice(from === 0 ? 0 : from - 1, to),
    total,
    page: current,
    pages,
    from,
    to,
    perPage,
  };
}

/** Résultat complet d’une page de catalogue : liste, compteurs et fenêtre affichée. */
export function queryCatalog(query: CatalogQuery, source: Property[] = PROPERTIES): CatalogPage {
  return paginate(searchCatalog(query, source), query.page);
}

/* ------------------------------------------------------------------
   FACETTES — chaque compteur est calculé sans son propre filtre,
   pour qu’une valeur à 0 reste visible et compréhensible.
   ------------------------------------------------------------------ */

export type FacetCount<T extends string = string> = { value: T; count: number };

const countValues = <T extends string>(
  items: Property[],
  values: T[],
  pick: (property: Property) => readonly T[],
): FacetCount<T>[] => values.map((value) => ({
  value,
  count: items.filter((property) => pick(property).includes(value)).length,
}));

export type CatalogFacets = {
  intents: { value: PropertyIntent; count: number }[];
  types: FacetCount<PropertyType>[];
  cities: FacetCount[];
  districts: FacetCount[];
  features: FacetCount<PropertyFeature>[];
  /** Nombre de résultats pour la requête complète. */
  total: number;
  /** Nombre de biens visibles une fois le projet ignoré. */
  allIntents: number;
};

export function facets(source: Property[], query: CatalogQuery): CatalogFacets {
  const withoutIntent = searchCatalog({ ...query, intent: "" }, source);
  const withoutType = searchCatalog({ ...query, types: [] }, source);
  const withoutPlace = searchCatalog({ ...query, cities: [], districts: [] }, source);
  const withoutFeature = searchCatalog({ ...query, features: [] }, source);
  const intentAndType = searchCatalog({ ...query, intent: "", types: [], features: [] }, source);

  const typeValues = query.intent ? TYPES_BY_INTENT[query.intent] : (Object.keys(TYPE_LABELS) as PropertyType[]);
  const cities = [...new Set(withoutPlace.map((entry) => entry.city))].sort((a, b) => a.localeCompare(b, "fr"));
  const scoped = withoutPlace.filter((entry) => !query.cities.length || query.cities.includes(entry.city));
  const districts = [...new Set(scoped.map((entry) => entry.district))].sort((a, b) => a.localeCompare(b, "fr"));

  // Les équipements proposés sont ceux réellement présents dans le périmètre courant.
  const scope = query.intent ? withoutIntent.filter((entry) => entry.intent === query.intent) : withoutIntent;
  const presentFeatures = new Set(scope.flatMap((entry) => entry.features ?? []));

  return {
    intents: INTENT_IDS.map((intent) => ({
      value: intent,
      count: intentAndType.filter((entry) => entry.intent === intent).length,
    })),
    types: countValues(withoutType, typeValues, (entry) => [entry.type]),
    cities: countValues(withoutPlace, cities, (entry) => [entry.city]),
    districts: countValues(withoutPlace, districts, (entry) => [entry.district]),
    features: countValues(withoutFeature, FEATURE_ORDER.filter((feature) => presentFeatures.has(feature)), (entry) => entry.features ?? []),
    total: searchCatalog(query, source).length,
    allIntents: withoutIntent.length,
  };
}

/** Bornes de prix du périmètre courant, arrondies à la dizaine de milliers de FCFA. */
export function priceBounds(items: Property[]): { min: number; max: number } {
  if (!items.length) return { min: 0, max: 0 };
  const step = 10_000;
  const prices = items.map((property) => property.price);
  return {
    min: Math.floor(Math.min(...prices) / step) * step,
    max: Math.ceil(Math.max(...prices) / step) * step,
  };
}

/* ------------------------------------------------------------------
   PHRASES DE SYNTHÈSE (explorateur + pages de projet)
   ------------------------------------------------------------------ */

/** « à louer · appartements · Cotonou · 3 chambres minimum ». */
export function summaryLabel(query: CatalogQuery): string {
  const plural = (count: number) => (count > 1 ? "s" : "");
  const parts: string[] = [];
  if (query.intent) parts.push(INTENT_LABELS[query.intent].toLowerCase());
  if (query.types.length) parts.push(query.types.map((type) => TYPE_LABELS[type].toLowerCase() + plural(query.types.length)).join(", "));
  if (query.cities.length) parts.push(query.cities.join(", "));
  if (query.districts.length) parts.push(query.districts.join(", "));
  if (query.features.length) parts.push(query.features.map((feature) => FEATURE_LABELS[feature].toLowerCase()).join(", "));
  if (query.landTitles.length) {
    parts.push(query.landTitles
      .map((title) => (title === "titre-foncier" ? "titre foncier" : title === "acd" ? "ACD" : "titre en cours"))
      .join(", "));
  }
  if (query.bedroomsMin !== null) parts.push(`${query.bedroomsMin} chambres minimum`);
  if (query.roomsMin !== null) parts.push(`${query.roomsMin} pièces minimum`);
  if (query.surfaceMin !== null) parts.push(`à partir de ${query.surfaceMin} m²`);
  if (query.surfaceMax !== null) parts.push(`jusqu’à ${query.surfaceMax} m²`);
  if (query.stayNights !== null) parts.push(`séjour de ${query.stayNights} nuit${plural(query.stayNights)}`);
  if (query.recentOnly) parts.push("nouveautés");
  if (query.q) parts.push(`« ${query.q} »`);
  return parts.join(" · ");
}

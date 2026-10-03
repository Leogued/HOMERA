import {
  FEATURE_LABELS,
  LAND_TITLE_LABELS,
  type Property,
  type PropertyIntent,
  type PropertyType,
} from "@/lib/content";

/* ==================================================================
   HOMERA — LECTURE DES DONNÉES
   ================================================================== */

const numberFormatter = new Intl.NumberFormat("fr-FR");

/** « 450000 » → « 450 000 FCFA » (espaces fines insécables, chiffres alignés). */
export function formatFCFA(value: number): string {
  return `${formatNumber(value)} FCFA`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
    .replace(/\u00A0/g, "\u202F")
    .replace(/\u202F/g, "\u202F");
}

/** Dictionnaires d’affichage : réexportés ici pour que les pages n’aient qu’une source. */
export { FEATURE_LABELS, LAND_TITLE_LABELS };

export const INTENT_LABELS: Record<PropertyIntent, string> = {
  acheter: "À vendre",
  louer: "À louer",
  sejour: "Séjour",
};

export const TYPE_LABELS: Record<PropertyType, string> = {
  villa: "Villa",
  appartement: "Appartement",
  studio: "Studio",
  terrain: "Terrain",
  local: "Local commercial",
};

/** Normalise pour comparer sans accents ni casse (Cotonou / cotonou / Cadjèhoun). */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Les choix de « Type de bien » du module de recherche et le modèle interne diffèrent : on les relie ici. */
export const SEARCH_TYPE_TO_PROPERTY_TYPE: Record<string, PropertyType[]> = {
  appartement: ["appartement"],
  studio: ["studio"],
  villa: ["villa"],
  maison: ["villa"],
  terrain: ["terrain"],
  parcelle: ["terrain"],
  local: ["local"],
};

export type SearchCriteria = {
  project: string;
  location: string;
  propertyType: string;
  budget: string;
};

export const EMPTY_CRITERIA: SearchCriteria = {
  project: "",
  location: "",
  propertyType: "",
  budget: "",
};

export function hasCriteria(criteria: SearchCriteria): boolean {
  return Boolean(
    criteria.project || criteria.location || criteria.propertyType || criteria.budget,
  );
}

/** Applique les critères du module de recherche à un bien. */
export function matchesCriteria(property: Property, criteria: SearchCriteria): boolean {
  if (criteria.project && property.intent !== criteria.project) return false;

  if (criteria.location) {
    const needle = normalize(criteria.location);
    const haystack = normalize(`${property.city} ${property.district}`);
    if (!haystack.includes(needle)) return false;
  }

  if (criteria.propertyType) {
    const allowed = SEARCH_TYPE_TO_PROPERTY_TYPE[criteria.propertyType];
    if (allowed && !allowed.includes(property.type)) return false;
  }

  if (criteria.budget) {
    const cap = Number(criteria.budget.replace(/\s/g, ""));
    if (Number.isFinite(cap) && cap > 0 && property.price > cap) return false;
  }

  return true;
}

/** « 280 m² » — surface d’un bien, chiffres tabulaires à l’affichage. */
export function formatSurface(value: number): string {
  return `${formatNumber(value)} m²`;
}

/** Prix complet d’une fiche : « 450 000 FCFA » + « / mois » quand le bien est périodique. */
export function formatPropertyPrice(property: Pick<Property, "price" | "pricePeriod">): string {
  return `${formatFCFA(property.price)}${property.pricePeriod ? ` ${property.pricePeriod}` : ""}`;
}

/** Nombre de jours entre deux dates ISO (AAAA-MM-JJ). */
export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

/** Ancienneté lisible : « aujourd’hui », « hier », « il y a 5 jours », « il y a 2 mois ». */
export function recencyLabel(iso: string, reference: string): string {
  const days = daysBetween(iso, reference);
  if (days <= 0) return "aujourd’hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 31) {
    const weeks = Math.floor(days / 7);
    return `il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  }
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

/** Compteur lisible : « 3 biens », « 1 bien », « aucun bien ». */
export function countLabel(count: number, singular = "bien", plural = "biens"): string {
  if (count === 0) return `Aucun ${singular}`;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}

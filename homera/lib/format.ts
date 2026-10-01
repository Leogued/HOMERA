import type { Property, PropertyIntent, PropertyType } from "@/lib/content";

/* ==================================================================
   HOMERA — LECTURE DES DONNÉES
   ================================================================== */

/** « 450000 » → « 450 000 FCFA » (espaces fines insécables, chiffres alignés). */
export function formatFCFA(value: number): string {
  return `${formatNumber(value)} FCFA`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR")
    .format(value)
    .replace(/\u00A0/g, "\u202F")
    .replace(/\u202F/g, "\u202F");
}

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
const SEARCH_TYPE_TO_PROPERTY_TYPE: Record<string, PropertyType[]> = {
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

/** Compteur lisible : « 3 biens », « 1 bien », « aucun bien ». */
export function countLabel(count: number, singular = "bien", plural = "biens"): string {
  if (count === 0) return `Aucun ${singular}`;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}

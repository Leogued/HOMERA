import { PROPERTIES, type Property, type PropertyIntent, type PropertyType } from "@/lib/content";
import type { PublicAccount } from "@/lib/accounts";
import { INTENT_LABELS, TYPE_LABELS } from "@/lib/format";
import type { SavedSearch } from "@/lib/persistence";
import { parseCatalogQuery } from "@/lib/properties";

/* ==================================================================
   HOMERA — RECOMMANDATIONS : UNE SÉLECTION EXPLIQUÉE, PAS UN SCORE IA
   ------------------------------------------------------------------
   La sélection croise trois signaux réels et vérifiables par le
   client : son projet déclaré à l’inscription, sa recherche la plus
   récente et son budget déclaré. Les biens déjà en favoris sont
   exclus, puis l’ordre privilégie les correspondances et, à égalité,
   les publications les plus récentes.

   `recommendationReasons` expose exactement les correspondances qui
   ont compté : aucune note, aucun pourcentage, aucun « score IA ».
   ================================================================== */

export const PROPERTY_TYPES: readonly PropertyType[] = ["villa", "appartement", "studio", "chambre", "immeuble", "terrain", "boutique", "salle", "espace"];
export const PROPERTY_INTENTS: readonly PropertyIntent[] = ["acheter", "louer", "sejour"];

type RecommendationBasis = {
  intent: PropertyIntent | null;
  types: PropertyType[];
  city: string;
  maxPrice: number | null;
};

function queryFromSavedSearch(search: SavedSearch | undefined) {
  if (!search) return null;
  const question = search.href.indexOf("?");
  return parseCatalogQuery(question < 0 ? "" : search.href.slice(question + 1));
}

function budgetLimit(budget: string | undefined): number | null {
  switch (budget) {
    case "location-100":
      return 100_000;
    case "location-500":
      return 500_000;
    case "achat-25":
      return 25_000_000;
    case "achat-75":
      return 75_000_000;
    default:
      return null;
  }
}

function basisFrom(account: PublicAccount, searches: SavedSearch[]): RecommendationBasis {
  const recentQuery = queryFromSavedSearch(searches[0]);
  const declaredProject = account.profile.projet;
  const declaredIntent: PropertyIntent | null =
    declaredProject === "investir"
      ? "acheter"
      : PROPERTY_INTENTS.includes(declaredProject as PropertyIntent)
        ? (declaredProject as PropertyIntent)
        : null;
  const declaredType = account.profile.bienRecherche;
  const recentIntent = recentQuery?.intent;
  return {
    intent: declaredIntent ?? (recentIntent ? recentIntent : null),
    types: PROPERTY_TYPES.includes(declaredType as PropertyType)
      ? [declaredType as PropertyType]
      : (recentQuery?.types ?? []),
    city: recentQuery?.cities[0] ?? "",
    maxPrice: budgetLimit(account.profile.budget),
  };
}

export function selectRecommendations(
  account: PublicAccount,
  favoriteIds: string[],
  searches: SavedSearch[],
  limit = 4,
): Property[] {
  const basis = basisFrom(account, searches);
  return PROPERTIES.filter((property) => !favoriteIds.includes(property.id))
    .map((property) => {
      let score = 0;
      if (basis.intent && property.intent === basis.intent) score += 6;
      if (basis.types.includes(property.type)) score += 4;
      if (basis.city && property.city === basis.city) score += 2;
      if (basis.maxPrice !== null) score += property.price <= basis.maxPrice ? 1 : -1;
      return { property, score };
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.property.publishedAt.localeCompare(first.property.publishedAt) ||
        first.property.title.localeCompare(second.property.title, "fr"),
    )
    .slice(0, limit)
    .map(({ property }) => property);
}

/** Correspondances réelles entre le bien et les critères du client. */
export function recommendationReasons(
  property: Property,
  account: PublicAccount,
  searches: SavedSearch[],
): string[] {
  const basis = basisFrom(account, searches);
  const reasons: string[] = [];
  if (basis.intent && property.intent === basis.intent) {
    reasons.push(`Votre projet · ${INTENT_LABELS[basis.intent].toLowerCase()}`);
  }
  if (basis.types.includes(property.type)) {
    reasons.push(`Type recherché · ${TYPE_LABELS[property.type]}`);
  }
  if (basis.city && property.city === basis.city) {
    reasons.push(`Ville · ${property.city}`);
  }
  if (basis.maxPrice !== null && property.price <= basis.maxPrice) {
    reasons.push("Dans votre budget");
  }
  return reasons.slice(0, 3);
}

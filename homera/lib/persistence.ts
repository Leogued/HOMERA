import type { CatalogQuery } from "@/lib/properties";
import { buildCatalogParams, searchCatalog, summaryLabel } from "@/lib/properties";

/* ==================================================================
   HOMERA — MÉMOIRE LOCALE DU VISITEUR
   ------------------------------------------------------------------
   Phase 2 est consultable sans compte. Les favoris et les recherches
   enregistrées vivent donc dans le navigateur, et nulle part ailleurs :
   aucune donnée n’est envoyée au serveur, aucun cookie n’est posé.

   Ce fichier contient la partie *pure* (lisible sans navigateur, donc
   testable) et la partie stockage, tolérante aux environnements où
   localStorage n’existe pas (rendu serveur, navigation privée stricte).
   ================================================================== */

export const VISITOR_STORAGE_KEY = "homera.visiteur.v1";
export const MAX_SAVED_SEARCHES = 8;

export type SavedSearch = {
  /** Identifiant stable : le chemin + la requête, sans le paramètre de page. */
  id: string;
  /** Libellé lisible : « À louer · Villa · Cotonou », résumé par le moteur. */
  label: string;
  /** Adresse partageable, complète. */
  href: string;
  /** Nombre de biens au moment de l’enregistrement. */
  count: number;
  /** Date d’enregistrement (ISO, jour). */
  savedAt: string;
};

export type VisitorState = {
  favorites: string[];
  searches: SavedSearch[];
};

export const EMPTY_VISITOR_STATE: VisitorState = { favorites: [], searches: [] };

/* ------------------------------------------------------------------
   Parties pures
   ------------------------------------------------------------------ */

/** Un identifiant de recherche ignore la pagination et l’ordre des filtres. */
export function searchId(query: CatalogQuery, basePath: string): string {
  const params = buildCatalogParams({ ...query, page: 1 });
  params.sort();
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

/** Décrit une recherche enregistrée à partir de la requête courante. */
export function describeSearch(query: CatalogQuery, basePath: string): SavedSearch {
  const href = searchId(query, basePath);
  const label = summaryLabel({ ...query, page: 1 });
  return {
    id: href,
    label: label === "" ? "Tous les biens" : label,
    href,
    count: searchCatalog(query).length,
    savedAt: new Date().toISOString().slice(0, 10),
  };
}

/** Ajoute (ou remet en tête) une recherche, sans doublon ni dépassement. */
export function withSearch(state: VisitorState, search: SavedSearch): VisitorState {
  const searches = [search, ...state.searches.filter((entry) => entry.id !== search.id)].slice(
    0,
    MAX_SAVED_SEARCHES,
  );
  return { ...state, searches };
}

export function withoutSearch(state: VisitorState, id: string): VisitorState {
  return { ...state, searches: state.searches.filter((entry) => entry.id !== id) };
}

export function withFavorite(state: VisitorState, propertyId: string): VisitorState {
  if (state.favorites.includes(propertyId)) return state;
  return { ...state, favorites: [propertyId, ...state.favorites] };
}

export function withoutFavorite(state: VisitorState, propertyId: string): VisitorState {
  return { ...state, favorites: state.favorites.filter((entry) => entry !== propertyId) };
}

export function toggleFavorite(state: VisitorState, propertyId: string): VisitorState {
  return state.favorites.includes(propertyId)
    ? withoutFavorite(state, propertyId)
    : withFavorite(state, propertyId);
}

/** Relit un état stocké sans jamais faire confiance à sa forme. */
export function parseVisitorState(raw: unknown): VisitorState {
  if (typeof raw !== "object" || raw === null) return EMPTY_VISITOR_STATE;
  const candidate = raw as { favorites?: unknown; searches?: unknown };
  const favorites = Array.isArray(candidate.favorites)
    ? candidate.favorites.filter((entry): entry is string => typeof entry === "string")
    : [];
  const searches = Array.isArray(candidate.searches)
    ? candidate.searches
        .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
        .map((entry) => ({
          id: String(entry.id ?? ""),
          label: String(entry.label ?? "Recherche enregistrée"),
          href: String(entry.href ?? ""),
          count: Number(entry.count ?? 0),
          savedAt: String(entry.savedAt ?? ""),
        }))
        .filter((entry) => entry.id.length > 0 && entry.href.startsWith("/"))
        .slice(0, MAX_SAVED_SEARCHES)
    : [];
  return { favorites, searches };
}

/* ------------------------------------------------------------------
   Stockage — jamais bloquant, jamais fatal
   ------------------------------------------------------------------ */

export function readVisitorState(): VisitorState {
  if (typeof window === "undefined") return EMPTY_VISITOR_STATE;
  try {
    const raw = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!raw) return EMPTY_VISITOR_STATE;
    return parseVisitorState(JSON.parse(raw));
  } catch {
    // Navigation privée, quota, JSON abîmé : on repart d’un état vide.
    return EMPTY_VISITOR_STATE;
  }
}

export function writeVisitorState(state: VisitorState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(VISITOR_STORAGE_EVENT, { detail: state }));
  } catch {
    // Le stockage est un confort, pas une condition de fonctionnement.
  }
}

/** Événement local, pour que les onglets et les composants se répondent. */
export const VISITOR_STORAGE_EVENT = "homera:visiteur";

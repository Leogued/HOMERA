"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { EMPTY_CRITERIA, hasCriteria, matchesCriteria, type SearchCriteria } from "@/lib/format";
import { PROPERTIES, type Property } from "@/lib/content";
/* ==================================================================
   HOMERA — ÉTAT PARTAGÉ DU PARCOURS
   ------------------------------------------------------------------
   Le module de recherche du hero et la sélection de biens lisent le même
   état : choisir « Louer » puis appuyer sur Rechercher filtre réellement
   les biens présentés plus bas, sans rechargement.
   ================================================================== */
type SearchContextValue = {
  criteria: SearchCriteria;
  /** Critères réellement validés : les libellés correspondent aux résultats. */ appliedCriteria: SearchCriteria;
  setCriterion: (field: keyof SearchCriteria, value: string) => void;
  resetCriteria: () => void;
  /** Valide et applique la recherche en cours d’édition. */ submitSearch: () => void;
  /** Applique directement un jeu de critères complet (navigation, intentions). */ applySearch: (
    next: SearchCriteria,
  ) => void;
  /** Nombre de résultats pour les critères en cours d’édition. */ results: Property[];
  /** Résultats validés (après soumission) — ce que la page affiche. */ appliedResults: Property[];
  /** true dès qu’une recherche soumise est active. */ isSearching: boolean;
  /** Sélection affichée dans la grille des biens. */ visibleProperties: Property[];
};
const SearchContext = createContext<SearchContextValue | null>(null);
/**
 * Catalogue à explorer. La page d’accueil (composant serveur) transmet les
 * biens réellement publiés dans la base ; à défaut, le catalogue de
 * référence du dépôt est utilisé.
 */
export function SearchProvider({ children, source }: { children: ReactNode; source?: Property[] }) {
  const catalogue = source ?? PROPERTIES;
  const [criteria, setCriteria] = useState<SearchCriteria>(EMPTY_CRITERIA);
  const [applied, setApplied] = useState<SearchCriteria>(EMPTY_CRITERIA);
  const setCriterion = useCallback((field: keyof SearchCriteria, value: string) => {
    setCriteria((current) => ({ ...current, [field]: value }));
  }, []);
  const resetCriteria = useCallback(() => {
    setCriteria(EMPTY_CRITERIA);
    setApplied(EMPTY_CRITERIA);
  }, []);
  const submitSearch = useCallback(() => {
    setApplied(criteria);
  }, [criteria]);
  const applySearch = useCallback((next: SearchCriteria) => {
    // Une seule mise à jour par état : aucun risque de lire des critères périmés.
    setCriteria(next);
    setApplied(next);
  }, []);
  const results = useMemo(() => catalogue.filter((property) => matchesCriteria(property, criteria)), [criteria, catalogue]);
  const appliedResults = useMemo(
    () => (hasCriteria(applied) ? catalogue.filter((property) => matchesCriteria(property, applied)) : catalogue),
    [applied, catalogue],
  );
  /* Sans filtre rapide, la sélection montre tout le catalogue ; seule une
     recherche soumise la restreint. */
  const visibleProperties = useMemo(() => {
    if (hasCriteria(applied)) return appliedResults;
    return catalogue;
  }, [applied, appliedResults, catalogue]);
  const value = useMemo<SearchContextValue>(
    () => ({
      criteria,
      appliedCriteria: applied,
      setCriterion,
      resetCriteria,
      submitSearch,
      applySearch,
      results,
      appliedResults,
      isSearching: hasCriteria(applied),
      visibleProperties,
    }),
    [
      criteria,
      setCriterion,
      resetCriteria,
      submitSearch,
      applySearch,
      results,
      appliedResults,
      applied,
      visibleProperties,
    ],
  );
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch doit être utilisé dans <SearchProvider>");
  return context;
}

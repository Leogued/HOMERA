"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { EMPTY_CRITERIA, hasCriteria, matchesCriteria, type SearchCriteria } from "@/lib/format";
import { PROPERTIES, type Property, type PropertyFilterId } from "@/lib/content";
/* ================================================================== HOMERA — ÉTAT PARTAGÉ DU PARCOURS ------------------------------------------------------------------ Le module de recherche du hero et la sélection de biens lisent le même état : choisir « Louer » puis appuyer sur Rechercher filtre réellement les biens présentés plus bas, sans rechargement. ================================================================== */ type ActiveFilter =
  PropertyFilterId;
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
  activeFilter: ActiveFilter;
  setActiveFilter: (filter: ActiveFilter) => void;
  /** Sélection affichée dans la grille des biens. */ visibleProperties: Property[];
};
const SearchContext = createContext<SearchContextValue | null>(null);
export function SearchProvider({ children }: { children: ReactNode }) {
  const [criteria, setCriteria] = useState<SearchCriteria>(EMPTY_CRITERIA);
  const [applied, setApplied] = useState<SearchCriteria>(EMPTY_CRITERIA);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("tous");
  const setCriterion = useCallback((field: keyof SearchCriteria, value: string) => {
    setCriteria((current) => ({ ...current, [field]: value }));
  }, []);
  const resetCriteria = useCallback(() => {
    setCriteria(EMPTY_CRITERIA);
    setApplied(EMPTY_CRITERIA);
    setActiveFilter("tous");
  }, []);
  const submitSearch = useCallback(() => {
    setApplied(criteria);
  }, [criteria]);
  const applySearch = useCallback((next: SearchCriteria) => {
    // Une seule mise à jour par état : aucun risque de lire des critères périmés.
    setCriteria(next);
    setApplied(next);
  }, []);
  const results = useMemo(() => PROPERTIES.filter((property) => matchesCriteria(property, criteria)), [criteria]);
  const appliedResults = useMemo(
    () => (hasCriteria(applied) ? PROPERTIES.filter((property) => matchesCriteria(property, applied)) : PROPERTIES),
    [applied],
  );
  const visibleProperties = useMemo(() => {
    if (hasCriteria(applied)) return appliedResults;
    if (activeFilter === "tous") return PROPERTIES;
    return PROPERTIES.filter((property) => property.type === activeFilter);
  }, [applied, appliedResults, activeFilter]);
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
      activeFilter,
      setActiveFilter,
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
      activeFilter,
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

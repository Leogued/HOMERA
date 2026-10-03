"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  EMPTY_VISITOR_STATE,
  VISITOR_STORAGE_EVENT,
  VISITOR_STORAGE_KEY,
  describeSearch,
  readVisitorState,
  toggleFavorite as toggleFavoriteState,
  withSearch,
  withoutSearch,
  writeVisitorState,
  type SavedSearch,
  type VisitorState,
} from "@/lib/persistence";
import type { CatalogQuery } from "@/lib/properties";
/* ================================================================== HOMERA — CONTEXTE VISITEUR (favoris + recherches enregistrées) ------------------------------------------------------------------ L’état vient du navigateur, jamais du serveur : il n’est donc lu qu’après le montage. Avant cela, `ready` vaut false et les boutons s’affichent dans leur état neutre plutôt que dans un état inventé (pas de faux « déjà en favori », pas de faux compteur). ================================================================== */ type VisitorContextValue =
  {
    ready: boolean;
    state: VisitorState;
    favorites: string[];
    searches: SavedSearch[];
    isFavorite: (propertyId: string) => boolean;
    toggleFavorite: (propertyId: string) => void;
    saveSearch: (query: CatalogQuery, basePath: string) => SavedSearch;
    removeSearch: (id: string) => void;
    count: number;
  };
const VisitorContext = createContext<VisitorContextValue | null>(null);
export function VisitorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VisitorState>(EMPTY_VISITOR_STATE);
  const [ready, setReady] = useState(false);
  /* --- Lecture initiale, puis synchronisation entre onglets --- */ useEffect(() => {
// La mémoire du visiteur vit dans localStorage : elle ne peut être lue qu’après le montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readVisitorState());
    setReady(true);
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<VisitorState>).detail;
      if (detail) setState(detail);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== VISITOR_STORAGE_KEY) return;
      setState(readVisitorState());
    };
    window.addEventListener(VISITOR_STORAGE_EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(VISITOR_STORAGE_EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  /* --- Chaque modification est écrite immédiatement --- */ const commit = useCallback(
    (updater: (current: VisitorState) => VisitorState) => {
      setState((current) => {
        const next = updater(current);
        if (next !== current) writeVisitorState(next);
        return next;
      });
    },
    [],
  );
  const isFavorite = useCallback(
    (propertyId: string) => ready && state.favorites.includes(propertyId),
    [ready, state.favorites],
  );
  const toggleFavorite = useCallback(
    (propertyId: string) => commit((current) => toggleFavoriteState(current, propertyId)),
    [commit],
  );
  const saveSearch = useCallback(
    (query: CatalogQuery, basePath: string) => {
      const search = describeSearch(query, basePath);
      commit((current) => withSearch(current, search));
      return search;
    },
    [commit],
  );
  const removeSearch = useCallback((id: string) => commit((current) => withoutSearch(current, id)), [commit]);
  const value = useMemo<VisitorContextValue>(
    () => ({
      ready,
      state,
      favorites: state.favorites,
      searches: state.searches,
      isFavorite,
      toggleFavorite,
      saveSearch,
      removeSearch,
      count: state.favorites.length + state.searches.length,
    }),
    [ready, state, isFavorite, toggleFavorite, saveSearch, removeSearch],
  );
  return <VisitorContext.Provider value={value}>{children}</VisitorContext.Provider>;
}
export function useVisitor(): VisitorContextValue {
  const context = useContext(VisitorContext);
  if (context) return context; // Hors fournisseur (par exemple une carte isolée dans un test), on
  // reste inerte plutôt que de casser la page.
  return {
    ready: false,
    state: EMPTY_VISITOR_STATE,
    favorites: [],
    searches: [],
    isFavorite: () => false,
    toggleFavorite: () => {},
    saveSearch: (query, basePath) => describeSearch(query, basePath),
    removeSearch: () => {},
    count: 0,
  };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_QUERY, PER_PAGE, buildCatalogParams, catalogHref, isPristine, parseCatalogQuery,
  type CatalogFacets, type CatalogQuery,
} from "@/lib/properties";

/* ==================================================================
   HOMERA — RECHERCHE CATALOGUE, CÔTÉ SERVEUR
   ------------------------------------------------------------------
   Le filtrage, le tri, les compteurs et la pagination sont calculés en
   base : le navigateur ne télécharge que la page affichée. C’est ce qui
   permettra au catalogue de passer de trente-six biens à trente mille
   sans que l’écran ralentisse.

   L’adresse reste la source de vérité : chaque changement de critère
   réécrit l’URL, donc une recherche se copie, se partage, et se
   retrouve intacte en revenant en arrière.
   ================================================================== */

/** Les facettes suivent la même forme que le moteur local : une seule vérité. */
export type { CatalogFacets } from "@/lib/properties";

export type CatalogPage = {
  items: unknown[];
  total: number;
  page: number;
  pages: number;
  perPage: number;
};

export type CatalogState = {
  query: CatalogQuery;
  /** Résultats réellement affichés (toutes les pages déjà chargées). */
  items: unknown[];
  total: number;
  pages: number;
  page: number;
  facets: CatalogFacets | null;
  priceBounds: { min: number; max: number } | null;
  /** Premier chargement en cours : rien encore à afficher. */
  loading: boolean;
  /** Chargement d’une page supplémentaire : l’écran garde ce qu’il a. */
  loadingMore: boolean;
  error: string | null;
  patch: (next: Partial<CatalogQuery>) => void;
  reset: () => void;
  loadMore: () => void;
};

/** Construit l’URL d’appel à partir de la requête. */
function endpointFor(basePath: string, query: CatalogQuery, page: number, perPage: number): string {
  const params = buildCatalogParams(query);
  params.set("page", String(page));
  params.set("par-page", String(perPage));
  params.set("facettes", "1");
  return `/api/properties?${params.toString()}`;
}

export function useCatalog({
  basePath,
  initialQuery,
  initialPage,
  initialFacets,
  initialPriceBounds,
  perPage = PER_PAGE,
}: {
  basePath: string;
  initialQuery: CatalogQuery;
  initialPage?: CatalogPage;
  initialFacets?: CatalogFacets | null;
  initialPriceBounds?: { min: number; max: number } | null;
  perPage?: number;
}): CatalogState {
  const [query, setQuery] = useState<CatalogQuery>(initialQuery);
  const [loadedPages, setLoadedPages] = useState(() => (initialPage ? initialPage.page : 1));
  const [pagesData, setPagesData] = useState<Record<number, unknown[]>>(() => {
    const firstPage: Record<number, unknown[]> = {};
    if (initialPage && initialPage.items.length) firstPage[1] = initialPage.items;
    return firstPage;
  });
  const [meta, setMeta] = useState<{ total: number; pages: number }>({
    total: initialPage?.total ?? 0,
    pages: initialPage?.pages ?? 1,
  });
  const [facets, setFacets] = useState<CatalogFacets | null>(initialFacets ?? null);
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number } | null>(initialPriceBounds ?? null);
  const [loading, setLoading] = useState(!initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const first = useRef(true);
  const queryKey = buildCatalogParams(query).toString();

  /* Requête : on repart de la page 1 dès qu’un critère change. */
  useEffect(() => {
    let cancelled = false;
    const url = endpointFor(basePath, query, 1, perPage);
    if (!first.current) setLoading(true);
    const run = async () => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        const payload = (await response.json()) as {
          ok: boolean;
          message?: string;
          data?: { items?: unknown[]; total?: number; pages?: number; facets?: CatalogFacets; priceBounds?: { min: number; max: number } };
        };
        if (cancelled) return;
        if (!payload.ok || !payload.data) {
          setError(payload.message ?? "La recherche n’a pas abouti.");
          setLoading(false);
          return;
        }
        setPagesData({ 1: payload.data.items ?? [] });
        setLoadedPages(1);
        setMeta({ total: payload.data.total ?? 0, pages: Math.max(1, payload.data.pages ?? 1) });
        if (payload.data.facets) setFacets(payload.data.facets);
        if (payload.data.priceBounds) setPriceBounds(payload.data.priceBounds);
        setError(null);
      } catch {
        if (!cancelled) setError("La recherche n’a pas pu contacter le serveur.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    first.current = false;
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  /* Page supplémentaire : on ajoute, on ne remplace pas. */
  const loadMore = useCallback(() => {
    const next = loadedPages + 1;
    if (next > meta.pages || loadingMore) return;
    let cancelled = false;
    setLoadingMore(true);
    const run = async () => {
      try {
        const response = await fetch(endpointFor(basePath, query, next, perPage), { cache: "no-store" });
        const payload = (await response.json()) as { ok: boolean; data?: { items?: unknown[] } };
        if (cancelled) return;
        if (payload.ok && payload.data) {
          setPagesData((current) => ({ ...current, [next]: payload.data?.items ?? [] }));
          setLoadedPages(next);
        }
      } catch {
        /* l’écran garde les pages déjà chargées : aucune perte de contexte */
      } finally {
        if (!cancelled) setLoadingMore(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [basePath, loadedPages, loadingMore, meta.pages, perPage, query]);

  /* Adresse : miroir de la recherche, sans rechargement de page.
     `replaceState` évite d’empiler une entrée d’historique par frappe. */
  useEffect(() => {
    const href = catalogHref(query, basePath);
    const current = `${window.location.pathname}${window.location.search}`;
    if (href !== current) window.history.replaceState(null, "", href);
  }, [basePath, query]);

  /* Retour arrière : on relit l’adresse au lieu de réafficher l’état précédent. */
  useEffect(() => {
    const onPop = () => {
      setQuery(parseCatalogQuery(new URLSearchParams(window.location.search)));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const patch = useCallback((next: Partial<CatalogQuery>) => {
    setQuery((current) => ({ ...current, ...next, page: 1 }));
  }, []);
  const reset = useCallback(() => {
    setQuery((current) => ({ ...EMPTY_QUERY, sort: current.sort }));
  }, []);

  const items = useMemo(() => {
    const list: unknown[] = [];
    for (let index = 1; index <= loadedPages; index += 1) list.push(...(pagesData[index] ?? []));
    return list;
  }, [loadedPages, pagesData]);

  return {
    query,
    items,
    total: meta.total,
    pages: meta.pages,
    page: loadedPages,
    facets,
    priceBounds,
    loading,
    loadingMore,
    error,
    patch,
    reset,
    loadMore,
  };
}

export { isPristine };

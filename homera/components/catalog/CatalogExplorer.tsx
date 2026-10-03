"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { DEMO_DATA, PROPERTIES } from "@/lib/content";
import { countLabel } from "@/lib/format";
import {
  EMPTY_QUERY,
  PER_PAGE,
  SORTS,
  activeFilterCount,
  catalogHref,
  facets as buildFacets,
  isPristine,
  searchCatalog,
  summaryLabel,
  type CatalogQuery,
} from "@/lib/properties";
import { useInView } from "@/lib/motion";
import { PropertyCard } from "@/components/catalog/PropertyCard";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { AssetPlaceholder } from "@/components/catalog/AssetPlaceholder";
import { SaveSearchButton } from "@/components/catalog/SaveSearchButton";
import { TextRoll } from "@/components/ui/TextRoll";
/* ================================================================== HOMERA — EXPLORATEUR ------------------------------------------------------------------ La page de résultats du site : recherche, filtres, tri, grille de cartes, affichage progressif (scroll infini + bouton), adresse partageable. Principes tenus : • la page serveur rend déjà un premier écran de résultats — le visiteur sans JavaScript voit les biens, pas un squelette ; • chaque changement réécrit l’adresse (`replaceState`), donc une recherche se copie, se partage et se retrouve au retour ; • le tri et les filtres recalculent la même liste que le serveur : une seule source (`lib/properties`), aucun écart d’affichage. ================================================================== */ type Locked =
  "intent" | "types" | "stayNights";
export function CatalogExplorer({
  basePath = "/explorer",
  initialQuery,
  initialVisible = PER_PAGE,
  locked = [],
  emptyHint,
}: {
  basePath?: string;
  initialQuery: CatalogQuery;
  initialVisible?: number;
  locked?: Locked[];
  emptyHint?: string;
}) {
  const [query, setQuery] = useState<CatalogQuery>(initialQuery);
  const [visible, setVisible] = useState(Math.max(PER_PAGE, initialVisible));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [term, setTerm] = useState(initialQuery.q); // Les mises à jour de liste passent par une transition : pendant le
  // calcul, l’écran reste réactif et quelques squelettes annoncent la suite.
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const { ref: sentinelRef, inView: sentinelInView } = useInView<HTMLDivElement>({
    threshold: 0.01,
    rootMargin: "0px 0px 240px 0px",
    once: false,
  });
  const results = useMemo(() => searchCatalog(query), [query]); // Les compteurs se calculent sur le catalogue complet : chaque facette
  // ignore son propre filtre, sinon elle afficherait toujours zéro.
  const facetData = useMemo(() => buildFacets(PROPERTIES, { ...query, page: 1 }), [query]);
  const shown = results.slice(0, visible);
  const remaining = Math.max(0, results.length - shown.length);
  const filterCount = activeFilterCount(query);
  /* --- L’adresse suit l’état, sans recharger ni repasser par le serveur --- */ const syncUrl = useCallback(
    (next: CatalogQuery) => {
      if (typeof window === "undefined") return;
      window.history.replaceState(null, "", catalogHref(next, basePath));
    },
    [basePath],
  );
  const update = useCallback(
    (patch: Partial<CatalogQuery>) => {
      startTransition(() => {
        setQuery((current) => {
          const next = { ...current, ...patch, page: 1 };
          syncUrl(next);
          return next;
        });
        setVisible(PER_PAGE);
      });
    },
    [syncUrl],
  );
  const reset = useCallback(() => {
    startTransition(() => {
      const next: CatalogQuery = { ...EMPTY_QUERY, intent: locked.includes("intent") ? initialQuery.intent : "" };
      setQuery(next);
      setTerm("");
      setVisible(PER_PAGE);
      syncUrl(next);
    });
  }, [initialQuery.intent, locked, syncUrl]);
  const showMore = useCallback(() => {
    startTransition(() => {
      setQuery((current) => {
        const next = { ...current, page: Math.min(4, current.page + 1) };
        window.history.replaceState(null, "", catalogHref(next, basePath));
        return next;
      });
      setVisible((current) => current + PER_PAGE);
    });
  }, [basePath]);
  useEffect(() => {
    if (sentinelInView && remaining > 0) showMore(); // Un seul chargement par entrée dans le champ : le défilement suivant relance.
  }, [sentinelInView, remaining, showMore]);
  /* --- Tiroir de filtres (mobile) : dialogue natif, focus piégé, Échap --- */ useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (filtersOpen && !dialog.open) dialog.showModal();
    if (!filtersOpen && dialog.open) dialog.close();
  }, [filtersOpen]);
  const submitTerm = (event: React.FormEvent) => {
    event.preventDefault();
    update({ q: term.trim() });
  };
  const removeChip = (chip: Partial<CatalogQuery>) => update(chip);
  return (
    <div className="homera-explorer">
      {" "}
      {/* ---------------- Barre d’outils ---------------- */}{" "}
      <div className="sticky top-[4.25rem] z-40 -mx-4 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-card lg:border lg:bg-card lg:px-4 lg:backdrop-blur-none">
        {" "}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {" "}
          <form role="search" onSubmit={submitTerm} className="flex min-w-0 flex-1 items-center gap-2">
            {" "}
            <label htmlFor="homera-explorer-term" className="sr-only">
              Rechercher un bien
            </label>{" "}
            <div className="relative min-w-0 flex-1">
              {" "}
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />{" "}
              <input
                id="homera-explorer-term"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Quartier, type de bien, référence…"
                className="h-11 w-full rounded-input border border-border bg-card pl-10 pr-3 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-light focus:border-homera-terracotta/60"
              />{" "}
            </div>{" "}
            <button
              type="submit"
              className="homera-press h-11 shrink-0 rounded-input homera-cta px-4 text-note font-medium text-white transition-colors "
            >
              {" "}
              <TextRoll>Rechercher</TextRoll>{" "}
            </button>{" "}
          </form>{" "}
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            {" "}
            <label className="flex items-center gap-2 text-note text-muted">
              {" "}
              <span className="shrink-0">Trier</span>{" "}
              <select
                value={query.sort}
                onChange={(event) => update({ sort: event.target.value as CatalogQuery["sort"] })}
                className="h-11 rounded-input border border-border bg-card px-2.5 text-body-sm font-medium text-foreground outline-none transition-colors focus:border-homera-terracotta/60"
              >
                {" "}
                {SORTS.map((sort) => (
                  <option key={sort.id} value={sort.id}>
                    {sort.label}
                  </option>
                ))}{" "}
              </select>{" "}
            </label>{" "}
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="homera-press inline-flex h-11 items-center gap-2 rounded-input border border-border bg-card px-3.5 text-note font-medium text-foreground lg:hidden"
              aria-haspopup="dialog"
            >
              {" "}
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filtres{" "}
              {filterCount > 0 && (
                <span className="homera-num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-homera-terracotta px-1.5 text-micro font-semibold text-white">
                  {" "}
                  {filterCount}{" "}
                </span>
              )}{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[19rem_1fr]">
        {" "}
        {/* ---------------- Filtres (desktop) ---------------- */}{" "}
        <aside className="hidden lg:block">
          {" "}
          <div className="sticky top-24 max-h-[calc(100svh-8rem)] overflow-y-auto pr-2 homera-noscrollbar">
            {" "}
            <CatalogFilters query={query} facets={facetData} onChange={update} onReset={reset} hidden={locked} />{" "}
          </div>{" "}
        </aside>{" "}
        {/* ---------------- Résultats ---------------- */}{" "}
        <section aria-label="Biens correspondants">
          {" "}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {" "}
            <p role="status" aria-live="polite" className="text-body-sm text-foreground">
              {" "}
              <span className="homera-num font-semibold">{countLabel(results.length)}</span>{" "}
              {!isPristine(query) && <span className="text-muted"> · {summaryLabel(query)}</span>}{" "}
            </p>{" "}
            <p className="text-caption text-muted">
              {" "}
              {shown.length < results.length
                ? `${shown.length} affichés sur ${results.length}`
                : `Tous les résultats affichés`}{" "}
            </p>{" "}
          </div>{" "}
          {/* Filtres actifs — chacun se retire d’un clic */}{" "}
          {filterCount > 0 && (
            <ul className="mt-4 flex flex-wrap items-center gap-2">
              {" "}
              {query.q && (
                <Chip
                  label={`« ${query.q} »`}
                  onRemove={() => {
                    setTerm("");
                    removeChip({ q: "" });
                  }}
                />
              )}{" "}
              {query.types.map((type) => (
                <Chip
                  key={type}
                  label={summaryLabel({ ...EMPTY_QUERY, types: [type] })}
                  onRemove={() => removeChip({ types: query.types.filter((entry) => entry !== type) })}
                />
              ))}{" "}
              {query.cities.map((city) => (
                <Chip
                  key={city}
                  label={city}
                  onRemove={() => removeChip({ cities: query.cities.filter((entry) => entry !== city) })}
                />
              ))}{" "}
              {query.districts.map((district) => (
                <Chip
                  key={district}
                  label={district}
                  onRemove={() => removeChip({ districts: query.districts.filter((entry) => entry !== district) })}
                />
              ))}{" "}
              {query.features.map((feature) => (
                <Chip
                  key={feature}
                  label={summaryLabel({ ...EMPTY_QUERY, features: [feature] })}
                  onRemove={() => removeChip({ features: query.features.filter((entry) => entry !== feature) })}
                />
              ))}{" "}
              {query.landTitles.map((title) => (
                <Chip
                  key={title}
                  label={summaryLabel({ ...EMPTY_QUERY, landTitles: [title] })}
                  onRemove={() => removeChip({ landTitles: query.landTitles.filter((entry) => entry !== title) })}
                />
              ))}{" "}
              {query.bedroomsMin !== null && (
                <Chip
                  label={`${query.bedroomsMin} chambres et plus`}
                  onRemove={() => removeChip({ bedroomsMin: null })}
                />
              )}{" "}
              {query.surfaceMin !== null && (
                <Chip label={`≥ ${query.surfaceMin} m²`} onRemove={() => removeChip({ surfaceMin: null })} />
              )}{" "}
              {query.surfaceMax !== null && (
                <Chip label={`≤ ${query.surfaceMax} m²`} onRemove={() => removeChip({ surfaceMax: null })} />
              )}{" "}
              {query.priceMin !== null && (
                <Chip label={`≥ ${query.priceMin} FCFA`} onRemove={() => removeChip({ priceMin: null })} />
              )}{" "}
              {query.priceMax !== null && (
                <Chip label={`≤ ${query.priceMax} FCFA`} onRemove={() => removeChip({ priceMax: null })} />
              )}{" "}
              {query.stayNights !== null && (
                <Chip
                  label={`séjour de ${query.stayNights} nuit${query.stayNights > 1 ? "s" : ""}`}
                  onRemove={() => removeChip({ stayNights: null })}
                />
              )}{" "}
              {query.recentOnly && <Chip label="nouveautés" onRemove={() => removeChip({ recentOnly: false })} />}{" "}
              <li className="list-none">
                {" "}
                <button
                  type="button"
                  onClick={reset}
                  className="homera-underline inline-flex min-h-9 items-center gap-1.5 text-caption font-medium homera-accent-ink"
                >
                  {" "}
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Tout effacer{" "}
                </button>{" "}
              </li>{" "}
            </ul>
          )}{" "}
          <div className="mt-4">
            {" "}
            <SaveSearchButton query={query} basePath={basePath} resultCount={results.length} />{" "}
          </div>{" "}
          {results.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-4 rounded-card border border-dashed border-border bg-card/60 px-6 py-16 text-center">
              {" "}
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-homera-terracotta/10 text-homera-terracotta">
                {" "}
                <Search className="h-5 w-5" aria-hidden="true" />{" "}
              </span>{" "}
              <h2 className="font-serif text-display-xs text-foreground">Aucun bien ne correspond à ces critères</h2>{" "}
              <p className="max-w-md text-body-sm leading-relaxed text-muted">
                {" "}
                {emptyHint ??
                  "Élargissez la recherche : retirez un filtre, changez de commune ou parcourez l’ensemble des biens vérifiés."}{" "}
              </p>{" "}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {" "}
                <button
                  type="button"
                  onClick={reset}
                  className="homera-press inline-flex h-11 items-center gap-2 rounded-btn homera-cta px-5 text-note font-medium text-white "
                >
                  {" "}
                  Réinitialiser les filtres{" "}
                </button>{" "}
                <Link
                  href="/explorer"
                  className="homera-underline inline-flex h-11 items-center gap-2 text-note font-medium homera-accent-ink"
                >
                  {" "}
                  Voir tous les biens <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
                </Link>{" "}
              </div>{" "}
            </div>
          ) : (
            <>
              {" "}
              <ul
                className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
                aria-busy={pending && remaining > 0}
              >
                {" "}
                {shown.map((property) => (
                  <li key={property.id} className="h-full">
                    {" "}
                    <PropertyCard property={property} layout="grid" />{" "}
                  </li>
                ))}{" "}
                {pending && remaining > 0
                  ? Array.from({ length: Math.min(PER_PAGE, remaining) }, (_, index) => (
                      <li key={`squelette-${index}`} className="h-full">
                        {" "}
                        <AssetPlaceholder />{" "}
                      </li>
                    ))
                  : null}{" "}
              </ul>{" "}
              {/* Affichage progressif — bouton réel, chargement au défilement */}{" "}
              <div ref={sentinelRef} className="mt-10 flex flex-col items-center gap-3">
                {" "}
                {remaining > 0 ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={showMore}
                      className="homera-press inline-flex h-12 items-center gap-2 rounded-btn border border-border bg-card px-6 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
                    >
                      {" "}
                      Afficher {Math.min(remaining, PER_PAGE)} bien{Math.min(remaining, PER_PAGE) > 1 ? "s" : ""} de
                      plus{" "}
                      <span className="homera-num text-caption text-muted">
                        ({shown.length}/{results.length})
                      </span>{" "}
                    </button>{" "}
                    <p className="text-caption text-muted"> Les biens suivants se chargent aussi en défilant. </p>{" "}
                  </>
                ) : (
                  results.length > PER_PAGE && (
                    <p className="text-caption text-muted">
                      {" "}
                      Vous avez parcouru les {results.length} biens de cette recherche.{" "}
                    </p>
                  )
                )}{" "}
              </div>{" "}
            </>
          )}{" "}
          {DEMO_DATA && (
            <p className="mt-10 text-center text-micro leading-relaxed text-muted">
              {" "}
              Sélection de démonstration du système pilote HOMERA · biens et visuels illustratifs, non commercialisés.{" "}
            </p>
          )}{" "}
        </section>{" "}
      </div>{" "}
      {/* ---------------- Filtres (mobile) ---------------- */}{" "}
      <dialog
        ref={dialogRef}
        onClose={() => setFiltersOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setFiltersOpen(false);
        }}
        className="homera-filter-dialog homera-noscrollbar m-0 max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-[var(--overlay)]"
      >
        {" "}
        <div className="ml-auto flex h-svh w-full max-w-md flex-col bg-background text-foreground shadow-2xl">
          {" "}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            {" "}
            <h2 className="font-serif text-display-xs">Filtrer les biens</h2>{" "}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground"
              aria-label="Fermer les filtres"
            >
              {" "}
              <X className="h-4 w-4" aria-hidden="true" />{" "}
            </button>{" "}
          </div>{" "}
          <div className="homera-noscrollbar flex-1 overflow-y-auto px-5 py-5">
            {" "}
            <CatalogFilters query={query} facets={facetData} onChange={update} onReset={reset} hidden={locked} />{" "}
          </div>{" "}
          <div className="border-t border-border px-5 py-4">
            {" "}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="homera-press inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn homera-cta text-body-sm font-medium text-white "
            >
              {" "}
              Voir {countLabel(results.length)} <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </dialog>{" "}
    </div>
  );
}
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li className="list-none">
      {" "}
      <button
        type="button"
        onClick={onRemove}
        className="homera-press inline-flex min-h-9 items-center gap-2 rounded-full border border-homera-terracotta/30 bg-homera-terracotta/[0.08] px-3 text-caption font-medium text-foreground"
      >
        {" "}
        {label} <X className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />{" "}
        <span className="sr-only">Retirer ce filtre</span>{" "}
      </button>{" "}
    </li>
  );
}

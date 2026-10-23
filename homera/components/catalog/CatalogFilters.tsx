"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  BedDouble, BedSingle, Building, Building2, ChevronDown, Coins, House, LandPlot,
  MapPin, RotateCcw, Search, Settings2, SlidersHorizontal, Store, Tag,
  type LucideIcon,
} from "lucide-react";
import { FEATURE_LABELS, TYPE_LABELS } from "@/lib/format";
import { TYPES_BY_INTENT } from "@/lib/properties";
import type { PropertyFeature, PropertyType } from "@/lib/content";
import type { CatalogQuery } from "@/lib/properties";
import type { CatalogFacets } from "@/lib/use-catalog";
import { TextRoll } from "@/components/ui/TextRoll";

/* ==================================================================
   HOMERA — FILTRES DE L’EXPLORATEUR
   ------------------------------------------------------------------
   Quatre critères, comme sur la maquette : le type de bien (pastilles
   à icônes), la ville (liste unique), le budget (minimum et maximum)
   et un équipement (liste unique). Le bouton « Appliquer » valide un
   brouillon : tant qu’on n’a pas appliqué, l’adresse et les résultats
   ne bougent pas ; « Réinitialiser » repart de zéro.

   L’intention (acheter, louer, séjourner) se choisit dans la barre de
   l’explorateur, pas ici. Les critères avancés (quartiers, chambres,
   surface…) restent compris dans l’adresse et l’API : un lien profond
   qui en contient continue de fonctionner, mais le panneau ne les
   propose plus.
   ================================================================== */

const TYPE_ICONS: Record<PropertyType, LucideIcon> = {
  villa: House,
  appartement: Building2,
  studio: BedDouble,
  chambre: BedSingle,
  immeuble: Building,
  terrain: LandPlot,
  boutique: Store,
};

type Patch = Partial<CatalogQuery>;
export type HiddenFilter = "intent" | "types" | "stayNights";

export function CatalogFilters({
  query,
  facets,
  priceBounds,
  onChange,
  onReset,
  hidden = [],
}: {
  query: CatalogQuery;
  facets: CatalogFacets | null;
  priceBounds?: { min: number; max: number } | null;
  onChange: (patch: Patch) => void;
  onReset: () => void;
  /** Critères fixés par la page : une page catégorie ne se dédit pas. */
  hidden?: HiddenFilter[];
}) {
  const panelId = useId();
  /* Brouillon : l’adresse (source de vérité) n’est réécrite qu’en
     appliquant. Si elle change ailleurs (recherche textuelle, tri,
     retrait d’un filtre actif), le brouillon repart de la valeur
     appliquée pour ne jamais contredire l’écran. */
  const [draft, setDraft] = useState<CatalogQuery>(query);
  const appliedRef = useRef<CatalogQuery>(query);
  useEffect(() => {
    if (JSON.stringify(query) !== JSON.stringify(appliedRef.current)) {
      appliedRef.current = query;
      setDraft(query);
    }
  }, [query]);

  const toggle = <T extends string>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

  const sameList = (first: string[], second: string[]) =>
    first.length === second.length && [...first].sort().join("|") === [...second].sort().join("|");
  const dirty =
    !sameList(draft.types, query.types) ||
    !sameList(draft.cities, query.cities) ||
    draft.priceMin !== query.priceMin ||
    draft.priceMax !== query.priceMax ||
    !sameList(draft.features, query.features);

  const apply = () => {
    appliedRef.current = draft;
    onChange(draft);
  };
  const reset = () => {
    onReset();
  };

  const typeValues = query.intent ? TYPES_BY_INTENT[query.intent] : (Object.keys(TYPE_LABELS) as PropertyType[]);
  const countOf = (list: { value: string; count: number }[] | undefined, value: string) =>
    list?.find((entry) => entry.value === value)?.count ?? 0;
  const budgetUnit = query.intent === "louer" ? "/ mois" : query.intent === "sejour" ? "/ nuit" : "";

  const cityOptions = facets?.cities.map((entry) => entry.value) ?? [];
  if (draft.cities[0] && !cityOptions.includes(draft.cities[0])) cityOptions.unshift(draft.cities[0]);
  const featureOptions = facets?.features.map((entry) => entry.value) ?? [];
  if (draft.features[0] && !featureOptions.includes(draft.features[0])) featureOptions.unshift(draft.features[0]);

  return (
    <section aria-labelledby={`${panelId}-titre`} className="rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id={`${panelId}-titre`} className="flex items-center gap-2 text-body-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />Filtres
        </h2>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-caption font-semibold text-muted transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Réinitialiser
        </button>
      </div>

      <div className="space-y-6 p-5">
        {!hidden.includes("types") && (
          <Group label="Type de bien" icon={Tag}>
            <div className="flex flex-wrap gap-2">
              {typeValues.map((type) => {
                const active = draft.types.includes(type);
                const Icon = TYPE_ICONS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDraft((current) => ({ ...current, types: toggle(current.types, type) }))}
                    className={chipClass(active)}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {TYPE_LABELS[type]}
                    <Count value={countOf(facets?.types, type)} />
                  </button>
                );
              })}
            </div>
          </Group>
        )}

        <Group label="Localisation" icon={MapPin}>
          <label htmlFor={`${panelId}-ville`} className="sr-only">Ville</label>
          <span className="relative block">
            <select
              id={`${panelId}-ville`}
              value={draft.cities[0] ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, cities: event.target.value ? [event.target.value] : [] }))}
              className="min-h-11 w-full appearance-none rounded-xl border border-border bg-background px-3.5 pr-10 text-body-sm text-foreground outline-none transition-colors focus:border-homera-terracotta/60"
            >
              <option value="">Toutes les villes</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          </span>
        </Group>

        <Group label={budgetUnit ? `Prix (FCFA ${budgetUnit})` : "Prix (FCFA)"} icon={Coins}>
          <div className="flex items-center gap-2">
            <NumberField
              label="Minimum"
              value={draft.priceMin}
              placeholder={priceBounds ? String(priceBounds.min) : "Min"}
              onChange={(value) => setDraft((current) => ({ ...current, priceMin: value }))}
            />
            <span aria-hidden="true" className="shrink-0 text-body-sm text-muted">−</span>
            <NumberField
              label="Maximum"
              value={draft.priceMax}
              placeholder={priceBounds ? String(priceBounds.max) : "Max"}
              onChange={(value) => setDraft((current) => ({ ...current, priceMax: value }))}
            />
          </div>
        </Group>

        <Group label="Équipements" icon={Settings2}>
          <label htmlFor={`${panelId}-equipement`} className="sr-only">Équipement</label>
          <span className="relative block">
            <select
              id={`${panelId}-equipement`}
              value={draft.features[0] ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, features: event.target.value ? [event.target.value as PropertyFeature] : [] }))}
              className="min-h-11 w-full appearance-none rounded-xl border border-border bg-background px-3.5 pr-10 text-body-sm text-foreground outline-none transition-colors focus:border-homera-terracotta/60"
            >
              <option value="">Tous les équipements</option>
              {featureOptions.map((feature) => (
                <option key={feature} value={feature}>{FEATURE_LABELS[feature as PropertyFeature] ?? feature}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          </span>
        </Group>

        <button
          type="button"
          onClick={apply}
          disabled={!dirty}
          className="homera-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-btn homera-cta px-4 text-note font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Search className="h-4 w-4" aria-hidden="true" />Appliquer les filtres
        </button>
      </div>
    </section>
  );
}

/* ==================================================================
   BRIQUES
   ================================================================== */

function chipClass(active: boolean): string {
  return `inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-caption font-semibold transition-colors ${active ? "border-homera-terracotta bg-homera-terracotta/[0.10] text-homera-terracotta" : "border-border bg-background text-muted hover:text-foreground"}`;
}

function Count({ value }: { value?: number }) {
  if (value === undefined) return null;
  return (
    <span className="homera-num rounded-full bg-surface-hover px-1.5 py-0.5 text-micro text-muted">
      <TextRoll>{String(value)}</TextRoll>
    </span>
  );
}

function Group({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
      </p>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | null;
  placeholder?: string;
  onChange: (value: number | null) => void;
}) {
  const id = useId();
  return (
    <span className="min-w-0 flex-1">
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value === null ? "" : String(value)}
        placeholder={placeholder}
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d]/g, "");
          onChange(digits ? Number(digits) : null);
        }}
        className="min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-body-sm"
      />
    </span>
  );
}

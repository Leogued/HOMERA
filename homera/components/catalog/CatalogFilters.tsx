"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  BedDouble, BedSingle, Building, Building2, ChevronDown, Coins, House, LandPlot,
  MapPin, PartyPopper, RotateCcw, Search, Settings2, SlidersHorizontal, Store, Tag, Warehouse,
  type LucideIcon,
} from "lucide-react";
import { FEATURE_LABELS, TYPE_LABELS } from "@/lib/format";
import { TYPES_BY_INTENT } from "@/lib/properties";
import type { PropertyFeature, PropertyType } from "@/lib/content";
import type { CatalogQuery } from "@/lib/properties";
import type { CatalogFacets } from "@/lib/use-catalog";

/* ==================================================================
   HOMERA — FILTRES DE L’EXPLORATEUR
   ------------------------------------------------------------------
   Quatre critères : le type de bien et les équipements (menus
   déroulants à cases à cocher, choix multiples), la ville (liste
   unique) et le budget (minimum et maximum)
   et les équipements (menu déroulant à cases à cocher, choix
   multiples). Le bouton
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
  salle: PartyPopper,
  espace: Warehouse,
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
  const typeOptions: PropertyType[] = [...typeValues];
  for (const kept of [...draft.types].reverse()) {
    if (!typeOptions.includes(kept)) typeOptions.unshift(kept);
  }
  const budgetUnit = query.intent === "louer" ? "/ mois" : query.intent === "sejour" ? "/ nuit" : "";

  const cityOptions = facets?.cities.map((entry) => entry.value) ?? [];
  if (draft.cities[0] && !cityOptions.includes(draft.cities[0])) cityOptions.unshift(draft.cities[0]);
  const featureOptions = facets?.features.map((entry) => entry.value) ?? [];
  for (const kept of [...draft.features].reverse()) {
    if (kept && !featureOptions.includes(kept)) featureOptions.unshift(kept);
  }

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
            <MultiDrop
              id={`${panelId}-types`}
              options={typeOptions}
              values={draft.types}
              labels={TYPE_LABELS}
              icons={TYPE_ICONS}
              allLabel="Tous les types"
              unitOne="type choisi"
              unitMany="types choisis"
              onToggle={(type) => setDraft((current) => ({ ...current, types: toggle(current.types, type) }))}
            />
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
          {featureOptions.length === 0 ? (
            <p className="text-caption text-muted">Aucun équipement proposé pour cette recherche.</p>
          ) : (
            <MultiDrop
              id={`${panelId}-equipements`}
              options={featureOptions as PropertyFeature[]}
              values={draft.features}
              labels={FEATURE_LABELS}
              allLabel="Tous les équipements"
              unitOne="équipement choisi"
              unitMany="équipements choisis"
              onToggle={(feature) => setDraft((current) => ({ ...current, features: toggle(current.features, feature) }))}
            />
          )}
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

function MultiDrop<T extends string>({
  id,
  options,
  values,
  labels,
  icons,
  allLabel,
  unitOne,
  unitMany,
  onToggle,
}: {
  id: string;
  options: T[];
  values: T[];
  labels: Record<string, string>;
  icons?: Record<string, LucideIcon>;
  allLabel: string;
  unitOne: string;
  unitMany: string;
  onToggle: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  /* Fermeture au clic hors menu et à Échap, comme tout menu. */
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);
  const summary =
    values.length === 0 ? allLabel : values.length === 1 ? `1 ${unitOne}` : `${values.length} ${unitMany}`;
  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3.5 text-body-sm text-foreground outline-none transition-colors focus:border-homera-terracotta/60"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" aria-labelledby={id} className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-card)]">
          {options.map((option) => {
            const checked = values.includes(option);
            const Icon = icons?.[option];
            return (
              <label
                key={option}
                role="option"
                aria-selected={checked}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm transition-colors ${checked ? "bg-homera-terracotta/[0.08] font-medium text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(option)}
                  className="h-4 w-4 shrink-0 accent-homera-terracotta"
                />
                {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                {labels[option] ?? option}
              </label>
            );
          })}
        </div>
      )}
    </div>
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

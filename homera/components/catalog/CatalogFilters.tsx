"use client";

import { useId, useState } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { FEATURE_LABELS, INTENT_LABELS, LAND_TITLE_LABELS, TYPE_LABELS } from "@/lib/format";
import { TYPES_BY_INTENT } from "@/lib/properties";
import type { LandTitle, PropertyFeature, PropertyIntent, PropertyType } from "@/lib/content";
import type { CatalogQuery } from "@/lib/properties";
import type { CatalogFacets } from "@/lib/use-catalog";
import { TextRoll } from "@/components/ui/TextRoll";

/* ==================================================================
   HOMERA — FILTRES DE L’EXPLORATEUR
   ------------------------------------------------------------------
   Deux niveaux, parce que tout mettre au même plan noie l’essentiel :

   • les critères principaux — ce que l’on cherche, où, quel type,
     quel budget, et si c’est disponible ;
   • les critères complémentaires — chambres, salles de bain, surface,
     meublé, équipements, durée du séjour.

   Les critères s’adaptent au contexte : on ne propose pas de durée de
   séjour sur un achat, ni un studio à vendre quand on cherche une
   villa, ni les quartiers d’Abomey-Calavi tant qu’on n’a pas retenu
   cette ville. Chaque compteur est calculé en base **sans** le filtre
   qu’il représente, sinon il afficherait toujours zéro.
   ================================================================== */

const BEDROOM_STEPS = [1, 2, 3, 4, 5];
const BATHROOM_STEPS = [1, 2, 3];
const SURFACE_STEPS = [30, 60, 100, 150, 250];
const STAY_STEPS: { value: number; label: string }[] = [
  { value: 1, label: "1 nuit" },
  { value: 2, label: "2 nuits" },
  { value: 3, label: "3 nuits" },
  { value: 7, label: "1 semaine" },
  { value: 14, label: "2 semaines" },
];
const LAND_TITLES: LandTitle[] = ["titre-foncier", "acd", "en-cours"];

type Patch = Partial<CatalogQuery>;
export type HiddenFilter = "intent" | "types" | "stayNights";

export function CatalogFilters({
  query,
  facets,
  priceBounds,
  onChange,
  onReset,
  hidden = [],
  intentLocked = false,
}: {
  query: CatalogQuery;
  facets: CatalogFacets | null;
  priceBounds?: { min: number; max: number } | null;
  onChange: (patch: Patch) => void;
  onReset: () => void;
  /** Critères fixés par la page : une page projet ne se dédit pas. */
  hidden?: HiddenFilter[];
  /** Projet imposé par la page mais encore changeable (page projet). */
  intentLocked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const toggle = <T extends string>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

  const setIntent = (intent: PropertyIntent | "") =>
    // Changer de projet remet à zéro les critères qui n’ont plus de sens :
    // un studio ne se vend pas ici, une durée ne concerne que le séjour.
    onChange({
      intent,
      types: [],
      features: [],
      stayNights: intent === "sejour" ? query.stayNights : null,
      bedroomsMin: null,
      bathroomsMin: null,
      roomsMin: null,
      priceMin: null,
      priceMax: null,
    });

  const typeValues = query.intent ? TYPES_BY_INTENT[query.intent] : (Object.keys(TYPE_LABELS) as PropertyType[]);
  const cityNames = facets?.cities.map((entry) => entry.value) ?? [];
  const districtNames = facets?.districts.map((entry) => entry.value) ?? [];
  const countOf = (list: { value: string; count: number }[] | undefined, value: string) =>
    list?.find((entry) => entry.value === value)?.count ?? 0;
  const budgetUnit = query.intent === "louer" ? "/ mois" : query.intent === "sejour" ? "/ nuit" : "";
  const complementaryCount =
    (query.bedroomsMin ? 1 : 0) +
    (query.bathroomsMin ? 1 : 0) +
    (query.surfaceMin ? 1 : 0) +
    (query.surfaceMax ? 1 : 0) +
    (query.roomsMin ? 1 : 0) +
    (query.furnishedOnly ? 1 : 0) +
    (query.features.length ? 1 : 0) +
    (query.stayNights ? 1 : 0);

  return (
    <section aria-labelledby={`${panelId}-titre`} className="rounded-card border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={`${panelId}-titre`} className="text-note font-semibold">Filtres</h2>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-caption font-semibold text-muted transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Réinitialiser
        </button>
      </div>

      {/* ---------- Niveau 1 : l’essentiel ---------- */}
      <div className="space-y-6 p-4">
        {!hidden.includes("intent") && (
          <Group label="Votre projet">
            <div className="flex flex-wrap gap-2">
              {facets?.intents.map((entry) => {
                const value = entry.value as PropertyIntent;
                const active = query.intent === value || (intentLocked && query.intent === value);
                return (
                  <button
                    key={entry.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setIntent(active ? "" : value)}
                    className={chipClass(active)}
                  >
                    {INTENT_LABELS[value] ?? entry.value}
                    <Count value={entry.count} />
                  </button>
                );
              })}
            </div>
          </Group>
        )}

        <Group label="Localisation">
          <div className="flex flex-wrap gap-2">
            {cityNames.length === 0 && <p className="text-caption text-muted">Aucune commune dans ce périmètre.</p>}
            {cityNames.map((city) => {
              const active = query.cities.includes(city);
              return (
                <button
                  key={city}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onChange({
                      cities: toggle(query.cities, city),
                      // On abandonne les quartiers qui n’appartiennent plus à la ville retenue.
                      districts: query.districts.filter((entry) => entry !== city),
                    })
                  }
                  className={chipClass(active)}
                >
                  {city}
                  <Count value={countOf(facets?.cities, city)} />
                </button>
              );
            })}
          </div>
          {districtNames.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-micro font-semibold uppercase tracking-[0.13em] text-muted">Quartiers</p>
              <div className="flex flex-wrap gap-2">
                {districtNames.map((district) => {
                  const active = query.districts.includes(district);
                  return (
                    <button
                      key={district}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ districts: toggle(query.districts, district) })}
                      className={chipClass(active, true)}
                    >
                      {district}
                      <Count value={countOf(facets?.districts, district)} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Group>

        {!hidden.includes("types") && (
          <Group label="Type de bien">
            <div className="flex flex-wrap gap-2">
              {typeValues.map((type) => {
                const active = query.types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange({ types: toggle(query.types, type) })}
                    className={chipClass(active)}
                  >
                    {TYPE_LABELS[type]}
                    <Count value={countOf(facets?.types, type)} />
                  </button>
                );
              })}
            </div>
          </Group>
        )}

        <Group label={`Budget${budgetUnit ? ` (FCFA ${budgetUnit})` : " (FCFA)"}`}>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Minimum"
              value={query.priceMin}
              placeholder={priceBounds?.min ? String(priceBounds.min) : "0"}
              onChange={(value) => onChange({ priceMin: value })}
            />
            <NumberField
              label="Maximum"
              value={query.priceMax}
              placeholder={priceBounds?.max ? String(priceBounds.max) : "—"}
              onChange={(value) => onChange({ priceMax: value })}
            />
          </div>
          {priceBounds && priceBounds.min !== priceBounds.max && (
            <p className="mt-2 text-micro text-muted">
              Fourchette observée dans ce périmètre : {priceBounds.min.toLocaleString("fr-FR")} – {priceBounds.max.toLocaleString("fr-FR")} FCFA
            </p>
          )}
        </Group>

        <Group label="Confiance et disponibilité">
          <div className="space-y-2">
            <Toggle
              checked={query.verifiedOnly}
              onChange={(value) => onChange({ verifiedOnly: value })}
              label="Biens vérifiés HOMERA uniquement"
              count={facets?.verified}
            />
            <Toggle
              checked={query.availableOnly}
              onChange={(value) => onChange({ availableOnly: value })}
              label="Disponibles immédiatement"
              count={facets?.available}
            />
            <Toggle
              checked={query.recentOnly}
              onChange={(value) => onChange({ recentOnly: value })}
              label="Nouveautés (15 derniers jours)"
            />
          </div>
        </Group>
      </div>

      {/* ---------- Niveau 2 : le détail ---------- */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-note font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
            Critères complémentaires
            {complementaryCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-homera-terracotta px-1.5 text-micro font-bold text-white">
                {complementaryCount}
              </span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>

        {open && (
          <div id={panelId} className="space-y-6 border-t border-border p-4">
            <Group label="Chambres">
              <Stepper
                values={BEDROOM_STEPS}
                active={query.bedroomsMin}
                onPick={(value) => onChange({ bedroomsMin: query.bedroomsMin === value ? null : value })}
                suffix="+"
              />
            </Group>

            <Group label="Salles de bain">
              <Stepper
                values={BATHROOM_STEPS}
                active={query.bathroomsMin}
                onPick={(value) => onChange({ bathroomsMin: query.bathroomsMin === value ? null : value })}
                suffix="+"
              />
            </Group>

            <Group label="Surface (m²)">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Minimum" value={query.surfaceMin} placeholder="0" onChange={(value) => onChange({ surfaceMin: value })} />
                <NumberField label="Maximum" value={query.surfaceMax} placeholder="—" onChange={(value) => onChange({ surfaceMax: value })} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {SURFACE_STEPS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={query.surfaceMin === value}
                    onClick={() => onChange({ surfaceMin: query.surfaceMin === value ? null : value })}
                    className={chipClass(query.surfaceMin === value, true)}
                  >
                    dès {value} m²
                  </button>
                ))}
              </div>
            </Group>

            <Group label="Confort">
              <Toggle
                checked={query.furnishedOnly}
                onChange={(value) => onChange({ furnishedOnly: value })}
                label="Logement meublé"
                count={facets?.furnished}
              />
              <div className="mt-3">
                <p className="mb-2 text-micro font-semibold uppercase tracking-[0.13em] text-muted">Équipements</p>
                <div className="flex flex-wrap gap-2">
                  {(facets?.features ?? [])
                    .filter((entry) => entry.value !== "meuble")
                    .map((entry) => {
                      const feature = entry.value as PropertyFeature;
                      const active = query.features.includes(feature);
                      return (
                        <button
                          key={entry.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => onChange({ features: toggle(query.features, feature) })}
                          className={chipClass(active, true)}
                        >
                          {FEATURE_LABELS[feature] ?? entry.value}
                          <Count value={entry.count} />
                        </button>
                      );
                    })}
                  {(facets?.features ?? []).length === 0 && (
                    <p className="text-caption text-muted">Aucun équipement supplémentaire dans ce périmètre.</p>
                  )}
                </div>
              </div>
            </Group>

            {!hidden.includes("stayNights") && (query.intent === "sejour" || query.intent === "") && (
              <Group label="Durée du séjour">
                <div className="flex flex-wrap gap-2">
                  {STAY_STEPS.map((entry) => {
                    const active = query.stayNights === entry.value;
                    return (
                      <button
                        key={entry.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange({ stayNights: active ? null : entry.value })}
                        className={chipClass(active, true)}
                      >
                        {entry.label}
                      </button>
                    );
                  })}
                </div>
              </Group>
            )}

            {hidden.includes("intent") && (
              <Group label="Titre foncier">
                <div className="flex flex-wrap gap-2">
                  {LAND_TITLES.map((title) => {
                    const active = query.landTitles.includes(title);
                    return (
                      <button
                        key={title}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange({ landTitles: toggle(query.landTitles, title) })}
                        className={chipClass(active, true)}
                      >
                        {LAND_TITLE_LABELS[title]}
                        <Count value={countOf(facets?.landTitles, title)} />
                      </button>
                    );
                  })}
                </div>
              </Group>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ==================================================================
   BRIQUES
   ================================================================== */

function chipClass(active: boolean, small = false): string {
  const base = `inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors ${small ? "min-h-8 px-2.5 text-micro" : "min-h-9 px-3 text-caption"}`;
  return `${base} ${active ? "border-homera-terracotta bg-homera-terracotta/[0.08] text-homera-terracotta" : "border-border bg-background text-muted hover:text-foreground"}`;
}

function Count({ value }: { value?: number }) {
  if (value === undefined) return null;
  return (
    <span className="homera-num rounded-full bg-surface-hover px-1.5 py-0.5 text-micro text-muted">
      <TextRoll>{String(value)}</TextRoll>
    </span>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</p>
      {children}
    </div>
  );
}

function Stepper({ values, active, onPick, suffix = "" }: { values: number[]; active: number | null; onPick: (value: number) => void; suffix?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={active === value}
          onClick={() => onPick(value)}
          className={chipClass(active === value, true)}
        >
          {value}{suffix}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, count }: { checked: boolean; onChange: (value: boolean) => void; label: string; count?: number }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-caption">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-border text-homera-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-homera-terracotta"
      />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="homera-num text-micro text-muted">{count}</span>}
    </label>
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
    <div>
      <label htmlFor={id} className="mb-1 block text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</label>
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
        className="min-h-10 w-full rounded-xl border border-border bg-background px-3 text-note"
      />
    </div>
  );
}

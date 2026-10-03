"use client";
import { useId, useState } from "react";
import { RotateCcw } from "lucide-react";
import { FEATURE_LABELS, INTENT_LABELS, LAND_TITLE_LABELS, TYPE_LABELS } from "@/lib/format";
import type { LandTitle, PropertyFeature, PropertyIntent, PropertyType } from "@/lib/content";
import type { CatalogFacets, CatalogQuery } from "@/lib/properties";
import { TextRoll } from "@/components/ui/TextRoll";
/* ================================================================== HOMERA — FILTRES DE L’EXPLORATEUR ------------------------------------------------------------------ Tous les critères vivent dans la requête (`CatalogQuery`) : cocher une case met à jour la liste ET l’adresse, donc une recherche se partage et se retrouve telle quelle au retour. Chaque compteur vient des facettes : il est calculé sans le filtre qu’il représente, sinon il afficherait toujours zéro. ================================================================== */ const BEDROOM_STEPS =
  [1, 2, 3, 4, 5];
const STAY_STEPS: { value: number; label: string }[] = [
  { value: 1, label: "1 nuit" },
  { value: 2, label: "2 nuits" },
  { value: 3, label: "3 nuits" },
  { value: 7, label: "1 semaine" },
  { value: 14, label: "2 semaines" },
];
const LAND_TITLES: LandTitle[] = ["titre-foncier", "acd", "en-cours"];
type Patch = Partial<CatalogQuery>;
export function CatalogFilters({
  query,
  facets,
  onChange,
  onReset,
  hidden = [],
}: {
  query: CatalogQuery;
  facets: CatalogFacets;
  onChange: (patch: Patch) => void;
  onReset: () => void;
  /** Critères fixés par la page (une page catégorie ne se dédit pas). */ hidden?: (
    | "intent"
    | "types"
    | "stayNights"
  )[];
}) {
  const toggle = <T extends string>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
  const setIntent = (
    intent: PropertyIntent | "", // Changer de projet remet à zéro les filtres qui n’ont plus de sens
  ) =>
    // (un studio ne se vend pas ici, une durée de séjour ne concerne que le séjour).
    onChange({
      intent,
      types: [],
      features: [],
      stayNights: intent === "sejour" ? query.stayNights : null,
      bedroomsMin: null,
      roomsMin: null,
      priceMin: null,
      priceMax: null,
    });
  return (
    <div className="space-y-8">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <h2 className="text-label uppercase text-muted">Filtres</h2>{" "}
        <button
          type="button"
          onClick={onReset}
          className="homera-underline inline-flex items-center gap-1.5 text-caption font-medium homera-accent-ink"
        >
          {" "}
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Tout effacer{" "}
        </button>{" "}
      </div>{" "}
      {/* ---------------- Projet ---------------- */}{" "}
      {!hidden.includes("intent") && (
        <fieldset>
          {" "}
          <legend className="mb-3 text-note font-semibold text-foreground">Projet</legend>{" "}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choisir un projet">
            {" "}
            <button
              type="button"
              onClick={() => setIntent("")}
              aria-pressed={query.intent === ""}
              className={`homera-press rounded-full px-3.5 py-2 text-note font-medium transition-colors ${query.intent === "" ? "homera-cta text-white " : "border border-border bg-card text-muted hover:text-foreground"}`}
            >
              {" "}
              Tous les projets <span className="homera-num ml-2 text-caption opacity-70">
                {facets.allIntents}
              </span>{" "}
            </button>{" "}
            {facets.intents.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setIntent(entry.value)}
                aria-pressed={query.intent === entry.value}
                className={`homera-press rounded-full px-3.5 py-2 text-note font-medium transition-colors ${query.intent === entry.value ? "homera-cta text-white " : "border border-border bg-card text-muted hover:text-foreground"}`}
              >
                {" "}
                {INTENT_LABELS[entry.value]}{" "}
                <span className="homera-num ml-2 text-caption opacity-70">{entry.count}</span>{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </fieldset>
      )}{" "}
      {/* ---------------- Catégorie ---------------- */}{" "}
      {!hidden.includes("types") && (
        <fieldset>
          {" "}
          <legend className="mb-3 text-note font-semibold text-foreground">Type de bien</legend>{" "}
          <ul className="space-y-1.5">
            {" "}
            {facets.types.map((entry) => (
              <li key={entry.value}>
                {" "}
                <CheckLine
                  checked={query.types.includes(entry.value)}
                  disabled={entry.count === 0 && !query.types.includes(entry.value)}
                  onChange={() => onChange({ types: toggle(query.types, entry.value) })}
                  label={TYPE_LABELS[entry.value as PropertyType]}
                  count={entry.count}
                />{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </fieldset>
      )}{" "}
      {/* ---------------- Disponibilité & vérification ---------------- */}{" "}
      <fieldset>
        <legend className="mb-3 text-note font-semibold text-foreground">Disponibilité</legend>{" "}
        <CheckLine
          checked={query.availableOnly}
          onChange={() => onChange({ availableOnly: !query.availableOnly })}
          label="Disponibles uniquement"
          count={facets.available}
        />
        <p className="ml-8 mt-1 text-caption leading-relaxed text-muted">Un bien déclaré indisponible reste visible, avec son statut clairement indiqué.</p>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-note font-semibold text-foreground">Statut de vérification</legend>{" "}
        <CheckLine
          checked={query.verifiedOnly}
          onChange={() => onChange({ verifiedOnly: !query.verifiedOnly })}
          label="Vérifié HOMERA uniquement"
          count={facets.verified}
        />
        <p className="ml-8 mt-1 text-caption leading-relaxed text-muted">Le catalogue public ne présente que des biens publiés; le statut est daté sur chaque fiche.</p>
      </fieldset>
      {/* ---------------- Localisation ---------------- */}{" "}
      <fieldset>
        {" "}
        <legend className="mb-3 text-note font-semibold text-foreground">Localisation</legend>{" "}
        <ul className="space-y-1.5">
          {" "}
          {facets.cities.map((entry) => (
            <li key={entry.value}>
              {" "}
              <CheckLine
                checked={query.cities.includes(entry.value)}
                disabled={entry.count === 0 && !query.cities.includes(entry.value)}
                onChange={() => onChange({ cities: toggle(query.cities, entry.value), districts: [] })}
                label={entry.value}
                count={entry.count}
              />{" "}
            </li>
          ))}{" "}
        </ul>{" "}
        {facets.districts.length > 1 && (
          <details className="mt-3 rounded-2xl border border-border bg-card/60 px-3 py-2">
            {" "}
            <summary className="cursor-pointer text-caption font-medium text-muted">
              {" "}
              Quartiers ({facets.districts.length}){" "}
            </summary>{" "}
            <ul className="mt-2 space-y-1.5">
              {" "}
              {facets.districts.map((entry) => (
                <li key={entry.value}>
                  {" "}
                  <CheckLine
                    checked={query.districts.includes(entry.value)}
                    disabled={entry.count === 0 && !query.districts.includes(entry.value)}
                    onChange={() => onChange({ districts: toggle(query.districts, entry.value) })}
                    label={entry.value}
                    count={entry.count}
                  />{" "}
                </li>
              ))}{" "}
            </ul>{" "}
          </details>
        )}{" "}
      </fieldset>{" "}
      {/* ---------------- Budget ---------------- */}{" "}
      <fieldset>
        {" "}
        <legend className="mb-3 text-note font-semibold text-foreground">
          {" "}
          {query.intent === "louer" || query.intent === "sejour" ? "Loyer ou nuitée (FCFA)" : "Budget (FCFA)"}{" "}
        </legend>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <NumberField
            label="Minimum"
            value={query.priceMin}
            onCommit={(value) => onChange({ priceMin: value })}
          />{" "}
          <span aria-hidden="true" className="text-muted">
            —
          </span>{" "}
          <NumberField label="Maximum" value={query.priceMax} onCommit={(value) => onChange({ priceMax: value })} />{" "}
        </div>{" "}
      </fieldset>{" "}
      {/* ---------------- Chambres et pièces ---------------- */}{" "}
      <fieldset>
        {" "}
        <legend className="mb-3 text-note font-semibold text-foreground">Chambres minimum</legend>{" "}
        <div className="flex flex-wrap gap-2">
          {" "}
          <StepButton active={query.bedroomsMin === null} onClick={() => onChange({ bedroomsMin: null })}>
            {" "}
            Indifférent{" "}
          </StepButton>{" "}
          {BEDROOM_STEPS.map((step) => (
            <StepButton
              key={step}
              active={query.bedroomsMin === step}
              onClick={() => onChange({ bedroomsMin: step })}
            >
              {" "}
              {step}+{" "}
            </StepButton>
          ))}{" "}
        </div>{" "}
      </fieldset>{" "}
      {/* ---------------- Surface ---------------- */}{" "}
      <fieldset>
        {" "}
        <legend className="mb-3 text-note font-semibold text-foreground">Surface (m²)</legend>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <NumberField
            label="Minimum"
            value={query.surfaceMin}
            onCommit={(value) => onChange({ surfaceMin: value })}
          />{" "}
          <span aria-hidden="true" className="text-muted">
            —
          </span>{" "}
          <NumberField
            label="Maximum"
            value={query.surfaceMax}
            onCommit={(value) => onChange({ surfaceMax: value })}
          />{" "}
        </div>{" "}
      </fieldset>{" "}
      {/* ---------------- Durée du séjour ---------------- */}{" "}
      {query.intent === "sejour" && !hidden.includes("stayNights") && (
        <fieldset>
          {" "}
          <legend className="mb-3 text-note font-semibold text-foreground">Durée souhaitée</legend>{" "}
          <div className="flex flex-wrap gap-2">
            {" "}
            <StepButton active={query.stayNights === null} onClick={() => onChange({ stayNights: null })}>
              {" "}
              Toutes durées{" "}
            </StepButton>{" "}
            {STAY_STEPS.map((step) => (
              <StepButton
                key={step.value}
                active={query.stayNights === step.value}
                onClick={() => onChange({ stayNights: step.value })}
              >
                {" "}
                {step.label}{" "}
              </StepButton>
            ))}{" "}
          </div>{" "}
          <p className="mt-2 text-caption text-muted">
            {" "}
            Seuls les logements qui acceptent cette durée sont affichés.{" "}
          </p>{" "}
        </fieldset>
      )}{" "}
      {/* ---------------- Équipements ---------------- */}{" "}
      {facets.features.length > 0 && (
        <fieldset>
          {" "}
          <legend className="mb-3 text-note font-semibold text-foreground">Équipements</legend>{" "}
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
            {" "}
            {facets.features.map((entry) => (
              <li key={entry.value}>
                {" "}
                <CheckLine
                  checked={query.features.includes(entry.value)}
                  disabled={entry.count === 0 && !query.features.includes(entry.value)}
                  onChange={() => onChange({ features: toggle(query.features, entry.value as PropertyFeature) })}
                  label={FEATURE_LABELS[entry.value as PropertyFeature]}
                  count={entry.count}
                />{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </fieldset>
      )}{" "}
      {/* ---------------- Foncier ---------------- */}{" "}
      <fieldset>
        {" "}
        <legend className="mb-3 text-note font-semibold text-foreground">Situation foncière</legend>{" "}
        <ul className="space-y-1.5">
          {" "}
          {LAND_TITLES.map((title) => (
            <li key={title}>
              {" "}
              <CheckLine
                checked={query.landTitles.includes(title)}
                onChange={() => onChange({ landTitles: toggle(query.landTitles, title) })}
                label={LAND_TITLE_LABELS[title]}
              />{" "}
            </li>
          ))}{" "}
        </ul>{" "}
      </fieldset>{" "}
      {/* ---------------- Nouveautés ---------------- */}{" "}
      <fieldset>
        {" "}
        <legend className="mb-3 text-note font-semibold text-foreground">Fraîcheur</legend>{" "}
        <CheckLine
          checked={query.recentOnly}
          onChange={() => onChange({ recentOnly: !query.recentOnly })}
          label="Nouveautés (deux dernières semaines)"
        />{" "}
      </fieldset>{" "}
      <button
        type="button"
        onClick={onReset}
        className="homera-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-btn border border-border bg-card text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
      >
        {" "}
        <RotateCcw className="h-4 w-4" aria-hidden="true" /> <TextRoll>Réinitialiser les filtres</TextRoll>{" "}
      </button>{" "}
    </div>
  );
}
/* ------------------------------------------------------------------ Briques de formulaire ------------------------------------------------------------------ */ function CheckLine({
  label,
  checked,
  onChange,
  count,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-body-sm transition-colors ${disabled ? "cursor-not-allowed text-muted-light" : "cursor-pointer text-foreground hover:bg-surface-hover"}`}
    >
      {" "}
      <span className="flex items-center gap-2.5">
        {" "}
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="h-4 w-4 shrink-0 rounded border-border accent-homera-terracotta"
        />{" "}
        <span>{label}</span>{" "}
      </span>{" "}
      {count !== undefined && <span className="homera-num text-caption text-muted">{count}</span>}{" "}
    </label>
  );
}
function StepButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`homera-press rounded-full px-3 py-1.5 text-caption font-medium transition-colors ${active ? "homera-cta text-white " : "border border-border bg-card text-muted hover:text-foreground"}`}
    >
      {" "}
      {children}{" "}
    </button>
  );
} /** Champ numérique : la valeur n’est appliquée qu’à la validation (Entrée ou sortie du champ). */
function NumberField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number | null;
  onCommit: (value: number | null) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value === null ? "" : String(value));
  const [lastValue, setLastValue] = useState(value);
  // Resynchronisation pendant le rendu : quand la requête change ailleurs
  // (chip retirée, réinitialisation), le champ suit sans effet ni clignotement.
  if (lastValue !== value) {
    setLastValue(value);
    setText(value === null ? "" : String(value));
  }
  const commit = () => {
    const digits = text.replace(/[^\d]/g, "");
    const next = digits ? Number(digits) : null;
    if (next !== value) onCommit(next);
    else setText(value === null ? "" : String(value));
  };
  return (
    <div className="min-w-0 flex-1">
      {" "}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>{" "}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={text}
        placeholder={label}
        onChange={(event) => setText(event.target.value.replace(/[^\d]/g, ""))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        className="homera-num h-10 w-full rounded-input border border-border bg-card px-3 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-light focus:border-homera-terracotta/60"
      />{" "}
    </div>
  );
}

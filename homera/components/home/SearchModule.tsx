"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ChevronDown, RotateCcw, Search, X } from "lucide-react";
import {
  BUDGET_OPTIONS,
  SEARCH_FIELD_LABELS,
  SEARCH_SELECTS,
  type SearchFieldName,
  type SelectOption,
} from "@/lib/content";
import { countLabel } from "@/lib/format";
import { fitDropdown, restoreFieldFocus } from "@/lib/floating";
import { useMounted } from "@/lib/motion";
import { useSearch } from "@/components/providers/SearchProvider";

/* ==================================================================
   HOMERA — MODULE DE RECHERCHE
   ------------------------------------------------------------------
   Concept conservé à l’identique : Projet · Localisation · Type de
   bien · Montant · Recherche, dans une seule ligne premium.

   Ce qui est ajouté :
   • tous les champs partagent hauteur, rayons, états et retours ;
   • la sélection d’une valeur ne déplace jamais la mise en page
     (hauteurs fixes, aucune largeur dépendante du contenu) ;
   • le panneau déroulant s’ouvre avec une translation de quelques
     pixels, sans scrollbar visible, navigable au clavier ;
   • le montant proposé s’adapte au projet (budget d’achat ≠ loyer) ;
   • un pied de panneau annonce le nombre de résultats avant de valider.
   ================================================================== */

type PanelPosition = { top: number; left: number; width: number; maxHeight: number };

const PANEL_MAX_HEIGHT = 304;

export function SearchModule({ className = "" }: { className?: string }) {
  const { criteria, setCriterion, resetCriteria, submitSearch, results, isSearching } =
    useSearch();

  const mounted = useMounted();
  const [openField, setOpenField] = useState<SearchFieldName | null>(null);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  const anchorRef = useRef<HTMLElement | null>(null);
  const restoringFocus = useRef(false);
  const pulseTimer = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const optionsFor = useCallback(
    (field: SearchFieldName): SelectOption[] => {
      if (field === "budget") {
        return criteria.project === "acheter"
          ? BUDGET_OPTIONS.achat
          : BUDGET_OPTIONS.periodique;
      }
      return [...SEARCH_SELECTS[field]];
    },
    [criteria.project],
  );

  const closePanel = useCallback((restoreFocus = false) => {
    setOpenField(null);
    if (restoreFocus) restoreFieldFocus(anchorRef.current, restoringFocus);
  }, []);

  const openFor = useCallback(
    (field: SearchFieldName, anchor: HTMLElement, focusFirst = false) => {
      const rect = anchor.getBoundingClientRect();
      const available = optionsFor(field).length;
      const desired = Math.min(PANEL_MAX_HEIGHT, available * 46 + 78);
      const viewport = window.visualViewport;
      anchorRef.current = anchor;
      setPosition(fitDropdown(rect, {
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
        top: viewport?.offsetTop ?? 0,
        left: viewport?.offsetLeft ?? 0,
      }, desired));
      const selectedIndex = optionsFor(field).findIndex(
        (option) => option.value === criteria[field as keyof typeof criteria],
      );
      setActiveIndex(selectedIndex > 0 ? selectedIndex : 0);
      setOpenField(field);

      if (focusFirst) {
        requestAnimationFrame(() =>
          panelRef.current?.querySelectorAll<HTMLElement>("[role=option]")[Math.max(0, selectedIndex)]?.focus(),
        );
      }
    },
    [criteria, optionsFor],
  );

  /* --- Fermeture : clic extérieur, Échap, changement de viewport --- */
  useEffect(() => {
    if (!openField) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !panelRef.current?.contains(target) &&
        !anchorRef.current?.contains(target)
      ) {
        setOpenField(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closePanel(true);
      }
    };
    const onViewportChange = (event: Event) => {
      // Le scroll du panneau lui-même est une interaction, pas une sortie.
      if (event.type === "scroll" && event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      setOpenField(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    window.visualViewport?.addEventListener("resize", onViewportChange);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
    };
  }, [openField, closePanel]);

  useEffect(() => () => { if (pulseTimer.current) window.clearTimeout(pulseTimer.current); }, []);

  const choose = (field: SearchFieldName, option: SelectOption) => {
    setCriterion(field, option.value);
    closePanel(true);
    setPulse(true);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(false), 620);
  };

  const submit = () => {
    submitSearch();
    closePanel();
    const target = document.getElementById("biens");
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    window.history.pushState(null, "", "#biens");
  };

  const options = openField ? optionsFor(openField) : [];
  const activeValue = openField ? criteria[openField as keyof typeof criteria] : "";
  const anyValue = Boolean(
    criteria.project || criteria.location || criteria.propertyType || criteria.budget,
  );

  /* --- Un champ : même hauteur, mêmes rayons, même logique partout --- */
  const renderField = (
    field: SearchFieldName,
    { variant }: { variant: "pill" | "stack" },
  ) => {
    const isOpen = openField === field;
    const value = criteria[field as keyof typeof criteria];
    const selected = optionsFor(field).find((option) => option.value === value);
    const label = SEARCH_FIELD_LABELS[field];

    if (field === "budget") {
      return (
        <div
          key={field}
          className={
            variant === "pill"
              ? "relative flex h-12 min-w-0 flex-1 items-center"
              : "relative w-full"
          }
        >
          <input
            type="text"
            inputMode="numeric"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? "homera-search-panel" : undefined}
            aria-autocomplete="none"
            aria-label={label}
            placeholder={variant === "pill" ? label : "Votre budget"}
            value={criteria.budget}
            onChange={(event) => {
              const digits = event.target.value.replace(/[^\d]/g, "").slice(0, 12);
              setCriterion(
                "budget",
                digits ? new Intl.NumberFormat("fr-FR").format(Number(digits)) : "",
              );
            }}
            onFocus={(event) => { if (!restoringFocus.current) openFor(field, event.currentTarget); }}
            onClick={(event) => { if (!isOpen) openFor(field, event.currentTarget); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                openFor(field, event.currentTarget, true);
              }
              if (event.key === "Enter") {
                event.preventDefault();
                if (openField) closePanel();
                submit();
              }
            }}
            className={
              variant === "pill"
                ? "h-12 w-full min-w-0 rounded-full bg-transparent py-3 pl-3 pr-8 text-center text-body-sm font-medium text-foreground outline-none transition-[background-color,color] duration-300 placeholder:text-muted hover:bg-surface-hover focus:bg-surface-hover dark:text-homera-cream dark:placeholder:text-muted-light dark:hover:bg-white/5 dark:focus:bg-white/5"
                : "h-12 w-full rounded-input border border-border bg-background/70 px-4 pr-10 text-left text-body-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted focus:border-homera-terracotta/50"
            }
          />
          <ChevronDown
            aria-hidden="true"
            className={`pointer-events-none absolute ${
              variant === "pill" ? "right-2.5" : "right-3.5"
            } h-3.5 w-3.5 text-muted-light transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      );
    }

    return (
      <div
        key={field}
        className={variant === "pill" ? "relative flex h-12 min-w-0 flex-1 items-center" : "relative w-full"}
      >
        <button
          type="button"
          role="combobox"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? "homera-search-panel" : undefined}
          onClick={(event) =>
            isOpen ? closePanel() : openFor(field, event.currentTarget)
          }
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              openFor(field, event.currentTarget, true);
            }
          }}
          className={
            variant === "pill"
              ? `group/field relative flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full px-3 text-center text-body-sm font-medium outline-none transition-[background-color,color,box-shadow] duration-300 hover:bg-surface-hover focus:bg-surface-hover dark:hover:bg-white/5 dark:focus:bg-white/5 ${
                  isOpen ? "bg-surface-hover shadow-[inset_0_0_0_1px_rgba(198,93,59,0.35)] dark:bg-white/5" : ""
                } ${
                  selected
                    ? "text-foreground dark:text-homera-cream"
                    : "text-muted dark:text-muted-light"
                }`
              : `flex h-12 w-full items-center justify-between gap-3 rounded-input border px-4 text-left text-body-sm font-medium outline-none transition-colors ${
                  selected
                    ? "border-border bg-background/70 text-foreground"
                    : "border-border bg-background/70 text-muted"
                } ${isOpen ? "border-homera-terracotta/60" : ""}`
          }
        >
          <span className="truncate">{selected?.label ?? label}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 shrink-0 text-muted-light transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {/* ---------------- Desktop / tablette : la ligne premium ---------------- */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        role="search"
        aria-label="Recherche de biens HOMERA"
        className="mx-auto hidden h-17 w-full max-w-4xl items-center gap-1 rounded-full border border-white/25 bg-card/97 p-2 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur-md transition-[box-shadow,transform] duration-500 ease-standard data-[open=true]:scale-[1.006] data-[open=true]:shadow-[0_36px_90px_-42px_rgba(0,0,0,0.95)] md:flex dark:border-white/12 dark:bg-card/97"
        data-open={openField ? "true" : undefined}
      >
        <div className="flex h-12 min-w-0 flex-1 items-center">
          {renderField("project", { variant: "pill" })}
          <Separator />
          {renderField("location", { variant: "pill" })}
          <Separator />
          {renderField("propertyType", { variant: "pill" })}
          <Separator />
          {renderField("budget", { variant: "pill" })}

          {/* Emplacement réservé au bouton d’effacement : aucun décalage de mise en page */}
          <span className="ml-1 flex h-11 w-9 shrink-0 items-center justify-center">
            <button
              type="button"
              onClick={resetCriteria}
              aria-label="Effacer la recherche"
              title="Effacer"
              tabIndex={anyValue ? 0 : -1}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-muted transition-[opacity,transform] duration-300 hover:bg-surface-hover hover:text-homera-terracotta dark:hover:bg-white/10 ${
                anyValue
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-90 opacity-0"
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>

          <button
            type="submit"
            aria-label="Rechercher"
            title="Rechercher"
            className={`homera-press homera-sheen relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-homera-brown-dark text-white transition-colors duration-300 hover:bg-homera-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-terracotta focus-visible:ring-offset-2 dark:bg-homera-terracotta dark:hover:bg-homera-terracotta-light ${
              pulse ? "scale-[0.96]" : "scale-100"
            }`}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      {/* ---------------- Mobile : carte verticale adaptée au pouce ---------------- */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        role="search"
        aria-label="Recherche de biens HOMERA"
        className="mx-auto w-full max-w-md space-y-2.5 rounded-2xl border border-white/20 bg-card/97 p-3.5 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur-md md:hidden dark:border-white/12 dark:bg-card/97"
      >
        <div className="grid grid-cols-1 gap-2.5">
          {renderField("project", { variant: "stack" })}
          {renderField("location", { variant: "stack" })}
          {renderField("propertyType", { variant: "stack" })}
          {renderField("budget", { variant: "stack" })}
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="submit"
            className="homera-press homera-sheen flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-homera-brown-dark text-body-sm font-medium text-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-terracotta focus-visible:ring-offset-2 dark:bg-homera-terracotta"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Rechercher
          </button>
          {anyValue && (
            <button
              type="button"
              onClick={resetCriteria}
              aria-label="Effacer la recherche"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border text-muted transition-colors hover:text-homera-terracotta"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      {/* ---------------- Résumé de recherche active ---------------- */}
      {isSearching && (
        <div className="mx-auto mt-4 flex w-full max-w-4xl flex-col items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-left backdrop-blur-md sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="homera-pulse-ring absolute inset-0 rounded-full bg-homera-amber/70" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-homera-amber" />
            </span>
            <p className="text-note text-homera-cream">
              {results.length === 0 ? (
                <>
                  Aucun bien ne correspond encore à votre recherche — élargissez les critères.
                </>
              ) : (
                <>
                  <span className="font-medium text-white">
                    {countLabel(results.length)}
                  </span>{" "}
                  correspond{results.length > 1 ? "ent" : ""} à votre recherche
                  {criteria.location ? ` à ${criteria.location}` : ""}.
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => document.getElementById("biens")?.scrollIntoView({ behavior: "smooth" })}
              className="homera-press inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-note font-medium text-white transition-colors hover:bg-white/16"
            >
              Voir la sélection
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={resetCriteria}
              className="homera-underline text-note text-homera-cream-dark transition-colors hover:text-white"
            >
              Effacer
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Panneau déroulant (portail, jamais rogné) ---------------- */}
      {mounted &&
        openField &&
        position &&
        createPortal(
          <div
            id="homera-search-panel"
            ref={panelRef}
            role="listbox"
            aria-label={SEARCH_FIELD_LABELS[openField]}
            className="homera-dropdown-menu homera-dropdown-enter homera-noscrollbar fixed z-[80] flex flex-col overflow-y-auto overscroll-contain rounded-menu border border-border bg-card p-1.5 text-foreground shadow-[0_30px_70px_-30px_rgba(28,17,11,0.6)] dark:border-white/10 dark:text-white"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            onKeyDown={(event) => {
              const items = Array.from(
                panelRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? [],
              );
              const index = items.indexOf(event.target as HTMLButtonElement);
              if (event.key === "ArrowDown") {
                event.preventDefault();
                items[(index + 1) % items.length]?.focus();
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                items[(index - 1 + items.length) % items.length]?.focus();
              } else if (event.key === "Home") {
                event.preventDefault();
                items[0]?.focus();
              } else if (event.key === "End") {
                event.preventDefault();
                items[items.length - 1]?.focus();
              }
            }}
          >
            {options.map((option, index) => {
              const selected = activeValue === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  data-roving-item
                  onFocus={() => setActiveIndex(index)}
                  aria-selected={selected}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={() => choose(openField, option)}
                  className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left text-body-sm leading-snug transition-colors duration-200 focus:outline-none ${
                    selected
                      ? "homera-accent-ink bg-homera-terracotta/12 font-semibold"
                      : "hover:bg-surface-hover focus:bg-surface-hover dark:hover:bg-white/8 dark:focus:bg-white/8"
                  }`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.hint && (
                      <span className="truncate text-caption font-normal text-muted dark:text-muted-light">
                        {option.hint}
                      </span>
                    )}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}

            {/* Pied de panneau : le nombre de résultats, avant même de valider */}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-border px-3 pt-2 pb-1 text-caption text-muted dark:border-white/10 dark:text-muted-light">
              <span>{countLabel(results.length)} correspondant aux critères</span>
              <button
                type="button"
                onClick={submit}
                className="homera-underline font-medium text-homera-terracotta"
              >
                Rechercher
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Separator() {
  return (
    <span
      aria-hidden="true"
      className="h-7 w-px shrink-0 bg-homera-cream-dark dark:bg-white/10"
    />
  );
}

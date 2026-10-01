"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  Bed,
  CalendarCheck,
  Eye,
  MapPin,
  Maximize,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { PROPERTIES, PROPERTY_FILTERS, type Property } from "@/lib/content";
import { countLabel, formatFCFA, INTENT_LABELS, TYPE_LABELS } from "@/lib/format";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { Button } from "@/components/ui/Button";
import { onAnimationFrame, useMotionPreferences } from "@/lib/motion";
import { useSearch } from "@/components/providers/SearchProvider";

/* ==================================================================
   HOMERA — DES BIENS QUI MÉRITENT D’ÊTRE VUS
   ------------------------------------------------------------------
   Le carrousel devient tactile, utilisable à la souris, au clavier et
   au doigt, avec un vrai rythme : chaque carte est un objet
   photographique, l’information secondaire ne se révèle qu’au survol,
   et le défilement reste toujours sous contrôle manuel.

   La sélection répond au module de recherche du hero : les critères
   choisis plus haut filtrent réellement cette liste.
   ================================================================== */

export function FeaturedProperties() {
  const { visibleProperties, appliedResults, isSearching, criteria, activeFilter, setActiveFilter, resetCriteria } =
    useSearch();
  const { reduced } = useMotionPreferences();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /* --- Progression du carrousel : lisible en un coup d’œil --- */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let last = 0;
    const measure = () => {
      const max = track.scrollWidth - track.clientWidth;
      const value = max > 0 ? track.scrollLeft / max : 0;
      setProgress(value);
      setAtStart(track.scrollLeft <= 4);
      setAtEnd(max <= 4 || track.scrollLeft >= max - 4);
    };

    const stop = onAnimationFrame((time) => {
      if (time - last < 80) return;
      last = time;
      measure();
    });
    track.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      stop();
      track.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [visibleProperties.length]);

  const step = useCallback(() => {
    const track = trackRef.current;
    const card = track?.querySelector<HTMLElement>("[data-card]");
    return (card?.offsetWidth ?? 320) + 24;
  }, []);

  const slide = useCallback(
    (direction: 1 | -1) => {
      trackRef.current?.scrollBy({
        left: direction * step(),
        behavior: reduced ? "auto" : "smooth",
      });
    },
    [reduced, step],
  );

  /* --- Glisser à la souris (le tactile garde son défilement natif) --- */
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  /** Un glissement ne doit jamais déclencher l’ouverture d’une fiche. */
  const suppressClickAfterDrag = (event: React.MouseEvent) => {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "touch") return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startLeft: track.scrollLeft,
      moved: false,
    };
    track.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track || !drag.current.active) return;
    const delta = event.clientX - drag.current.startX;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    track.scrollLeft = drag.current.startLeft - delta;
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const track = trackRef.current;
    drag.current.active = false;
    track?.releasePointerCapture?.(event.pointerId);
  };

  const results = isSearching ? appliedResults : visibleProperties;

  return (
    <section
      id="biens"
      className="homera-scene scene-bg-tint relative py-20 sm:py-24"
      aria-labelledby="biens-titre"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SceneHeader
            index="04"
            eyebrow="Sélection certifiée"
            title={<span id="biens-titre">Des biens qui méritent d’être vus</span>}
            intro="Chaque bien possède son identifiant unique HOMERA et sa fiche de vérification d’identité et de mandat."
            className="max-w-2xl"
          />

          {/* Filtres rapides — synchronisés avec la recherche du hero */}
          <Reveal delay={120} y={16} className="shrink-0">
            <div
              role="group"
              aria-label="Filtrer par type de bien"
              className="homera-noscrollbar flex items-center gap-2 overflow-x-auto pb-1 lg:justify-end"
            >
              {PROPERTY_FILTERS.map((filter) => {
                const active = !isSearching && activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      // Choisir un type efface la recherche en cours : le filtre redevient lisible.
                      if (isSearching) resetCriteria();
                      setActiveFilter(filter.id);
                    }}
                    aria-pressed={active}
                    className={`homera-press whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-medium tracking-[0.01em] transition-colors duration-300 ${
                      active
                        ? "bg-homera-brown text-white shadow-sm dark:bg-homera-terracotta"
                        : "border border-border bg-card text-muted hover:text-foreground"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        {/* Recherche active : ce qui a été demandé, et comment l’élargir */}
        {isSearching && (
          <Reveal y={12} duration={520} className="mt-8">
            <div className="flex flex-col gap-3 rounded-2xl border border-homera-terracotta/25 bg-homera-terracotta/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] text-foreground">
                <span className="font-semibold">
                  {countLabel(results.length)}
                </span>{" "}
                pour{" "}
                <span className="text-homera-terracotta">
                  {[
                    criteria.location,
                    criteria.propertyType && TYPE_LABELS[criteria.propertyType as keyof typeof TYPE_LABELS],
                    criteria.project && INTENT_LABELS[criteria.project as keyof typeof INTENT_LABELS],
                    criteria.budget && `≤ ${criteria.budget} FCFA`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "tous les critères"}
                </span>
              </p>
              <button
                type="button"
                onClick={resetCriteria}
                className="homera-underline inline-flex items-center gap-1.5 text-[12px] font-medium text-homera-terracotta"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Élargir la recherche
              </button>
            </div>
          </Reveal>
        )}

        {results.length === 0 ? (
          <Reveal y={18} className="mt-12">
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-homera-terracotta/10 text-homera-terracotta">
                <Eye className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-serif text-display-xs text-foreground">
                Aucun bien ne correspond encore à ces critères
              </h3>
              <p className="max-w-md text-[13px] leading-relaxed text-muted">
                La sélection s’enrichit chaque semaine. Élargissez la recherche ou parcourez
                l’ensemble des biens vérifiés.
              </p>
              <Button variant="primary" onClick={resetCriteria} className="gap-2">
                Voir tous les biens
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </Reveal>
        ) : (
          <>
            {/* ---------------- Carrousel ---------------- */}
            <div className="mt-10">
              <div
                ref={trackRef}
                role="region"
                aria-label="Sélection de biens vérifiés"
                tabIndex={0}
                data-cursor="drag"
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    slide(1);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    slide(-1);
                  }
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClickCapture={suppressClickAfterDrag}
                className="homera-noscrollbar -mx-4 flex snap-x snap-proximity gap-6 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [touch-action:pan-x_pan-y] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-terracotta focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                {results.map((property, index) => (
                  <PropertyCard key={property.id} property={property} index={index} />
                ))}
                {/* Respiration finale : la dernière carte ne colle pas au bord */}
                <span aria-hidden="true" className="w-2 shrink-0 sm:w-8" />
              </div>

              {/* Commandes */}
              <div className="mt-6 flex items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => slide(-1)}
                    disabled={atStart}
                    aria-label="Bien précédent"
                    className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta disabled:opacity-35"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => slide(1)}
                    disabled={atEnd}
                    aria-label="Bien suivant"
                    className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta disabled:opacity-35"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-1 items-center gap-4">
                  <span className="hidden text-[11px] uppercase tracking-[0.2em] text-muted-light sm:inline">
                    Glisser
                  </span>
                  <span
                    aria-hidden="true"
                    className="relative h-px flex-1 overflow-hidden bg-border"
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-homera-terracotta"
                      style={{
                        width: `${Math.max(12, progress * 100).toFixed(2)}%`,
                        transition: "width 220ms linear",
                      }}
                    />
                  </span>
                  <span className="homera-num text-[11px] tracking-[0.2em] text-muted">
                    {String(results.length).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA final — conservé */}
            <Reveal y={18} className="mt-14 text-center">
              <Button variant="primary" size="lg" className="homera-press gap-2">
                Voir tous les biens certifiés au Bénin
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Reveal>
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Carte d’un bien
   ------------------------------------------------------------------ */

function PropertyCard({ property, index }: { property: Property; index: number }) {
  return (
    <Reveal
      delay={Math.min(index, 3) * 90}
      y={34}
      blur={7}
      className="w-[85vw] shrink-0 snap-start sm:w-[66vw] md:w-[52vw] lg:w-[40vw] xl:w-[27rem]"
    >
      <article
        data-card
        className="homera-lift group/card relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_24px_60px_-50px_rgba(28,17,11,0.75)]"
      >
        <div className="relative">
          <Visual
            mediaKey={property.media}
            alt={property.alt}
            sizes="(min-width: 1280px) 27rem, (min-width: 1024px) 40vw, (min-width: 768px) 52vw, 85vw"
            hoverable
            veil="none"
            quality={70}
            className="h-[15rem] w-full sm:h-[16.5rem]"
            imageClassName="transition-transform duration-[1200ms] ease-[cubic-bezier(.22,.61,.28,1)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(18,11,7,0.85)_0%,rgba(18,11,7,0.35)_38%,transparent_70%)]"
            />

            {/* Repères permanents */}
            <div className="absolute inset-x-3 top-3 z-[2] flex items-start justify-between gap-2">
              <span className="rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
                {INTENT_LABELS[property.intent]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/85 px-2.5 py-1 text-[10.5px] font-medium text-white backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Vérifié HOMERA
              </span>
            </div>

            {/* Identifiant unique + révélation au survol */}
            <div className="absolute inset-x-3 bottom-3 z-[2] flex items-end justify-between gap-3">
              <span className="homera-num rounded-md border border-homera-terracotta/40 bg-black/55 px-2.5 py-1 font-mono text-[11px] tracking-[0.04em] text-homera-terracotta backdrop-blur-sm">
                {property.homeraId}
              </span>

              <span className="translate-y-1 opacity-0 transition-all duration-500 ease-[cubic-bezier(.22,.61,.28,1)] group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-[11.5px] font-semibold text-[#2A170F] shadow-lg">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Fiche du bien
                </span>
              </span>
            </div>
          </Visual>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
              <MapPin className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
              {property.district}, {property.city}
            </p>
            <h3 className="text-[15.5px] font-semibold leading-snug text-foreground transition-transform duration-500 ease-[cubic-bezier(.22,.61,.28,1)] group-hover/card:-translate-y-0.5 group-hover/card:text-homera-terracotta">
              {property.title}
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 border-y border-border py-3 text-[12px] text-muted">
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1.5 homera-num">
                <Bed className="h-4 w-4 text-homera-brown dark:text-homera-terracotta" aria-hidden="true" />
                {property.bedrooms} ch.
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1.5 homera-num">
                <Bath className="h-4 w-4 text-homera-brown dark:text-homera-terracotta" aria-hidden="true" />
                {property.bathrooms} sdb.
              </span>
            )}
            <span className="flex items-center gap-1.5 homera-num">
              <Maximize className="h-4 w-4 text-homera-brown dark:text-homera-terracotta" aria-hidden="true" />
              {property.surface} m²
            </span>
          </div>

          {/* Information secondaire : révélée, jamais imposée */}
          <div className="grid grid-rows-[0fr] overflow-hidden transition-[grid-template-rows] duration-[600ms] ease-[cubic-bezier(.22,.61,.28,1)] group-hover/card:grid-rows-[1fr] group-focus-within/card:grid-rows-[1fr]">
            <div className="min-h-0 overflow-hidden">
              <p className="flex items-center justify-between gap-3 pb-1 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5 homera-num">
                  <CalendarCheck className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                  Vérifié le {property.verifiedOn}
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Mandat valide
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="flex items-baseline gap-1">
              <span className="homera-num text-[16.5px] font-semibold text-homera-brown transition-transform duration-500 ease-[cubic-bezier(.22,.61,.28,1)] group-hover/card:-translate-y-0.5 dark:text-homera-terracotta">
                {formatFCFA(property.price)}
              </span>
              {property.pricePeriod && (
                <span className="text-[11.5px] text-muted">{property.pricePeriod}</span>
              )}
            </p>
            <button
              type="button"
              className="homera-underline text-[12px] font-medium text-homera-brown transition-colors hover:text-homera-terracotta dark:text-homera-terracotta"
              aria-label={`Consulter la fiche de ${property.title}`}
            >
              Consulter
            </button>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

/** Nombre de biens par défaut, exposé pour les tests visuels. */
export const PROPERTY_COUNT = PROPERTIES.length;

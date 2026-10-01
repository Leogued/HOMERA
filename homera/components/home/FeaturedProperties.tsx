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
import { DEMO_DATA, PROPERTY_FILTERS, type Property } from "@/lib/content";
import { countLabel, formatFCFA, INTENT_LABELS, TYPE_LABELS } from "@/lib/format";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { Button } from "@/components/ui/Button";
import { requestMotionFrame, useMotionPreferences } from "@/lib/motion";
import { galleryDepth } from "@/lib/motion-math";
import { TextRoll } from "@/components/ui/TextRoll";
import { PropertyPreview } from "@/components/home/PropertyPreview";
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
  const { visibleProperties, appliedResults, isSearching, appliedCriteria, activeFilter, setActiveFilter, resetCriteria } =
    useSearch();
  const { reduced, compact, coarse } = useMotionPreferences();

  const results = isSearching ? appliedResults : visibleProperties;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const previousResults = useRef(results);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Property | null>(null);
  const activeIndex = Math.max(0, results.findIndex((property) => property.id === activeId));

  /* Les prix ne reculent jamais. Seul l'objet photographique prend de
     la profondeur ; le calcul se fait sur ses dimensions non transformées. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let cancel: (() => void) | null = null;
    const measure = () => {
      cancel = null;
      const cards = [...track.querySelectorAll<HTMLElement>("[data-gallery-item]")];
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      const focus = track.scrollLeft + track.clientWidth / 2;
      let closest = 0;
      let distance = Infinity;
      for (const [index, card] of cards.entries()) {
        const center = card.offsetLeft + card.offsetWidth / 2;
        if (Math.abs(center - focus) < distance) { closest = index; distance = Math.abs(center - focus); }
        const depth = galleryDepth(center, focus, card.offsetWidth);
        const enabled = !reduced && !compact && !coarse;
        card.style.setProperty("--gallery-scale", String(enabled ? depth.scale : 1));
        card.style.setProperty("--gallery-turn", `${enabled ? depth.turn : 0}deg`);
        card.style.setProperty("--gallery-lift", `${enabled ? depth.lift : 0}px`);
      }
      track.dataset.galleryReady = "true";
      setActiveId(results[closest]?.id ?? null);
      setAtStart(track.scrollLeft < 4);
      setAtEnd(max < 4 || track.scrollLeft > max - 4);
    };
    const queue = () => { if (!cancel) cancel = requestMotionFrame(measure); };
    if (previousResults.current !== results) track.scrollLeft = 0;
    previousResults.current = results;
    queue();
    track.addEventListener("scroll", queue, { passive: true });
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(queue) : null;
    resize?.observe(track);
    window.addEventListener("resize", queue, { passive: true });
    return () => { cancel?.(); resize?.disconnect(); window.removeEventListener("resize", queue); track.removeEventListener("scroll", queue); delete track.dataset.galleryReady; };
  }, [results, reduced, compact, coarse]);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    const cards = track?.querySelectorAll<HTMLElement>("[data-gallery-item]");
    if (!track || !cards?.length) return;
    const card = cards[Math.max(0, Math.min(cards.length - 1, index))];
    track.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);
  const slide = (direction: 1 | -1) => goTo(activeIndex + direction);

  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false, lastX: 0, lastTime: 0, velocity: 0 });
  const suppressClickAfterDrag = (event: React.MouseEvent) => {
    if (!drag.current.moved) return;
    drag.current.moved = false;
    event.preventDefault(); event.stopPropagation();
  };
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || !trackRef.current) return;
    drag.current = { active: true, startX: event.clientX, startLeft: trackRef.current.scrollLeft, moved: false, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0 };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const track = trackRef.current;
    const state = drag.current;
    if (!track || !state.active) return;
    const delta = event.clientX - state.startX;
    if (!state.moved && Math.abs(delta) > 6) {
      state.moved = true;
      track.setPointerCapture(event.pointerId);
      track.dataset.dragging = "true";
    }
    if (!state.moved) return;
    const elapsed = Math.max(1, event.timeStamp - state.lastTime);
    state.velocity = state.velocity * 0.65 + (event.clientX - state.lastX) / elapsed * 0.35;
    state.lastX = event.clientX; state.lastTime = event.timeStamp;
    track.scrollLeft = state.startLeft - delta;
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const state = drag.current;
    state.active = false;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    delete track.dataset.dragging;
    if (event.type === "pointercancel") { state.moved = false; return; }
    if (!state.moved) return;
    const projected = track.scrollLeft - (reduced ? 0 : Math.max(-2, Math.min(2, state.velocity)) * 90) + track.clientWidth / 2;
    const cards = [...track.querySelectorAll<HTMLElement>("[data-gallery-item]")];
    let nearest = 0;
    cards.forEach((card, index) => {
      const center = card.offsetLeft + card.offsetWidth / 2;
      const previous = cards[nearest].offsetLeft + cards[nearest].offsetWidth / 2;
      if (Math.abs(center - projected) < Math.abs(previous - projected)) nearest = index;
    });
    goTo(nearest);
  };
  const closePreview = useCallback(() => setPreview(null), []);

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
                    className={`homera-press whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-medium homera-property-filter tracking-[0.01em] transition-colors duration-300 ${
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
                <span className="homera-accent-ink">
                  {[
                    appliedCriteria.location,
                    appliedCriteria.propertyType && TYPE_LABELS[appliedCriteria.propertyType as keyof typeof TYPE_LABELS],
                    appliedCriteria.project && INTENT_LABELS[appliedCriteria.project as keyof typeof INTENT_LABELS],
                    appliedCriteria.budget && `≤ ${appliedCriteria.budget} FCFA`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "tous les critères"}
                </span>
              </p>
              <button
                type="button"
                onClick={resetCriteria}
                className="homera-underline inline-flex items-center gap-1.5 homera-accent-ink text-[12px] font-medium"
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
                data-cursor={results.length > 1 ? "drag" : undefined}
                onKeyDown={(event) => {
                  if (event.key === "Home") {
                    event.preventDefault(); goTo(0);
                  } else if (event.key === "End") {
                    event.preventDefault(); goTo(results.length - 1);
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    slide(1);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    slide(-1);
                  }
                }}
                onPointerDown={onPointerDown}
                onLostPointerCapture={() => { drag.current.active = false; if (trackRef.current) delete trackRef.current.dataset.dragging; }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClickCapture={suppressClickAfterDrag}
                onDragStart={(event) => event.preventDefault()}
                className="homera-property-gallery homera-noscrollbar relative -mx-4 flex gap-6 overflow-x-auto overscroll-x-contain sm:-mx-6 lg:-mx-8 [touch-action:pan-x_pan-y] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-terracotta focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                {results.map((property, index) => (
                  <PropertyCard key={property.id} property={property} active={index === activeIndex} onOpen={() => setPreview(property)} onFocus={() => goTo(index)} />
                ))}

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

                <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-4">
                  <span className="hidden text-[11px] text-muted sm:inline">Glisser pour découvrir</span>
                  <div role="group" aria-label="Choisir un bien" className="homera-noscrollbar flex max-w-[45vw] gap-1 overflow-x-auto">
                    {results.map((property, index) => <button key={property.id} type="button" onClick={() => goTo(index)} aria-label={`Afficher ${property.title}`} aria-pressed={index === activeIndex} className="homera-gallery-marker flex h-10 w-7 shrink-0 items-center justify-center"><span aria-hidden="true" /></button>)}
                  </div>
                  <span className="homera-num shrink-0 text-[11px] tracking-[.16em] text-muted">{String(activeIndex + 1).padStart(2, "0")} / {String(results.length).padStart(2, "0")}</span>
                </div>
              </div>
            </div>

            {/* CTA final — conservé */}
            <Reveal y={18} className="mt-14 text-center">
              <Button variant="primary" size="lg" onClick={() => { resetCriteria(); setActiveFilter("tous"); goTo(0); }} className="homera-press gap-2">
                Voir tous les biens certifiés au Bénin
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Reveal>
          </>
        )}
        {DEMO_DATA && <p className="mt-6 text-center text-[10.5px] leading-relaxed text-muted">Sélection de démonstration · biens et visuels illustratifs, non commercialisés.</p>}
        <span role="status" className="sr-only">{countLabel(results.length)} dans la sélection.</span>
      </div>
      {preview && <PropertyPreview property={preview} onClose={closePreview} />}
    </section>
  );
}

/* ------------------------------------------------------------------
   Carte d’un bien
   ------------------------------------------------------------------ */

function PropertyCard({ property, active, onOpen, onFocus }: { property: Property; active: boolean; onOpen: () => void; onFocus: () => void }) {
  return (
    <article data-gallery-item data-card data-active={active} onFocusCapture={(event) => { if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) onFocus(); }}
      className="homera-property-object group/card relative shrink-0 snap-center">
      <div className="homera-property-photo relative overflow-hidden rounded-[1.5rem] bg-[#3e2418] shadow-[0_35px_75px_-45px_rgba(62,36,24,.55)]">
        <Reveal y={0} blur={0} clip clipRadius={24} duration={1050}>
          <Visual mediaKey={property.media} alt={property.alt}
            sizes="(min-width: 1280px) 52rem, (min-width: 1024px) 70vw, 85vw" veil="none" quality={72}
            className="aspect-[16/10] w-full" imageClassName="homera-property-image" />
        </Reveal>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(28,17,11,.80),transparent_48%,rgba(28,17,11,.2))]" />
        <div className="pointer-events-none absolute inset-x-4 top-4 z-[2] flex flex-wrap items-center justify-between gap-2 text-[10px] text-white sm:inset-x-6 sm:top-6">
          <span className="rounded-full border border-white/30 bg-[#3e2418]/70 px-3 py-1.5 font-semibold uppercase tracking-[.12em]">{INTENT_LABELS[property.intent]} · {TYPE_LABELS[property.type]}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-[#3e2418]/70 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#e0a45e]" aria-hidden="true" />Vérifié HOMERA</span>
        </div>
        <button type="button" onClick={onOpen} data-cursor="property" aria-label={`Voir le bien : ${property.title}`}
          className="absolute inset-0 z-[3] rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e0a45e]">
          <span className="sr-only">Voir le bien</span>
        </button>
        <div className="pointer-events-none absolute inset-x-5 bottom-5 z-[4] flex items-center justify-between gap-3 sm:inset-x-7 sm:bottom-7">
          <span className="homera-num font-mono text-[11px] tracking-[.06em] text-[#e0a45e]">{property.homeraId}</span>
          <span className="homera-property-explore inline-flex items-center gap-2 rounded-full border border-white/35 bg-[#faf6ef]/95 px-4 py-2 text-[11px] font-semibold text-[#3e2418]"><Eye className="h-3.5 w-3.5" aria-hidden="true" />Voir le bien</span>
        </div>
      </div>
      <div className="homera-property-caption mt-5 px-1 sm:px-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-1.5 text-[11.5px] text-muted"><MapPin className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />{property.district}, {property.city}</p>
            <h3 className="homera-property-title max-w-lg font-serif text-[1.35rem] leading-snug text-foreground sm:text-[1.6rem]">{property.title}</h3>
          </div>
          <p className="homera-num shrink-0 text-[16px] font-semibold text-foreground sm:pt-1">{formatFCFA(property.price)}<span className="ml-1 text-[11px] font-normal text-muted">{property.pricePeriod}</span></p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted">
            {property.bedrooms > 0 && <li className="homera-num inline-flex items-center gap-2"><Bed className="h-4 w-4" aria-hidden="true" />{property.bedrooms} ch.</li>}
            {property.bathrooms > 0 && <li className="homera-num inline-flex items-center gap-2"><Bath className="h-4 w-4" aria-hidden="true" />{property.bathrooms} sdb.</li>}
            <li className="homera-num inline-flex items-center gap-2"><Maximize className="h-4 w-4" aria-hidden="true" />{property.surface} m²</li>
          </ul>
          <button type="button" onClick={onOpen} data-cursor="property" aria-label={`Voir le bien : ${property.title}`} className="homera-underline inline-flex min-h-10 items-center gap-2 homera-accent-ink text-[12px] font-medium"><TextRoll>Voir le bien</TextRoll><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
        </div>
        <p className="homera-property-secondary mt-2 flex min-h-5 items-center gap-2 text-[11px] text-muted"><CalendarCheck className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />Vérifié le {property.verifiedOn} · Mandat valide</p>
      </div>
    </article>
  );
}

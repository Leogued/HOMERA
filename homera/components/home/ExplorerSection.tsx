"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { INTENTS, type Intent } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { TextRoll } from "@/components/ui/TextRoll";
import { useInView, useMotionPreferences, useRovingFocus } from "@/lib/motion";
import { useSearch } from "@/components/providers/SearchProvider";
import { EMPTY_CRITERIA } from "@/lib/format";

export const INTENT_EVENT = "homera:focus-intent";
export const INTENT_ACTIVE_EVENT = "homera:intent-active";

const TYPES: Record<string, string> = {
  acheter: "Maisons · Appartements · Terrains",
  louer: "Maisons · Appartements · Studios",
  sejour: "Nuitée · Quelques jours · Courte durée",
  investir: "Parcelles · Patrimoine · Projets",
};

/* Quatre portes partagent un seul espace. L'ouverture donne la place à
   l'image et aux détails, pas à une animation imposée de 3 écrans.
   Le toucher sélectionne d'abord ; seul le lien Explorer applique le filtre. */
export function ExplorerSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { reduced } = useMotionPreferences();
  const { ref: sceneRef, inView } = useInView<HTMLElement>({ threshold: 0.16, once: false });
  const { containerRef, handleKeyDown, focusItem } = useRovingFocus<HTMLDivElement>();
  const { applySearch } = useSearch();

  const openDoor = useCallback((intent: Intent) => {
    applySearch({ ...EMPTY_CRITERIA, ...intent.filter });
    document.getElementById("biens")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    window.history.pushState(null, "", "#biens");
  }, [applySearch, reduced]);

  useEffect(() => {
    const onFocusIntent = (event: Event) => {
      const index = INTENTS.findIndex((intent) => intent.id === (event as CustomEvent<string>).detail);
      if (index < 0) return;
      setActiveIndex(index);
      document.getElementById("explorer")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    };
    window.addEventListener(INTENT_EVENT, onFocusIntent);
    return () => window.removeEventListener(INTENT_EVENT, onFocusIntent);
  }, [reduced]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent<string | null>(INTENT_ACTIVE_EVENT, {
      detail: inView ? INTENTS[activeIndex].id : null,
    }));
  }, [activeIndex, inView]);

  return (
    <section ref={sceneRef} id="explorer" className="homera-scene scene-bg-tint-in relative py-[var(--space-section)] sm:py-[var(--space-section-lg)]" aria-labelledby="explorer-titre">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SceneHeader index="03" eyebrow="Explorer par intention"
          title={<span id="explorer-titre">Une vision fluide de vos ambitions <span className="homera-accent text-homera-terracotta">de vie au Bénin</span></span>}
          intro="Trouver, acheter, louer ou investir ne devrait jamais ressembler à un parcours du combattant. Choisissez une porte : la sélection s’ajuste."
          className="max-w-3xl" />
        <p id="intent-instructions" className="sr-only">Utilisez les flèches pour choisir une intention, puis le lien Explorer pour consulter sa sélection. Sur écran tactile, touchez une intention pour l’ouvrir.</p>
        <div ref={containerRef} onKeyDown={handleKeyDown} aria-describedby="intent-instructions" className="homera-intent-doors mt-10">
          {INTENTS.map((intent, index) => {
            const active = index === activeIndex;
            return (
              <article key={intent.id} id={`intent-${intent.anchor}`} data-active={active}
                className="homera-intent-door group relative isolate scroll-mt-28 overflow-hidden rounded-card bg-homera-brown text-white"
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  // Une prévisualisation ne doit pas déplacer un lien au clavier.
                  if (containerRef.current?.querySelector(":focus-visible")) return;
                  setActiveIndex(index);
                }}>
                <Reveal y={0} blur={0} clip clipRadius={24} duration={1050} className="absolute inset-0 h-full w-full">
                  <Visual mediaKey={intent.media} alt={`${intent.title} — ${intent.claim}`}
                    sizes="(min-width: 1024px) 48vw, 92vw" veil="none" quality={70}
                    className="h-full w-full" imageClassName="homera-intent-image" />
                </Reveal>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(28,17,11,.95),rgba(28,17,11,.50)_45%,rgba(28,17,11,.08)_80%)]" />
                <button type="button" id={`intent-stage-${intent.anchor}`} data-roving-item
                  aria-labelledby={`intent-title-${intent.id}`} aria-expanded={active} aria-controls={`intent-detail-${intent.id}`}
                  tabIndex={active ? 0 : -1} onFocus={() => setActiveIndex(index)} onClick={() => setActiveIndex(index)}
                  className="absolute inset-0 z-[2] rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-homera-amber">
                  <span className="sr-only">Ouvrir {intent.title}</span>
                </button>
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-5 z-[3] flex items-center justify-between text-caption font-semibold tracking-[.25em] sm:inset-x-6 sm:top-6">
                  <span className="homera-num">{intent.index}</span>
                  <span className="homera-intent-arrow flex h-9 w-9 items-center justify-center rounded-full border border-white/30"><ArrowUpRight className="h-4 w-4" /></span>
                </div>
                <div className="homera-intent-copy pointer-events-none absolute inset-x-5 bottom-5 z-[3] sm:inset-x-6 sm:bottom-6">
                  <h3 id={`intent-title-${intent.id}`} className="homera-intent-title font-serif">{intent.title}</h3>
                  <p className="mt-2 text-caption leading-relaxed text-homera-cream-dark">{TYPES[intent.id]}</p>
                  <div id={`intent-detail-${intent.id}`} className="homera-intent-details" aria-hidden={!active} inert={!active}>
                    <div className="min-h-0 overflow-hidden">
                      <p className="mt-4 max-w-md text-body-sm font-medium leading-relaxed text-white">{intent.claim}</p>
                      <p className="mt-3 max-w-md text-note leading-relaxed text-homera-cream-dark">{intent.description}</p>
                      <ul className="mt-3 space-y-2">
                        {intent.bullets.map((bullet) => <li key={bullet} className="flex items-start gap-2 text-caption leading-relaxed text-homera-cream-dark"><Check className="mt-1 h-3 w-3 shrink-0 text-homera-amber" aria-hidden="true" /><span>{bullet}</span></li>)}
                      </ul>
                      <a href="#biens" data-cursor="explore" tabIndex={active ? 0 : -1}
                        onClick={(event) => { event.preventDefault(); openDoor(intent); }}
                        aria-label={`Explorer — ${intent.cta}`}
                        className="homera-press pointer-events-auto mt-5 inline-flex min-h-10 items-center gap-3 rounded-full border border-white/30 bg-white/10 px-4 text-note font-medium text-white hover:bg-white/15">
                        <TextRoll>Explorer</TextRoll><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-caption text-muted"><span className="homera-num homera-accent-ink mr-3">{INTENTS[activeIndex].index} / 04</span>Une porte vers votre projet.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => focusItem(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0} aria-label="Intention précédente" className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground disabled:opacity-30"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={() => focusItem(Math.min(INTENTS.length - 1, activeIndex + 1))} disabled={activeIndex === INTENTS.length - 1} aria-label="Intention suivante" className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground disabled:opacity-30"><ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

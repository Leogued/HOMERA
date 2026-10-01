"use client";

import { useCallback, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { INTENTS, type Intent } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { useInView, useMotionPreferences, usePanProgress } from "@/lib/motion";
import { useSearch } from "@/components/providers/SearchProvider";
import { EMPTY_CRITERIA } from "@/lib/format";

/* ==================================================================
   HOMERA — EXPLORER PAR INTENTION
   ------------------------------------------------------------------
   Quatre portes, pas quatre cartes. Sur grand écran, la scène se fige
   et les portes défilent horizontalement au rythme du scroll : celle
   qui occupe le centre devient dominante, les autres reculent. Sur
   mobile, la scène se déplie verticalement (aucun défilement
   horizontal imposé au pouce).

   Chaque porte applique réellement son intention à la sélection de
   biens : c’est un filtre, pas une illustration.
   ================================================================== */

export const INTENT_EVENT = "homera:focus-intent";
export const INTENT_ACTIVE_EVENT = "homera:intent-active";

export function ExplorerSection() {
  const { reduced, compact } = useMotionPreferences();
  const pinned = !reduced && !compact;
  const { sectionRef, stickyRef, pan } = usePanProgress<HTMLDivElement, HTMLDivElement>(pinned);
  // La scène sait si elle est encore à l’écran : le menu s’éteint avec elle.
  const { ref: sceneRef, inView } = useInView<HTMLElement>({ threshold: 0.12, once: false });
  const stageTrackRef = useRef<HTMLDivElement | null>(null);

  const { applySearch } = useSearch();

  const openDoor = useCallback(
    (intent: Intent) => {
      applySearch({ ...EMPTY_CRITERIA, ...intent.filter });
      document.getElementById("biens")?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      window.history.pushState(null, "", "#biens");
    },
    [applySearch, reduced],
  );

  const activeIndex = Math.round(pan * (INTENTS.length - 1));

  /** Contrôle explicite : amène la porte voulue au centre, quel que soit le mode. */
  const goToPanel = useCallback(
    (index: number) => {
      const clamped = Math.min(INTENTS.length - 1, Math.max(0, index));
      const behavior: ScrollBehavior = reduced ? "auto" : "smooth";

      if (!pinned) {
        // Mode défilable (mouvement réduit) : on fait glisser la piste elle-même.
        const track = stageTrackRef.current;
        const first = track?.firstElementChild as HTMLElement | null;
        if (!track || !first) return;
        track.scrollTo({ left: clamped * (first.offsetWidth + 24), behavior });
        return;
      }

      const section = sectionRef.current;
      if (!section) return;
      const sticky = stickyRef.current?.offsetHeight ?? window.innerHeight;
      const travel = section.offsetHeight - sticky;
      window.scrollTo({
        top: section.offsetTop + (clamped / (INTENTS.length - 1)) * travel + 2,
        behavior,
      });
    },
    [pinned, reduced, sectionRef, stickyRef],
  );

  /* --- Le menu peut demander une intention précise --- */
  useEffect(() => {
    const onFocusIntent = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const index = INTENTS.findIndex((intent) => intent.id === id);
      if (index < 0) return;

      if (pinned) {
        goToPanel(index);
      } else {
        document
          .getElementById(`intent-${INTENTS[index].anchor}`)
          ?.scrollIntoView({
            behavior: reduced ? "auto" : "smooth",
            block: "center",
          });
      }
    };

    window.addEventListener(INTENT_EVENT, onFocusIntent);
    return () => window.removeEventListener(INTENT_EVENT, onFocusIntent);
  }, [goToPanel, pinned, reduced]);

  /* --- L’intention dominante est annoncée (surbrillance du menu) --- */
  useEffect(() => {
    if (!pinned) return;
    const intent = inView ? INTENTS[activeIndex] : null;
    window.dispatchEvent(
      new CustomEvent<string | null>(INTENT_ACTIVE_EVENT, {
        detail: intent ? intent.id : null,
      }),
    );
  }, [activeIndex, inView, pinned]);

  return (
    <section
      ref={sceneRef}
      id="explorer"
      className="homera-scene scene-bg-tint-in relative pt-16 sm:pt-20"
    >
      {/* ---------------- Grand écran : scène épinglée, pan horizontal ---------------- */}
      <div
        ref={sectionRef}
        className="relative hidden lg:block"
        style={{ height: "320svh" }}
      >
        <div ref={stickyRef} className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
          <div className="mx-auto w-full max-w-[100rem] px-8 xl:px-12">
            <SceneHeader
              index="03"
              eyebrow="Explorer par intention"
              title={
                <>
                  Une vision fluide de vos ambitions{" "}
                  <span className="homera-accent text-homera-terracotta">de vie au Bénin</span>
                </>
              }
              intro="Trouver, acheter, louer ou investir ne devrait jamais ressembler à un parcours du combattant. Choisissez une porte : la sélection s’ajuste."
              className="homera-stage-header max-w-3xl"
            />

            {/* Piste horizontale — épinglée, ou défilable si le mouvement est réduit */}
            <div
              className={
                pinned
                  ? "mt-10 overflow-hidden"
                  : "homera-noscrollbar mt-10 snap-x snap-proximity overflow-x-auto overscroll-x-contain pb-2"
              }
            >
              <div
                ref={stageTrackRef}
                /* Centrage exact de la porte 1, y compris quand la scène est
                   plafonnée (max-w) : le décalage est calculé, la piste est
                   décalée d’un cran de 48vw par porte (46vw + 2vw d’écart). */
                className={`flex gap-[2vw] ${
                  pinned
                    ? "homera-stage-pad will-change-transform"
                    : "px-8"
                }`}
                style={
                  pinned
                    ? {
                        transform: `translate3d(${(-pan * 144).toFixed(3)}vw, 0, 0)`,
                        transition: "transform 120ms linear",
                      }
                    : undefined
                }
              >
                {INTENTS.map((intent, index) => (
                  <IntentPanel
                    key={intent.id}
                    intent={intent}
                    variant="stage"
                    isActive={index === activeIndex}
                    focusable={pinned ? index === activeIndex : true}
                    scrollable={!pinned}
                    domId={`intent-stage-${INTENTS[index].anchor}`}
                    onOpen={openDoor}
                  />
                ))}
              </div>
            </div>

            {/* Indicateur de progression de la scène */}
            <div className="mt-8 flex items-center justify-between gap-8">
              <div className="flex items-center gap-3">
                {INTENTS.map((intent, index) => (
                  <span
                    key={intent.id}
                    aria-hidden="true"
                    className={`h-px transition-all duration-500 ease-[cubic-bezier(.22,.61,.28,1)] ${
                      index === activeIndex
                        ? "w-12 bg-homera-terracotta"
                        : "w-6 bg-foreground/20"
                    }`}
                  />
                ))}
                <span className="homera-num text-[11px] font-semibold tracking-[0.24em] text-homera-terracotta">
                  {INTENTS[activeIndex]?.index}
                </span>
                <span className="text-[10.5px] uppercase tracking-[0.24em] text-muted">
                  {INTENTS[activeIndex]?.title}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <p className="homera-num text-[11px] tracking-[0.2em] text-muted-light">
                  {String(activeIndex + 1).padStart(2, "0")} /{" "}
                  {String(INTENTS.length).padStart(2, "0")}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPanel(activeIndex - 1)}
                    disabled={activeIndex === 0}
                    aria-label="Intention précédente"
                    className="homera-press flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta disabled:opacity-30"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPanel(activeIndex + 1)}
                    disabled={activeIndex === INTENTS.length - 1}
                    aria-label="Intention suivante"
                    className="homera-press flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta disabled:opacity-30"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Mobile / tablette : la scène se déplie ---------------- */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:hidden">
        <SceneHeader
          index="03"
          eyebrow="Explorer par intention"
          title={
            <>
              Une vision fluide de vos ambitions{" "}
              <span className="homera-accent text-homera-terracotta">de vie au Bénin</span>
            </>
          }
          intro="Trouver, acheter, louer ou investir ne devrait jamais ressembler à un parcours du combattant. Choisissez une porte : la sélection s’ajuste."
        />

        <div className="mt-10 space-y-6">
          {INTENTS.map((intent, index) => (
            <IntentPanel
              key={intent.id}
              intent={intent}
              variant="stack"
              isActive
              delay={index * 90}
              domId={`intent-${intent.anchor}`}
              onOpen={openDoor}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Une porte
   ------------------------------------------------------------------ */

function IntentPanel({
  intent,
  variant,
  isActive,
  delay = 0,
  focusable = true,
  scrollable = false,
  domId,
  onOpen,
}: {
  intent: Intent;
  variant: "stage" | "stack";
  isActive: boolean;
  delay?: number;
  /** Sur la scène épinglée, seules les portes visibles sont atteignables au clavier. */
  focusable?: boolean;
  /** Mode défilable (mouvement réduit) : la porte s’aligne au défilement. */
  scrollable?: boolean;
  domId?: string;
  onOpen: (intent: Intent) => void;
}) {
  const isStage = variant === "stage";

  return (
    <Reveal
      delay={isStage ? 0 : delay}
      y={isStage ? 40 : 26}
      blur={6}
      immediate={isStage}
      className={
        isStage
          ? `group relative w-[46vw] shrink-0 ${scrollable ? "snap-start" : ""} ${
              isActive ? "z-10" : "z-0"
            }`
          : "group relative"
      }
      style={
        isStage
          ? {
              transform: `scale(${isActive ? 1 : 0.955})`,
              opacity: isActive ? 1 : 0.72,
              transition:
                "transform 700ms var(--homera-ease), opacity 700ms var(--homera-ease)",
              filter: "none",
            }
          : undefined
      }
    >
      <a
        id={domId}
        href="#biens"
        data-cursor="explore"
        tabIndex={focusable ? 0 : -1}
        onClick={(event) => {
          event.preventDefault();
          onOpen(intent);
        }}
        aria-label={`${intent.title} — ${intent.claim}`}
        className="relative block overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_40px_90px_-60px_rgba(28,17,11,0.9)] outline-none focus-visible:ring-2 focus-visible:ring-homera-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Rideau d’image : le visuel se découvre, il n’apparaît pas d’un bloc */}
        <Reveal
          clip
          clipRadius={28}
          duration={1100}
          y={0}
          blur={0}
          className={isStage ? "homera-stage-panel w-full" : "h-[62vw] max-h-[520px] min-h-[300px] w-full"}
        >
          <Visual
            mediaKey={intent.media}
            alt={`${intent.title} — ${intent.claim}`}
            sizes="(min-width: 1024px) 46vw, 100vw"
            hoverable
            veil="none"
            quality={70}
            className="h-full w-full"
            imageClassName="transition-transform duration-[1400ms] ease-[cubic-bezier(.22,.61,.28,1)]"
          />
        </Reveal>

        {/* Voile de lisibilité + chaleur au survol */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(18,11,7,0.92)_0%,rgba(18,11,7,0.55)_38%,rgba(18,11,7,0.12)_68%,rgba(18,11,7,0.35)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-within:opacity-100 bg-[radial-gradient(120%_90%_at_80%_0%,rgba(198,93,59,0.32),transparent_60%)]"
        />

        <div className="absolute inset-0 z-[2] flex flex-col justify-between p-6 text-white sm:p-7">
          <div className="flex items-start justify-between">
            <span className="homera-num text-[11px] font-semibold tracking-[0.3em] text-white/70">
              {intent.index}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 opacity-0 transition-all duration-500 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:opacity-100 -translate-x-1">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>

          <div>
            <h3 className="font-serif text-[1.9rem] leading-tight transition-transform duration-700 ease-[cubic-bezier(.22,.61,.28,1)] group-hover:-translate-y-1 sm:text-[2.15rem]">
              {intent.title}
            </h3>
            <p className="mt-2 max-w-[26rem] text-[12.5px] leading-relaxed text-stone-200/90">
              {intent.claim}
            </p>

            {/* Détail révélé au survol / focus — jamais de déplacement brutal du texte */}
            <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-[700ms] ease-[cubic-bezier(.22,.61,.28,1)] group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
              <div className="overflow-hidden">
                <p className="pt-3 text-[12.5px] leading-relaxed text-stone-300">
                  {intent.description}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {intent.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-[12px] text-stone-200/90">
                      <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-homera-amber" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-white">
              <span className="homera-underline">{intent.cta}</span>
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform duration-500 ease-out group-hover:translate-x-1"
              />
            </span>
          </div>
        </div>
      </a>
    </Reveal>
  );
}

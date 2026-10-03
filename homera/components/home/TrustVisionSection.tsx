"use client";

import { useCallback } from "react";
import {
  ArrowRight,
  Globe,
  HeartHandshake,
  Search,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { FINAL_CTA, PILLARS } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { Button } from "@/components/ui/Button";
import { TextRoll } from "@/components/ui/TextRoll";
import { phase } from "@/lib/motion-math";
import {
  useMotionPreferences,
  usePointerMotion,
  useSceneMotion,
} from "@/lib/motion";

/* ==================================================================
   HOMERA — MANIFESTE & PROJECTION
   ------------------------------------------------------------------
   La déclaration de conviction (inchangée dans son intention), les
   quatre piliers, puis la projection finale : un plan large en
   parallax, où le texte arrive par-dessus l’image — comme une scène
   de fin, avant l’action.

   Les deux boutons terminaux correspondent aux deux seules choses
   utiles à ce moment : chercher un bien, ou comprendre la
   vérification.
   ================================================================== */

const ICONS: Record<(typeof PILLARS)[number]["icon"], LucideIcon> = {
  shield: ShieldCheck,
  "user-check": UserCheck,
  globe: Globe,
  handshake: HeartHandshake,
};

export function TrustVisionSection() {
  const { reduced, compact } = useMotionPreferences();
  const update = useCallback((element: HTMLDivElement, progress: number) => {
    const entrance = phase(progress, 0.08, 0.68);
    element.style.setProperty("--final-content-progress", entrance.toFixed(4));
    element.style.setProperty("--final-content-y", `${((1 - entrance) * (compact ? 12 : 28)).toFixed(2)}px`);
    element.style.setProperty("--final-image-y", `${((progress - 0.5) * (compact ? 8 : 18)).toFixed(2)}px`);
  }, [compact]);
  const ref = useSceneMotion<HTMLDivElement>(update, { enabled: !reduced, mode: "reveal", response: 75 });
  const buttonRef = usePointerMotion<HTMLButtonElement>({ strength: 2, enabled: !reduced });

  return (
    <section
      id="manifeste"
      className="homera-scene scene-bg-tint-out relative pt-20 pb-24 sm:pt-24"
      aria-labelledby="manifeste-titre"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SceneHeader
          index="09"
          eyebrow="Manifeste"
          align="center"
          title={<span id="manifeste-titre">Restaurer la confiance dans la pierre béninoise</span>}
          intro="HOMERA ne cherche pas seulement à afficher des annonces : l’objectif est de créer une véritable infrastructure numérique autour du bien immobilier."
        />

        {/* Citation fondatrice */}
        <Reveal delay={120} y={26} className="mt-12">
          <figure className="relative overflow-hidden rounded-4xl bg-homera-brown px-6 py-12 text-center text-white sm:px-14 sm:py-16">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-homera-terracotta/20 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-homera-amber/10 blur-3xl"
            />
            <blockquote className="relative">
              <p className="homera-accent mx-auto max-w-2xl text-accent text-homera-cream sm:text-accent-lg">
                « Un bien ne devrait jamais être une promesse floue. Chaque dossier que nous
                publions doit pouvoir être relu, compris et assumé. »
              </p>
              <figcaption className="mt-6 text-caption font-semibold uppercase tracking-[0.28em] text-homera-amber">
                Notre déclaration
              </figcaption>
            </blockquote>
          </figure>
        </Reveal>

        {/* Quatre piliers */}
        <div className="mt-12 grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, index) => {
            const Icon = ICONS[pillar.icon];
            return (
              <Reveal
                key={pillar.title}
                delay={index * 110}
                y={26}
                className="group border-t border-border pt-7"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-homera-terracotta/10 text-homera-terracotta transition-transform duration-500 ease-standard group-hover:-translate-y-1">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-body-sm font-semibold leading-snug text-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-note leading-relaxed text-muted">
                  {pillar.description}
                </p>
              </Reveal>
            );
          })}
        </div>

        {/* ---------------- Projection finale ---------------- */}
        <div ref={ref} className="homera-final-scene mt-16">
          <Reveal y={0} blur={0} clip clipRadius={32} duration={1200}>
            <div className="homera-on-dark relative overflow-hidden rounded-4xl border border-border">
              <div className="homera-final-image">
                <div
                  className="homera-media relative h-[30rem] w-full sm:h-[34rem] lg:h-[36rem]"

                >
                  <Visual
                    mediaKey={FINAL_CTA.media}
                    alt={FINAL_CTA.alt}
                    sizes="(min-width: 1280px) 80rem, 96vw"
                    veil="none"
                    quality={74}
                    className="h-full w-full"
                    imageClassName="homera-final-photo"
                  />
                </div>
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,10,6,0.94)_0%,rgba(16,10,6,0.62)_38%,rgba(16,10,6,0.15)_70%,rgba(16,10,6,0.45)_100%)]"
              />

              <div className="homera-final-content absolute inset-0 flex flex-col justify-end p-7 text-white sm:p-12">
                <Reveal delay={140} y={24} className="max-w-2xl">
                  <h3 className="font-serif text-display-sm leading-tight sm:text-display-lg">
                    {FINAL_CTA.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-body-sm leading-relaxed text-homera-cream/90">
                    {FINAL_CTA.description}
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Button
                      ref={buttonRef}
                      variant="accent"
                      size="lg"
                      data-cursor="explore"
                      onClick={() =>
                        document.getElementById("biens")?.scrollIntoView({
                          behavior: reduced ? "auto" : "smooth",
                          block: "start",
                        })
                      }
                      className="homera-final-action homera-magnetic homera-press gap-2"
                    >
                      <Search className="h-4 w-4" aria-hidden="true" />
                      <TextRoll>{FINAL_CTA.primary}</TextRoll>
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() =>
                        document.getElementById("protocole")?.scrollIntoView({
                          behavior: reduced ? "auto" : "smooth",
                          block: "start",
                        })
                      }
                      className="homera-press gap-2 border border-white/25 text-white hover:bg-white/10 dark:hover:bg-white/10"
                    >
                      <TextRoll>{FINAL_CTA.secondary}</TextRoll>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <p className="mt-6 text-caption uppercase tracking-[0.22em] text-homera-cream-dark/70">
                    Cotonou · Abomey-Calavi · Porto-Novo · Ouidah
                  </p>
                </Reveal>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

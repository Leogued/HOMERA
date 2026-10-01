"use client";

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
import {
  cssVars,
  useMotionPreferences,
  usePointerMotion,
  useScrollProgress,
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
  const { reduced } = useMotionPreferences();
  const { ref, progress } = useScrollProgress<HTMLDivElement>(!reduced);
  const shift = reduced ? 0 : Math.round((progress - 0.5) * 60);
  const pointerRef = usePointerMotion<HTMLDivElement>({ strength: 10, enabled: !reduced });

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
          <figure className="relative overflow-hidden rounded-[2rem] bg-homera-brown px-6 py-12 text-center text-white sm:px-14 sm:py-16">
            <span
              aria-hidden="true"
              className="homera-halo pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-homera-terracotta/20 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="homera-halo pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-homera-amber/10 blur-3xl"
              style={{ animationDelay: "-6s" }}
            />
            <blockquote className="relative">
              <p className="homera-accent mx-auto max-w-2xl text-[1.25rem] leading-[1.5] text-stone-200 sm:text-[1.5rem]">
                « Un bien ne devrait jamais être une promesse floue. Chaque dossier que nous
                publions doit pouvoir être relu, compris et assumé. »
              </p>
              <figcaption className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-homera-terracotta">
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
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-homera-terracotta/10 text-homera-terracotta transition-transform duration-500 ease-out group-hover:-translate-y-1">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-[14.5px] font-semibold leading-snug text-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  {pillar.description}
                </p>
              </Reveal>
            );
          })}
        </div>

        {/* ---------------- Projection finale ---------------- */}
        <div ref={ref} className="mt-16">
          <Reveal y={0} blur={0} clip clipRadius={32} duration={1200}>
            <div className="homera-on-dark relative overflow-hidden rounded-[2rem] border border-border">
              <div ref={pointerRef} className="homera-depth">
                <div
                  className="homera-media relative h-[30rem] w-full sm:h-[34rem] lg:h-[36rem]"
                  style={cssVars({ "--media-shift": `${shift}px`, "--media-scale": "1.08" })}
                >
                  <Visual
                    mediaKey={FINAL_CTA.media}
                    alt={FINAL_CTA.alt}
                    sizes="(min-width: 1280px) 80rem, 96vw"
                    veil="none"
                    quality={74}
                    className="h-full w-full"
                    imageClassName="scale-[1.02]"
                  />
                </div>
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,10,6,0.94)_0%,rgba(16,10,6,0.62)_38%,rgba(16,10,6,0.15)_70%,rgba(16,10,6,0.45)_100%)]"
              />

              <div className="absolute inset-0 flex flex-col justify-end p-7 text-white sm:p-12">
                <Reveal delay={140} y={24} className="max-w-2xl">
                  <h3 className="font-serif text-display-sm leading-tight sm:text-[2.4rem]">
                    {FINAL_CTA.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-stone-200/90">
                    {FINAL_CTA.description}
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Button
                      variant="accent"
                      size="lg"
                      onClick={() =>
                        document.getElementById("biens")?.scrollIntoView({
                          behavior: reduced ? "auto" : "smooth",
                          block: "start",
                        })
                      }
                      className="homera-press homera-sheen gap-2"
                    >
                      <Search className="h-4 w-4" aria-hidden="true" />
                      {FINAL_CTA.primary}
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
                      {FINAL_CTA.secondary}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-stone-300/70">
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

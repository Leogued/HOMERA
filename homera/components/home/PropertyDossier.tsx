"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { DOSSIER, PROPERTIES, type DossierField } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { useInView, usePointerMotion } from "@/lib/motion";

/* ==================================================================
   HOMERA — LE BIEN HOMERA
   ------------------------------------------------------------------
   La démonstration du concept central : l’identifiant d’un bien
   devient le centre d’un système. Les caractères de la référence
   arrivent un par un, puis les informations vérifiées se relient au
   centre par de fins connecteurs qui se dessinent.

   Tout part d’une seule idée : chaque bien possède une identité.
   ================================================================== */

const PLACEMENT: Record<DossierField["position"], string> = {
  "top-left": "lg:col-start-1 lg:row-start-1",
  "top-right": "lg:col-start-3 lg:row-start-1",
  "mid-left": "lg:col-start-1 lg:row-start-2",
  "mid-right": "lg:col-start-3 lg:row-start-2",
  "bottom-left": "lg:col-start-1 lg:row-start-3",
  "bottom-right": "lg:col-start-3 lg:row-start-3",
};

const isLeftColumn = (position: DossierField["position"]) => position.includes("left");

export function PropertyDossier() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 });
  // Profondeur de pointeur : le système central suit très légèrement la souris.
  const pointerRef = usePointerMotion<HTMLDivElement>({ strength: 6, tilt: 2.4 });
  const reference = PROPERTIES[0];
  const characters = DOSSIER.reference.split("");

  return (
    <section
      id="bien-homera"
      className="homera-scene scene-bg-tint-out relative overflow-hidden py-20 sm:py-24"
      aria-labelledby="bien-homera-titre"
    >
      {/* Halo de fond : le système a un centre */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(198,93,59,0.12),transparent_62%)] blur-2xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SceneHeader
          index="05"
          eyebrow="Le bien HOMERA"
          align="center"
          title={<span id="bien-homera-titre">Chaque bien possède une identité.</span>}
          intro="Un identifiant unique relie le bien à sa fiche : ce qui a été contrôlé, par qui, et à quelle date."
        />

        <div
          ref={ref}
          className="mt-16 grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:grid-rows-3 lg:gap-x-12 lg:gap-y-10"
        >
          {/* ---------------- Centre : le bien et son identifiant ---------------- */}
          <div className="order-first lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-center">
            <div ref={pointerRef} className="homera-depth relative mx-auto w-full max-w-[30rem]">
              {/* Anneaux du système */}
              <span
                aria-hidden="true"
                className="homera-pulse-ring absolute inset-[-1.75rem] rounded-[2.5rem] border border-homera-terracotta/30"
              />
              <span
                aria-hidden="true"
                className="absolute inset-[-0.75rem] rounded-[2rem] border border-homera-terracotta/15"
              />

              <div
                className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_50px_110px_-60px_rgba(28,17,11,0.85)]"
                style={{
                  transform: inView ? "translateY(0) scale(1)" : "translateY(18px) scale(0.985)",
                  opacity: inView ? 1 : 0,
                  transition:
                    "transform 1000ms var(--homera-ease), opacity 900ms var(--homera-ease)",
                }}
              >
                <Visual
                  mediaKey={reference.media}
                  alt={reference.alt}
                  sizes="(min-width: 1024px) 30rem, 92vw"
                  veil="strong"
                  quality={74}
                  className="h-[19rem] w-full sm:h-[22rem]"
                />

                <div className="absolute inset-x-0 bottom-0 z-[2] p-5 text-white sm:p-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-500/85 px-3 py-1 text-[10.5px] font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {DOSSIER.status}
                  </span>

                  {/* L’identifiant se compose caractère par caractère */}
                  <p
                    className="homera-num mt-4 flex flex-wrap font-mono text-[1.35rem] font-medium tracking-[0.06em] text-homera-amber sm:text-[1.6rem]"
                    aria-label={DOSSIER.reference}
                  >
                    {characters.map((character, index) => (
                      <span
                        key={`${character}-${index}`}
                        aria-hidden="true"
                        style={{
                          display: "inline-block",
                          opacity: inView ? 1 : 0,
                          transform: inView ? "translateY(0)" : "translateY(8px)",
                          transition: `opacity 420ms var(--homera-ease) ${
                            index * 42
                          }ms, transform 520ms var(--homera-ease) ${index * 42}ms`,
                        }}
                      >
                        {character === " " ? "\u00A0" : character}
                      </span>
                    ))}
                  </p>

                  <p className="mt-2 max-w-[22rem] text-[12px] leading-relaxed text-stone-200/90">
                    {reference.title} — {reference.district}, {reference.city}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- Les informations reliées au centre ---------------- */}
          {DOSSIER.fields.map((field, index) => {
            const left = isLeftColumn(field.position);
            return (
              <div
                key={field.id}
                className={`group relative ${PLACEMENT[field.position]}`}
              >
                {/* Connecteur dessiné vers le centre */}
                <span
                  aria-hidden="true"
                  className={`absolute top-1/2 hidden h-px w-12 -translate-y-1/2 lg:block ${
                    left
                      ? "right-[-3rem] origin-right bg-[linear-gradient(to_left,var(--homera-terracotta),transparent)]"
                      : "left-[-3rem] origin-left bg-[linear-gradient(to_right,var(--homera-terracotta),transparent)]"
                  }`}
                  style={{
                    transform: `translateY(-50%) scaleX(${inView ? 1 : 0})`,
                    transition: `transform 900ms var(--homera-ease) ${320 + index * 130}ms`,
                  }}
                />
                <span
                  aria-hidden="true"
                  className={`absolute top-1/2 hidden h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-homera-terracotta lg:block ${
                    left ? "right-[-3.25rem]" : "left-[-3.25rem]"
                  }`}
                  style={{
                    opacity: inView ? 1 : 0,
                    transition: `opacity 500ms linear ${900 + index * 130}ms`,
                  }}
                />

                <div
                  className="rounded-2xl border border-transparent px-0 py-2 transition-colors duration-500 hover:border-border hover:bg-card/60 lg:px-4"
                  style={{
                    opacity: inView ? 1 : 0,
                    transform: inView ? "translateY(0)" : "translateY(14px)",
                    transition: `opacity 700ms var(--homera-ease) ${
                      260 + index * 130
                    }ms, transform 800ms var(--homera-ease) ${260 + index * 130}ms`,
                  }}
                >
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-light">
                    {field.label}
                  </p>
                  <p className="homera-num mt-1.5 text-[14px] font-medium leading-snug text-foreground">
                    {field.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note de méthode — la promesse reste précise et vérifiable */}
        <Reveal delay={200} y={16} className="mx-auto mt-16 max-w-2xl text-center">
          <p className="flex items-center justify-center gap-2 text-[12px] leading-relaxed text-muted">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />
            {DOSSIER.note}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

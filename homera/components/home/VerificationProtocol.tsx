"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle,
  FileCheck,
  Lock,
  Search,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { VERIFICATION_STEPS, type VerificationStep } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";
import { cssVars, onAnimationFrame, useMotionPreferences } from "@/lib/motion";

/* ==================================================================
   HOMERA — LA VÉRIFICATION HOMERA
   ------------------------------------------------------------------
   Sept mouvements racontés, pas sept cartes alignées. La section
   s’épingle : l’étape qui traverse le centre du viewport devient
   dominante, les autres reculent légèrement, et le trait de
   progression se remplit au rythme réel du dossier.

   La colonne de gauche ne bouge pas : elle indique où l’on est dans
   le processus, et rappelle ce que « vérifié » veut dire.
   ================================================================== */

const ICONS: Record<VerificationStep["icon"], LucideIcon> = {
  file: FileCheck,
  lock: Lock,
  search: Search,
  user: UserCheck,
  shield: ShieldCheck,
  check: CheckCircle,
  award: Award,
};

export function VerificationProtocol() {
  const { reduced, compact } = useMotionPreferences();
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement | null>(null);

  /* --- L’étape dominante est celle qui passe la ligne de lecture --- */
  useEffect(() => {
    if (reduced) return;
    let last = 0;

    const measure = () => {
      const items = listRef.current?.querySelectorAll<HTMLElement>("[data-step]");
      if (!items || items.length === 0) return;
      const line = window.innerHeight * (compact ? 0.6 : 0.52);
      let current = 0;
      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        if (rect.top <= line) current = index;
      });
      // En bas de la section, la dernière étape doit être franchement atteinte.
      const lastItem = items[items.length - 1];
      if (lastItem && lastItem.getBoundingClientRect().top <= line - 40) {
        current = items.length - 1;
      }
      setActive(current);
    };

    measure();
    const stop = onAnimationFrame((time) => {
      if (time - last < 80) return;
      last = time;
      measure();
    });
    return stop;
  }, [compact, reduced]);

  const progress = reduced ? 1 : (active + 0.65) / VERIFICATION_STEPS.length;

  return (
    <section
      id="protocole"
      className="homera-scene scene-bg-plain relative py-20 sm:py-24"
      aria-labelledby="protocole-titre"
    >
      <span aria-hidden="true" className="scene-edge" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* ---------------- Colonne de repères (s’épingle sur desktop) ---------------- */}
          <div className="lg:sticky lg:top-28 lg:h-fit lg:self-start">
            <Reveal y={14} blur={3} duration={640} className="flex items-center gap-3">
              <span className="homera-num text-[11px] font-semibold tracking-[0.3em] text-homera-terracotta">
                06
              </span>
              <span aria-hidden="true" className="h-px w-10 bg-homera-terracotta/40" />
              <span className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                Transparence & rigueur
              </span>
            </Reveal>

            <Reveal delay={90} y={26} as="h2" className="mt-5 font-serif text-display-sm text-foreground sm:text-display-md">
              <span id="protocole-titre">Le protocole de vérification HOMERA</span>
            </Reveal>

            <Reveal delay={170} y={20} as="p" className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-muted sm:text-[0.9375rem]">
              La confiance ne se décrète pas : HOMERA applique une méthode structurée en sept
              mouvements avant d’accorder l’autorisation de publication.
            </Reveal>

            {/* Trait de progression réel */}
            <Reveal delay={240} y={16} className="mt-10 hidden lg:block">
              <div className="flex items-start gap-5">
                <span
                  aria-hidden="true"
                  className="homera-progress-line mt-1 h-40 w-px bg-border"
                >
                  <span style={cssVars({ "--progress": progress.toFixed(3) })} />
                </span>
                <div className="space-y-1">
                  <p className="homera-num font-serif text-display-sm text-homera-brown dark:text-homera-terracotta">
                    {VERIFICATION_STEPS[active]?.num}
                    <span className="text-muted-light"> / 07</span>
                  </p>
                  <p className="max-w-[16rem] text-[12.5px] leading-relaxed text-muted">
                    {VERIFICATION_STEPS[active]?.title}
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Rappel de cadre : ce que « vérifié » signifie exactement */}
            <Reveal delay={300} y={18} className="mt-10">
              <div className="flex items-start gap-4 rounded-2xl border border-homera-brown/20 bg-homera-brown/[0.05] p-5 dark:bg-homera-brown/20">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-homera-brown text-homera-terracotta">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-2 text-[12.5px]">
                  <h3 className="text-[13.5px] font-semibold leading-snug text-foreground">
                    Ce que « Vérifié par HOMERA » signifie réellement
                  </h3>
                  <p className="leading-relaxed text-muted">
                    HOMERA ne dit pas « ce bien est juridiquement parfait ». La promesse est
                    précise :{" "}
                    <strong className="font-semibold text-foreground">
                      ce bien a fait l’objet d’un processus de vérification portant sur les
                      éléments indiqués dans sa fiche
                    </strong>{" "}
                    (identité du propriétaire, mandat d’agent, localisation, photos).
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ---------------- Les sept mouvements ---------------- */}
          <ol ref={listRef} className="relative space-y-4 sm:space-y-5">
            {VERIFICATION_STEPS.map((step, index) => {
              const Icon = ICONS[step.icon];
              const isActive = index === active;
              return (
                <li key={step.num} data-step className="relative">
                  <Reveal
                    delay={Math.min(index, 4) * 80}
                    y={26}
                    blur={6}
                    className="relative"
                  >
                    <div
                      className="relative flex gap-5 overflow-hidden rounded-3xl border bg-card p-5 transition-[transform,opacity,border-color,box-shadow] duration-[750ms] ease-[cubic-bezier(.22,.61,.28,1)] sm:gap-6 sm:p-6"
                      style={{
                        transform: isActive ? "scale(1)" : "scale(0.972)",
                        transformOrigin: "left center",
                        opacity: isActive ? 1 : 0.55,
                        borderColor: isActive
                          ? "color-mix(in oklab, var(--homera-terracotta) 55%, transparent)"
                          : "var(--border)",
                        boxShadow: isActive
                          ? "0 34px 80px -60px rgba(28,17,11,0.9)"
                          : "none",
                      }}
                    >
                      {/* Liseré d’étape atteinte */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-[3px] origin-top bg-gradient-to-b from-homera-terracotta to-homera-amber transition-transform duration-[900ms] ease-[cubic-bezier(.22,.61,.28,1)]"
                        style={{ transform: `scaleY(${isActive ? 1 : 0})` }}
                      />

                      <div className="flex flex-col items-center gap-2">
                        <span
                          className={`homera-num font-serif text-[1.5rem] leading-none transition-colors duration-500 ${
                            isActive ? "text-homera-terracotta" : "text-muted-light"
                          }`}
                        >
                          {step.num}
                        </span>
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-500 ${
                            isActive
                              ? "bg-homera-terracotta/12 text-homera-terracotta"
                              : "bg-muted/10 text-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                          {step.narrative}
                        </p>

                        {/* Le détail technique n’apparaît que sur l’étape dominante */}
                        <div
                          className="grid transition-[grid-template-rows,opacity] duration-[650ms] ease-[cubic-bezier(.22,.61,.28,1)]"
                          style={{
                            gridTemplateRows: isActive ? "1fr" : "0fr",
                            opacity: isActive ? 1 : 0,
                          }}
                        >
                          <div className="overflow-hidden">
                            <p className="pt-3 text-[11.5px] uppercase tracking-[0.12em] text-homera-terracotta">
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

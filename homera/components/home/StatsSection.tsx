"use client";
import { MapPin, ShieldCheck, UserCheck, Users, type LucideIcon } from "lucide-react";
import { DEMO_DATA, STATS, type Stat } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
import { useCountUp, useInView, useMotionPreferences } from "@/lib/motion";
import { formatNumber } from "@/lib/format";
/* ================================================================== HOMERA — EN QUELQUES CHIFFRES ------------------------------------------------------------------ Les chiffres entrent en scène, comptent depuis zéro et s’arrêtent net sur leur valeur. Chaque compteur est déclenché par sa propre entrée dans le viewport, jamais tous en même temps. ⚠️ Valeurs de démonstration : elles se modifient dans lib/content.ts (`STATS`) et sont signalées comme telles tant que `DEMO_DATA` est actif — aucun chiffre réel n’est affirmé. ================================================================== */ const ICONS: Record<
  Stat["icon"],
  LucideIcon
> = { shield: ShieldCheck, "user-check": UserCheck, users: Users, "map-pin": MapPin };
export function StatsSection() {
  return (
    <section
      id="chiffres"
      className="homera-scene homera-stats scene-bg-plain relative pt-4 pb-20 sm:pt-8 sm:pb-24"
      aria-labelledby="chiffres-titre"
    >
      {" "}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {" "}
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.4fr] lg:gap-16">
          {" "}
          {/* Colonne éditoriale */}{" "}
          <div className="lg:pt-4">
            {" "}
            <SceneHeader
              index="02"
              eyebrow="Repères"
              title={<span id="chiffres-titre">HOMERA en quelques chiffres</span>}
              intro="Une dynamique au service de la sécurité immobilière et de la lisibilité du marché béninois."
            />{" "}
            {DEMO_DATA && (
              <Reveal delay={260} y={14} className="mt-8">
                {" "}
                <p className="flex items-start gap-2 text-caption leading-relaxed text-muted-light">
                  {" "}
                  <span aria-hidden="true" className="mt-[6px] h-1 w-6 shrink-0 bg-homera-terracotta/40" /> Données de
                  démonstration du système pilote HOMERA — remplacées par les chiffres réels de la plateforme à la
                  mise en production.{" "}
                </p>{" "}
              </Reveal>
            )}{" "}
          </div>{" "}
          {/* Compteurs */}{" "}
          <div className="relative">
            {" "}
            <div
              aria-hidden="true"
              className="absolute -top-2 left-0 right-0 hidden h-px bg-[linear-gradient(90deg,transparent,var(--homera-hairline)_10%,var(--homera-hairline)_90%,transparent)] sm:block"
            />{" "}
            <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
              {" "}
              {STATS.map((stat, index) => (
                <StatCell key={stat.label} stat={stat} index={index} />
              ))}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
function StatCell({ stat, index }: { stat: Stat; index: number }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.45 });
  const { reduced } = useMotionPreferences();
  const display = useCountUp(stat.value, { active: inView, reduced, duration: 1650, delay: index * 110 });
  const Icon = ICONS[stat.icon];
  return (
    <Reveal
      delay={index * 110}
      y={30}
      className="border-t border-border/70"
      style={{ paddingTop: "1.75rem", paddingBottom: "1.75rem" }}
    >
      {" "}
      <div ref={ref} className="group relative sm:px-1">
        {" "}
        {/* Trait de progression : dessiné une fois le chiffre atteint */}{" "}
        <span
          aria-hidden="true"
          className="absolute -top-[1px] left-0 h-px w-full origin-left bg-homera-terracotta"
          style={{
            transform: inView ? "scaleX(1)" : "scaleX(0)",
            transition: "transform 1400ms var(--homera-ease) 120ms",
          }}
        />{" "}
        <div className="flex items-start justify-between gap-4">
          {" "}
          <p className="homera-num font-serif text-figure text-homera-brown transition-colors duration-500 group-hover:text-homera-terracotta sm:text-figure-lg dark:text-homera-terracotta">
            {" "}
            <span className="sr-only">
              {stat.prefix ?? ""}
              {formatNumber(stat.value)}
              {stat.suffix ?? ""}
            </span>{" "}
            <span aria-hidden="true" className="homera-stat-value">
              {" "}
              <span className="homera-stat-reserve">
                {stat.prefix ?? ""}
                {formatNumber(stat.value)}
                {stat.suffix ?? ""}
              </span>{" "}
              <span className="homera-stat-live">
                {stat.prefix ?? ""}
                {formatNumber(display)}
                {stat.suffix ?? ""}
              </span>{" "}
            </span>{" "}
          </p>{" "}
          <Icon
            aria-hidden="true"
            className="mt-2 h-4 w-4 shrink-0 text-homera-terracotta/70 transition-transform duration-500 ease-standard group-hover:-translate-y-0.5 group-hover:scale-110"
          />{" "}
        </div>{" "}
        <h3 className="mt-4 text-body-sm font-semibold leading-snug text-foreground"> {stat.label} </h3>{" "}
        <p className="mt-2 max-w-[22rem] text-note leading-relaxed text-muted"> {stat.description} </p>{" "}
      </div>{" "}
    </Reveal>
  );
}

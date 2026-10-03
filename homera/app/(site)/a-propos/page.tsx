import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Check,
  FileText,
  Globe,
  Handshake,
  Lock,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { DEMO_DATA, DOSSIER, PILLARS, STATS, VERIFICATION_STEPS } from "@/lib/content";
import { formatNumber } from "@/lib/format";
import { ABOUT_SECTIONS } from "@/lib/nav";
import { ABOUT_PAGE } from "@/lib/pages";
import { PageHero } from "@/components/catalog/PageHero";
import { Reveal } from "@/components/ui/Reveal";
/* ================================================================== /a-propos — POURQUOI HOMERA EXISTE ------------------------------------------------------------------ La page raconte la méthode avant de parler de chiffres : le protocole de vérification, les convictions, puis les repères — explicitement marqués comme données de démonstration tant que l’API ne fournit pas les chiffres réels. ================================================================== */ export const metadata: Metadata =
  {
    title: "À propos de HOMERA — la plateforme immobilière de confiance au Bénin",
    description:
      "Notre mission, notre protocole de vérification en sept étapes et nos convictions : structurer le marché immobilier béninois autour d’un bien, d’un identifiant et d’un dossier traçable.",
  };
const STEP_ICONS = {
  file: FileText,
  lock: Lock,
  search: Search,
  user: UserCheck,
  shield: ShieldCheck,
  check: Check,
  award: Award,
};
const PILLAR_ICONS = { shield: ShieldCheck, "user-check": UserCheck, globe: Globe, handshake: Handshake };
const STAT_ICONS = { shield: ShieldCheck, "user-check": UserCheck, users: Users, "map-pin": Globe };
export default function AProposPage() {
  return (
    <>
      {" "}
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: ABOUT_PAGE.breadcrumb }]}
        eyebrow={ABOUT_PAGE.hero.eyebrow}
        title={ABOUT_PAGE.hero.title}
        intro={ABOUT_PAGE.hero.intro}
        actions={
          <>
            {" "}
            <Link
              href="/explorer"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white transition-colors "
            >
              {" "}
              {ABOUT_PAGE.hero.primaryAction} <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
            </Link>{" "}
            <Link
              href="/contact"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-border px-5 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              {" "}
              {ABOUT_PAGE.hero.secondaryAction}{" "}
            </Link>{" "}
          </>
        }
      />{" "}
      {/* ---------------- Sommaire ---------------- */}{" "}
      <nav aria-label={ABOUT_PAGE.jumpNavLabel} className="border-b border-border bg-card/40">
        {" "}
        <ul className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 py-5 sm:px-6 lg:px-8">
          {" "}
          {ABOUT_SECTIONS.map((section) => (
            <li key={section.id}>
              {" "}
              <a
                href={`#${section.id}`}
                className="homera-press inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
              >
                {" "}
                {section.label}{" "}
              </a>{" "}
            </li>
          ))}{" "}
        </ul>{" "}
      </nav>{" "}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {" "}
        {/* ---------------- Mission ---------------- */}{" "}
        <section id="mission" aria-labelledby="mission-titre" className="scroll-mt-28">
          {" "}
          <h2 id="mission-titre" className="font-serif text-display-sm">
            {ABOUT_PAGE.mission.title}
          </h2>{" "}
          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr]">
            {" "}
            <div className="space-y-4 text-body-sm leading-relaxed text-muted sm:text-body">
              {" "}
              {ABOUT_PAGE.mission.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}{" "}
              <p className="text-foreground">{DOSSIER.note}</p>{" "}
            </div>{" "}
            <Reveal y={18} duration={720} className="rounded-card border border-border bg-card p-6">
              {" "}
              <p className="text-label uppercase text-muted">{ABOUT_PAGE.mission.reference.label}</p>{" "}
              <p className="homera-num mt-3 font-mono text-display-xs text-foreground">{DOSSIER.reference}</p>{" "}
              <p className="mt-3 text-note leading-relaxed text-muted"> {ABOUT_PAGE.mission.reference.intro} </p>{" "}
              <ul className="mt-5 space-y-2 border-t border-border pt-4 text-note text-muted">
                {" "}
                {DOSSIER.fields.slice(0, 4).map((field) => (
                  <li key={field.id} className="flex items-center justify-between gap-4">
                    {" "}
                    <span>{field.label}</span> <span className="text-right text-foreground">{field.value}</span>{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
            </Reveal>{" "}
          </div>{" "}
        </section>{" "}
        {/* ---------------- Protocole ---------------- */}{" "}
        <section id="protocole" aria-labelledby="protocole-titre" className="mt-20 scroll-mt-28">
          {" "}
          <h2 id="protocole-titre" className="font-serif text-display-sm">
            {ABOUT_PAGE.protocol.title}
          </h2>{" "}
          <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-muted">{ABOUT_PAGE.protocol.intro}</p>{" "}
          <ol className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {" "}
            {VERIFICATION_STEPS.map((step, index) => {
              const Icon = STEP_ICONS[step.icon];
              return (
                <Reveal key={step.num} as="li" y={18} delay={index * 60} className="border-t border-border pt-5">
                  {" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <span className="homera-num font-serif text-display-xs homera-accent-ink">{step.num}</span>{" "}
                    <Icon className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />{" "}
                  </div>{" "}
                  <h3 className="mt-3 text-body font-medium text-foreground">{step.title}</h3>{" "}
                  <p className="mt-2 text-body-sm leading-relaxed text-muted">{step.narrative}</p>{" "}
                  <p className="mt-2 text-caption leading-relaxed text-muted-light">{step.detail}</p>{" "}
                </Reveal>
              );
            })}{" "}
            <li className="border-t border-border pt-5">
              {" "}
              <p className="text-body-sm leading-relaxed text-muted">{ABOUT_PAGE.protocol.closing.text}</p>{" "}
              <Link
                href="/contact"
                className="homera-underline mt-3 inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink"
              >
                {" "}
                {ABOUT_PAGE.protocol.closing.action} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />{" "}
              </Link>{" "}
            </li>{" "}
          </ol>{" "}
        </section>{" "}
        {/* ---------------- Piliers ---------------- */}{" "}
        <section id="piliers" aria-labelledby="piliers-titre" className="mt-20 scroll-mt-28">
          {" "}
          <h2 id="piliers-titre" className="font-serif text-display-sm">
            {ABOUT_PAGE.pillars.title}
          </h2>{" "}
          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {" "}
            {PILLARS.map((pillar, index) => {
              const Icon = PILLAR_ICONS[pillar.icon as keyof typeof PILLAR_ICONS] ?? ShieldCheck;
              return (
                <Reveal
                  key={pillar.title}
                  as="li"
                  y={18}
                  delay={index * 70}
                  className="rounded-card border border-border bg-card p-5"
                >
                  {" "}
                  <Icon className="h-5 w-5 text-homera-terracotta" aria-hidden="true" />{" "}
                  <h3 className="mt-4 font-serif text-display-xs">{pillar.title}</h3>{" "}
                  <p className="mt-2 text-note leading-relaxed text-muted">{pillar.description}</p>{" "}
                </Reveal>
              );
            })}{" "}
          </ul>{" "}
        </section>{" "}
        {/* ---------------- Chiffres ---------------- */}{" "}
        <section id="chiffres" aria-labelledby="chiffres-titre" className="mt-20 scroll-mt-28">
          {" "}
          <h2 id="chiffres-titre" className="font-serif text-display-sm">
            {ABOUT_PAGE.stats.title}
          </h2>{" "}
          {DEMO_DATA && (
            <p className="mt-3 max-w-2xl rounded-2xl border border-homera-terracotta/25 bg-homera-terracotta/[0.06] px-4 py-3 text-note leading-relaxed text-foreground">
              {" "}
              {ABOUT_PAGE.stats.notice}{" "}
            </p>
          )}{" "}
          <dl className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {" "}
            {STATS.map((stat) => {
              const Icon = STAT_ICONS[stat.icon] ?? ShieldCheck;
              return (
                <div key={stat.label} className="border-t border-border pt-5">
                  {" "}
                  <Icon className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />{" "}
                  <dd className="homera-num mt-3 font-serif text-figure text-foreground">
                    {" "}
                    {stat.prefix} {formatNumber(stat.value)}{" "}
                  </dd>{" "}
                  <dt className="mt-2 text-body font-medium text-foreground">{stat.label}</dt>{" "}
                  <p className="mt-1 text-note leading-relaxed text-muted">{stat.description}</p>{" "}
                </div>
              );
            })}{" "}
          </dl>{" "}
        </section>{" "}
      </div>{" "}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";
import { SERVICES } from "@/lib/content";
import { SERVICES_PAGE } from "@/lib/pages";
import { PageHero } from "@/components/catalog/PageHero";
import { serviceHref } from "@/components/site/ServiceDetail";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
/* ================================================================== /services — L’ÉCOSYSTÈME AUTOUR DU BIEN ------------------------------------------------------------------ Quatre métiers, une seule promesse : quelqu’un d’identifié prend en charge ce qui se passe après la remise des clés. Les demandes partent par e-mail — aucun formulaire ne prétend envoyer quelque chose qu’aucun serveur ne reçoit encore. ================================================================== */ export const metadata: Metadata =
  {
    title: "Services immobiliers au Bénin — gestion, maintenance, déménagement, travaux | HOMERA",
    description:
      "Gestion locative, maintenance, déménagement et travaux : les services HOMERA autour d’un bien au Bénin, avec intervention suivie et compte rendu.",
  };
export default function ServicesPage() {
  return (
    <>
      {" "}
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: SERVICES_PAGE.breadcrumb }]}
        eyebrow={SERVICES_PAGE.hero.eyebrow}
        title={SERVICES_PAGE.hero.title}
        intro={SERVICES_PAGE.hero.intro}
        facts={[
          { label: SERVICES_PAGE.hero.facts[0], value: String(SERVICES.length) },
          { label: SERVICES_PAGE.hero.facts[1], value: SERVICES_PAGE.hero.zones },
        ]}
        actions={
          <>
            {" "}
            <Link
              href="/contact"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white transition-colors "
            >
              {" "}
              {SERVICES_PAGE.hero.primaryAction} <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
            </Link>{" "}
            <Link
              href={SERVICES_PAGE.jumpNav.href}
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-border px-5 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              {" "}
              {SERVICES_PAGE.hero.secondaryAction}{" "}
            </Link>{" "}
          </>
        }
      />{" "}
      {/* ---------------- Sommaire ---------------- */}{" "}
      <nav aria-label={SERVICES_PAGE.jumpNav.label} className="border-b border-border bg-card/40">
        {" "}
        <ul className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 py-5 sm:px-6 lg:px-8">
          {" "}
          {SERVICES.map((service) => (
            <li key={service.id}>
              {" "}
              <a
                href={`#${service.id}`}
                className="homera-press inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
              >
                {" "}
                <span className="homera-num text-caption text-muted">{service.index}</span> {service.title}{" "}
              </a>{" "}
            </li>
          ))}{" "}
        </ul>{" "}
      </nav>{" "}
      {/* ---------------- Les quatre métiers ---------------- */}{" "}
      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 lg:px-8">
        {" "}
        {SERVICES.map((service, index) => (
          <section
            key={service.id}
            id={service.id}
            aria-labelledby={`${service.id}-titre`}
            className="grid scroll-mt-28 grid-cols-1 items-start gap-10 lg:grid-cols-2"
          >
            {" "}
            <Reveal
              y={0}
              blur={0}
              clip
              clipRadius={24}
              duration={900}
              className={index % 2 === 1 ? "lg:order-2" : ""}
            >
              {" "}
              <Visual
                mediaKey={service.media}
                alt={service.alt}
                sizes="(min-width: 1024px) 46vw, 92vw"
                veil="none"
                quality={72}
                className="aspect-[4/3] w-full rounded-media"
              />{" "}
            </Reveal>{" "}
            <div className={index % 2 === 1 ? "lg:order-1" : ""}>
              {" "}
              <p className="homera-num text-caption font-semibold tracking-[0.3em] homera-accent-ink">
                {service.index}
              </p>{" "}
              <h2 id={`${service.id}-titre`} className="mt-3 font-serif text-display-sm">
                {" "}
                {service.title}{" "}
              </h2>{" "}
              <p className="mt-4 max-w-xl text-body-sm leading-relaxed text-muted">{service.description}</p>{" "}
              <ul className="mt-6 space-y-3">
                {" "}
                {service.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-body-sm leading-relaxed text-foreground">
                    {" "}
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" /> {bullet}{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {" "}
                <Link
                  href={serviceHref(service.id)}
                  className="homera-press inline-flex min-h-10 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
                >
                  {" "}
                  Voir la fiche dédiée <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                </Link>{" "}
                <Link
                  href={`/contact?sujet=${service.id}`}
                  className="homera-underline inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink"
                >
                  {" "}
                  {SERVICES_PAGE.serviceAction(service.title)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                </Link>{" "}
              </div>{" "}
            </div>{" "}
          </section>
        ))}{" "}
      </div>{" "}
      {/* ---------------- Comment ça se passe ---------------- */}{" "}
      <section id={SERVICES_PAGE.process.id} className="scroll-mt-28 border-t border-border bg-card/40">
        {" "}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {" "}
          <h2 className="font-serif text-display-sm">{SERVICES_PAGE.process.title}</h2>{" "}
          <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-muted"> {SERVICES_PAGE.process.intro} </p>{" "}
          <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {" "}
            {SERVICES_PAGE.process.steps.map((step) => (
              <li key={step.num} className="border-t border-border pt-5">
                {" "}
                <span className="homera-num font-serif text-display-sm homera-accent-ink">{step.num}</span>{" "}
                <h3 className="mt-3 text-body font-medium text-foreground">{step.title}</h3>{" "}
                <p className="mt-2 text-body-sm leading-relaxed text-muted">{step.detail}</p>{" "}
              </li>
            ))}{" "}
          </ol>{" "}
          <p className="mt-10 inline-flex items-center gap-2 text-note text-muted">
            {" "}
            <Mail className="h-4 w-4 text-homera-terracotta" aria-hidden="true" /> {SERVICES_PAGE.process.note}{" "}
          </p>{" "}
        </div>{" "}
      </section>{" "}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/catalog/ContactForm";
import { PageHero } from "@/components/catalog/PageHero";
import { CONTACT_PAGE } from "@/lib/pages";
import type { NextSearchParams } from "@/lib/search-params";
/* ================================================================== /contact — PARLER À QUELQU’UN ------------------------------------------------------------------ Une page utile plutôt qu’un formulaire qui ne part nulle part : les coordonnées réelles, les horaires, et un message composé dans le client de messagerie du visiteur, référence du bien incluse. ================================================================== */ export const metadata: Metadata =
  {
    title: "Contact — HOMERA Bénin",
    description:
      "Contacter HOMERA : demander une visite, poser une question sur un bien, faire vérifier un dossier ou solliciter un devis de service. Cotonou, Abomey-Calavi, Porto-Novo, Ouidah.",
  }; /** Les icônes restent dans la page : lib/pages.ts ne contient que du texte. */
const CHANNEL_ICONS = { "map-pin": MapPin, phone: Phone, mail: Mail, clock: Clock } as const;
export default async function ContactPage({ searchParams }: { searchParams: Promise<NextSearchParams> }) {
  const params = await searchParams;
  const rawReference = params.bien;
  const reference = typeof rawReference === "string" ? rawReference.toUpperCase() : "";
  const rawSubject = params.sujet;
  const subjectKey = typeof rawSubject === "string" ? rawSubject : "";
  return (
    <>
      {" "}
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: CONTACT_PAGE.breadcrumb }]}
        eyebrow={CONTACT_PAGE.hero.eyebrow}
        title={CONTACT_PAGE.hero.title}
        intro={CONTACT_PAGE.hero.intro}
        actions={
          <>
            {" "}
            <Link
              href="/explorer"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-border bg-card px-5 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              {" "}
              {CONTACT_PAGE.hero.primaryAction} <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
            </Link>{" "}
            <Link
              href="/services"
              className="homera-underline inline-flex min-h-12 items-center gap-2 text-body-sm font-medium homera-accent-ink"
            >
              {" "}
              {CONTACT_PAGE.hero.secondaryAction}{" "}
            </Link>{" "}
          </>
        }
      />{" "}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:px-8">
        {" "}
        <section aria-labelledby="contact-formulaire">
          {" "}
          <h2 id="contact-formulaire" className="font-serif text-display-sm">
            {CONTACT_PAGE.form.title}
          </h2>{" "}
          <p className="mt-3 max-w-xl text-body-sm leading-relaxed text-muted">
            {" "}
            {reference ? CONTACT_PAGE.form.introWithReference(reference) : CONTACT_PAGE.form.intro}{" "}
          </p>{" "}
          <div className="mt-8">
            {" "}
            <ContactForm defaultReference={reference} defaultSubject={CONTACT_PAGE.subjects[subjectKey] ?? ""} />{" "}
          </div>{" "}
        </section>{" "}
        <aside className="space-y-6">
          {" "}
          <div className="rounded-card border border-border bg-card p-6">
            {" "}
            <h2 className="text-label uppercase text-muted">{CONTACT_PAGE.channelsTitle}</h2>{" "}
            <ul className="mt-4 space-y-5">
              {" "}
              {CONTACT_PAGE.channels.map((channel) => {
                const Icon = CHANNEL_ICONS[channel.icon as keyof typeof CHANNEL_ICONS] ?? MapPin;
                return (
                  <li key={channel.label} className="flex items-start gap-3">
                    {" "}
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />{" "}
                    <div>
                      {" "}
                      <p className="text-caption uppercase tracking-[0.14em] text-muted">{channel.label}</p>{" "}
                      <p className="homera-num mt-0.5 text-body-sm font-medium text-foreground">{channel.value}</p>{" "}
                      {"note" in channel && channel.note && (
                        <p className="mt-0.5 text-caption text-muted-light">{channel.note}</p>
                      )}{" "}
                    </div>{" "}
                  </li>
                );
              })}{" "}
            </ul>{" "}
          </div>{" "}
          <div className="rounded-card border border-homera-terracotta/25 bg-homera-terracotta/[0.06] p-6">
            {" "}
            <h2 className="inline-flex items-center gap-2 font-serif text-display-xs">
              {" "}
              <ShieldCheck className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />{" "}
              {CONTACT_PAGE.verification.title}{" "}
            </h2>{" "}
            <p className="mt-2 text-note leading-relaxed text-muted">{CONTACT_PAGE.verification.text}</p>{" "}
            <Link
              href={CONTACT_PAGE.verification.href}
              className="homera-underline mt-4 inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink"
            >
              {" "}
              {CONTACT_PAGE.verification.action} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />{" "}
            </Link>{" "}
          </div>{" "}
          <p className="text-caption leading-relaxed text-muted">{CONTACT_PAGE.honesty}</p>{" "}
        </aside>{" "}
      </div>{" "}
    </>
  );
}

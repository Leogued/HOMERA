import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, Heart, KeyRound, Search, UserRound } from "lucide-react";
import { PageHero } from "@/components/catalog/PageHero";
import { SESSION_PAGE } from "@/lib/pages";

/* ==================================================================
   /connexion — L’ESPACE CONNECTÉ, ANNONCÉ SANS LE SIMULER
   ------------------------------------------------------------------
   Tout ce qui est public se consulte sans compte : recherche, fiches,
   catégories, services, contact — et, depuis la phase 2, les favoris et
   les recherches enregistrées, conservés dans le navigateur du visiteur.

   La page sépare donc deux colonnes honnêtes : ce qui fonctionne déjà
   (avec un lien pour y aller), et ce que le compte apportera en plus
   (synchronisation, alertes, suivi de dossier, espace propriétaire).
   Aucun faux formulaire d’inscription.
   ================================================================== */

export const metadata: Metadata = {
  title: "Espace personnel — HOMERA",
  description:
    "L’espace personnel HOMERA arrive : synchronisation des favoris, alertes, demandes de visite et suivi de dossier. En attendant, tout le catalogue se consulte sans compte.",
};

/** Les pictogrammes restent ici : lib/pages.ts ne contient que du texte. */
const AVAILABLE_ICONS = { heart: Heart, search: Search } as const;
const FEATURE_ICONS = { bell: Bell, calendar: CalendarCheck, key: KeyRound } as const;

export default function ConnexionPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: SESSION_PAGE.breadcrumb }]}
        eyebrow={SESSION_PAGE.hero.eyebrow}
        title={SESSION_PAGE.hero.title}
        intro={SESSION_PAGE.hero.intro}
        actions={
          <>
            <Link
              href="/explorer"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white transition-colors"
            >
              {SESSION_PAGE.hero.primaryAction}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-border px-5 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              {SESSION_PAGE.hero.secondaryAction}
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* --- Ce qui marche déjà, et où le trouver --- */}
        <h2 className="font-serif text-display-sm">{SESSION_PAGE.availableTitle}</h2>
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {SESSION_PAGE.available.map((item) => {
            const Icon = AVAILABLE_ICONS[item.icon];
            return (
              <li key={item.id} className="flex flex-col rounded-card border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-homera-terracotta" aria-hidden="true" />
                <h3 className="mt-4 font-serif text-display-xs">{item.title}</h3>
                <p className="mt-2 text-note leading-relaxed text-muted">{item.detail}</p>
                <Link
                  href={item.href}
                  className="homera-underline mt-4 inline-flex min-h-10 items-center gap-2 self-start text-note font-medium homera-accent-ink"
                >
                  {item.action}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* --- Ce que le compte ajoutera --- */}
        <h2 className="mt-16 font-serif text-display-sm">{SESSION_PAGE.featuresTitle}</h2>
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SESSION_PAGE.features.map((feature) => {
            const Icon = FEATURE_ICONS[feature.icon];
            return (
              <li key={feature.id} className="rounded-card border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-homera-terracotta" aria-hidden="true" />
                <h3 className="mt-4 font-serif text-display-xs">{feature.title}</h3>
                <p className="mt-2 text-note leading-relaxed text-muted">{feature.detail}</p>
              </li>
            );
          })}
        </ul>

        <div className="mt-14 flex flex-col gap-4 rounded-card border border-border bg-card/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-body-sm leading-relaxed text-muted">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />
            {SESSION_PAGE.notice}
          </p>
          <Link
            href="/explorer"
            className="homera-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            {SESSION_PAGE.noticeAction}
          </Link>
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/catalog/PageHero";
import { LEGAL_PAGE } from "@/lib/pages";

/* ==================================================================
   /legal — MENTIONS, CONFIDENTIALITÉ, CONDITIONS
   ------------------------------------------------------------------
   Trois textes courts, honnêtes sur leur statut : le système pilote
   n’enregistre aucune donnée personnelle (pas de compte, pas de
   formulaire serveur, pas de mesure d’audience). Ce qui existe
   localement est décrit précisément — clé comprise — et ce qui devra
   être rédigé avant l’ouverture des comptes est annoncé.
   ================================================================== */

export const metadata: Metadata = {
  title: "Mentions légales, confidentialité et conditions | HOMERA",
  description:
    "Mentions légales, politique de confidentialité et conditions générales d’utilisation de la plateforme HOMERA (système pilote).",
};

export default function LegalPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: LEGAL_PAGE.breadcrumb }]}
        eyebrow={LEGAL_PAGE.hero.eyebrow}
        title={LEGAL_PAGE.hero.title}
        intro={LEGAL_PAGE.hero.intro}
      />

      <nav aria-label={LEGAL_PAGE.jumpNavLabel} className="border-b border-border bg-card/40">
        <ul className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 py-5 sm:px-6 lg:px-8">
          {LEGAL_PAGE.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="homera-press inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto max-w-3xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
        {LEGAL_PAGE.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-titre`} className="scroll-mt-28">
            <h2 id={`${section.id}-titre`} className="font-serif text-display-sm">
              {section.title}
            </h2>
            <div className="mt-5 space-y-4 text-body-sm leading-relaxed text-muted">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
              {/* La clé de stockage est citée telle quelle : le visiteur peut la retrouver. */}
              {section.id === "confidentialite" && (
                <p className="homera-num rounded-card border border-border bg-card px-4 py-3 font-mono text-note text-foreground">
                  {LEGAL_PAGE.storageKey}
                </p>
              )}
            </div>
          </section>
        ))}

        <p className="border-t border-border pt-8 text-note leading-relaxed text-muted">
          {LEGAL_PAGE.closing}{" "}
          <Link href="/contact" className="homera-underline font-medium homera-accent-ink">
            {LEGAL_PAGE.closingAction}
          </Link>
          .
        </p>
      </div>
    </>
  );
}

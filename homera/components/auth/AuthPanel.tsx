import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PageHero } from "@/components/catalog/PageHero";

/* ==================================================================
   HOMERA — CADRE DES ÉCRANS DE COMPTE
   ------------------------------------------------------------------
   Les cinq écrans d’authentification partagent le même cadre que les
   autres pages publiques : fil d’Ariane, surtitre, titre, chapeau, puis
   une grille à deux colonnes. Le panneau de gauche porte le formulaire,
   celui de droite explique ce que le compte engage — jamais l’inverse,
   jamais un formulaire orphelin au milieu du vide.
   ================================================================== */

export function AuthShell({
  crumb,
  eyebrow,
  title,
  intro,
  facts,
  aside,
  children,
}: {
  crumb: string;
  eyebrow: string;
  title: string;
  intro: string;
  facts?: { label: string; value: string }[];
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: crumb }]}
        eyebrow={eyebrow}
        title={title}
        intro={intro}
        facts={facts}
      />
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div className="min-w-0">{children}</div>
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">{aside}</aside>
        </div>
      </div>
    </>
  );
}

/** Le panneau du formulaire : titre, contenu, puis sorties secondaires. */
export function AuthPanel({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
      <h2 className="font-serif text-display-sm text-foreground">{title}</h2>
      {intro ? <p className="mt-2 text-note leading-relaxed text-muted">{intro}</p> : null}
      <div className="mt-7">{children}</div>
      {footer ? <div className="mt-7 border-t border-border pt-5">{footer}</div> : null}
    </section>
  );
}

/** Titre de la colonne latérale, sur le ton des étiquettes du site. */
export function AuthAsideTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-label uppercase text-muted">{children}</h2>;
}

/** Liste de bénéfices — coche discrète, texte lisible. */
export function AuthBenefits({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-note leading-relaxed text-muted">
          <Check className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-homera-terracotta" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Renvoi vers un autre écran de compte, toujours lisible et cliquable. */
export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="homera-underline inline-flex min-h-10 items-center gap-1.5 text-note font-medium homera-accent-ink"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

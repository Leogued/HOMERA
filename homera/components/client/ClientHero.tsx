import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/* ==================================================================
   HOMERA — HERO COMMUN DES PAGES CLIENT
   ------------------------------------------------------------------
   Un bandeau unique pour les pages secondaires de l’espace client :
   œil-de-bœuf terracotta, titre serif, rappel factuel et, à droite,
   les chiffres réels de la page plus ses actions. Les pages qui ont
   leur propre décor (tableau de bord, favoris) gardent le leur.
   ================================================================== */

export type ClientHeroStat = {
  icon: LucideIcon;
  value: string;
  label: string;
};

export function ClientHero({
  eyebrow,
  title,
  description,
  stats = [],
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  stats?: ClientHeroStat[];
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-homera-terracotta">{eyebrow}</p>
          <h1 className="mt-2 font-serif text-display-md sm:text-display-lg">{title}</h1>
          {description && <p className="mt-3 max-w-xl text-body-sm leading-relaxed text-muted">{description}</p>}
          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {stats.length > 0 && (
          <dl className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-36 rounded-2xl border border-border bg-background/70 px-4 py-3">
                <dt className="flex items-center gap-1.5 text-caption font-medium text-muted">
                  <stat.icon className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                  {stat.label}
                </dt>
                <dd className="homera-num mt-1 font-serif text-display-xs text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </header>
  );
}

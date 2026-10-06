import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ShieldCheck } from "lucide-react";
import { PROJECT_DECISION_GUIDES } from "@/lib/editorial-guides";
import { countLabel, formatFCFA } from "@/lib/format";
import { PER_PAGE, isPristine, parseCatalogQuery, searchCatalog } from "@/lib/properties";
import { categoryQuery, projectQuery, type PublicProjectPage } from "@/lib/nav";
import { searchParamsToQuery, type NextSearchParams } from "@/lib/search-params";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { PageHero } from "@/components/catalog/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
/* ================================================================== HOMERA — PAGE DE PROJET (Acheter · Louer · Séjour) ------------------------------------------------------------------ Une page de projet n’est pas un simple filtre : elle explique ce que le visiteur vient chercher, montre les catégories réellement disponibles (avec leur nombre de biens), puis affiche le catalogue complet du projet, filtrable sur place. ================================================================== */ export async function ProjectPageView({
  project,
  searchParams,
}: {
  project: PublicProjectPage;
  searchParams: NextSearchParams;
}) {
  const query = parseCatalogQuery(searchParamsToQuery(searchParams));
  const initialQuery = { ...projectQuery(project.slug), ...query, intent: project.slug };
  const results = searchCatalog(initialQuery);
  const prices = results.map((property) => property.price);
  const cities = new Set(results.map((property) => property.city));
  const initialVisible = Math.min(4, Math.max(1, query.page)) * PER_PAGE;
  const decisionGuide = PROJECT_DECISION_GUIDES[project.slug];
  return (
    <>
      {" "}
      <PageHero
        tone="media"
        mediaKey="page-cotonou"
        mediaAlt="Vue de Cotonou au coucher du soleil, toitures, cocotiers et lagune à l’horizon"
        crumbs={[{ label: "Accueil", href: "/" }, { label: project.navLabel }]}
        eyebrow={project.eyebrow}
        title={project.title}
        intro={project.intro}
        facts={[
          { label: "Biens disponibles", value: String(results.length) },
          { label: "Communes couvertes", value: String(cities.size) },
          { label: "Prix d’appel", value: prices.length ? formatFCFA(Math.min(...prices)) : "—" },
        ]}
        actions={
          <>
            {" "}
            <Link
              href={`/explorer?intention=${project.slug}`}
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta-night px-5 text-body-sm font-medium text-white transition-colors hover:bg-homera-terracotta-light"
            >
              {" "}
              Ouvrir dans l’explorateur <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
            </Link>{" "}
            <Link
              href="/contact"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-white/25 px-5 text-body-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {" "}
              Parler à un conseiller{" "}
            </Link>{" "}
          </>
        }
      />{" "}
      {/* ---------------- Catégories ---------------- */}{" "}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="projet-categories">
        {" "}
        <h2 id="projet-categories" className="font-serif text-display-sm">
          {" "}
          Parcourir par catégorie{" "}
        </h2>{" "}
        <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-muted">
          {" "}
          Chaque catégorie ouvre une page de résultats déjà filtrée — vous pouvez ensuite ajuster commune, budget et
          surface sans repartir de zéro.{" "}
        </p>{" "}
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {" "}
          {project.categories.map((category, index) => {
            const categoryResults = searchCatalog(categoryQuery(category.filter));
            const cheapest = categoryResults.reduce(
              (lowest, property) => (lowest === null || property.price < lowest ? property.price : lowest),
              null as number | null,
            );
            return (
              <Reveal key={category.slug} as="li" y={18} delay={index * 70} className="h-full">
                {" "}
                <Link
                  href={`/${project.slug}/${category.slug}`}
                  className="homera-lift flex h-full flex-col rounded-card border border-border bg-card p-5 transition-colors hover:border-homera-terracotta/40"
                >
                  {" "}
                  <span className="text-caption uppercase tracking-[0.16em] homera-accent-ink">
                    {category.hint}
                  </span>{" "}
                  <h3 className="mt-3 font-serif text-display-xs">{category.label}</h3>{" "}
                  <p className="mt-2 flex-1 text-note leading-relaxed text-muted">{category.intro}</p>{" "}
                  <span className="homera-num mt-4 flex items-center justify-between border-t border-border pt-4 text-caption text-muted">
                    {" "}
                    {countLabel(categoryResults.length)}{" "}
                    {cheapest !== null && <span>dès {formatFCFA(cheapest)}</span>}{" "}
                  </span>{" "}
                </Link>{" "}
              </Reveal>
            );
          })}{" "}
        </ul>{" "}
      </section>{" "}
      {/* ---------------- Ce que garantit le projet ---------------- */}{" "}
      <section className="border-y border-border bg-card/40" aria-labelledby="projet-points">
        {" "}
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8">
          {" "}
          <div>
            {" "}
            <h2 id="projet-points" className="font-serif text-display-sm">
              {" "}
              Ce que vous trouvez ici{" "}
            </h2>{" "}
            <ul className="mt-6 space-y-3">
              {" "}
              {project.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-body-sm leading-relaxed text-muted">
                  {" "}
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" /> {point}{" "}
                </li>
              ))}{" "}
            </ul>{" "}
            <p className="mt-6 inline-flex items-center gap-2 text-note font-medium homera-accent-ink">
              {" "}
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Identifiant unique et dossier de vérification
              pour chaque bien{" "}
            </p>{" "}
          </div>{" "}
          <Reveal y={0} blur={0} clip clipRadius={24} duration={900}>
            {" "}
            <Visual
              mediaKey={
                project.slug === "sejour"
                  ? "intent-sejourner"
                  : project.slug === "louer"
                    ? "intent-louer"
                    : "intent-acheter"
              }
              alt={
                project.slug === "sejour"
                  ? "Intérieur meublé lumineux ouvrant sur une terrasse"
                  : project.slug === "louer"
                    ? "Séjour d’appartement clair ouvert sur un balcon planté"
                    : "Villa familiale aux volumes contemporains avec jardin planté"
              }
              sizes="(min-width: 1024px) 46vw, 92vw"
              veil="none"
              quality={72}
              className="aspect-[4/3] w-full rounded-media"
            />{" "}
          </Reveal>{" "}
        </div>{" "}
      </section>{" "}
      {/* ---------------- Catalogue du projet ---------------- */}{" "}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="projet-catalogue">
        {" "}
        <div className="flex flex-wrap items-end justify-between gap-4">
          {" "}
          <h2 id="projet-catalogue" className="font-serif text-display-sm">
            {" "}
            {project.navLabel} : tous les biens{" "}
          </h2>{" "}
          <p className="text-caption text-muted">
            {" "}
            {isPristine(initialQuery) ? "Tous les biens du projet" : "Recherche en cours"}{" "}
          </p>{" "}
        </div>{" "}
        <div className="mt-8">
          {" "}
          <CatalogExplorer
            basePath={`/${project.slug}`}
            initialQuery={initialQuery}
            initialVisible={initialVisible}
            locked={["intent"]}
            emptyHint={`Aucun bien ne correspond à ces critères dans la rubrique ${project.navLabel}. Élargissez la recherche, ou consultez l’explorateur complet.`}
          />{" "}
        </div>{" "}
      </section>{" "}
      {/* ---------------- Guide de décision & FAQ du projet ---------------- */}
      <section className="border-t border-border bg-card/40" aria-labelledby="projet-guide">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-label uppercase homera-accent-ink">Guide pratique HOMERA</p>
            <h2 id="projet-guide" className="mt-2 font-serif text-display-sm">
              {decisionGuide.title}
            </h2>
            <p className="mt-3 text-body-sm leading-relaxed text-muted">{decisionGuide.intro}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {decisionGuide.pillars.map((pillar) => (
              <article key={pillar.title} className="rounded-card border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                <p className="homera-num text-micro font-semibold uppercase tracking-[0.16em] text-homera-terracotta">
                  {pillar.badge}
                </p>
                <h3 className="mt-3 font-serif text-display-xs text-foreground">{pillar.title}</h3>
                <p className="mt-3 text-note leading-relaxed text-muted">{pillar.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-14 border-t border-border pt-12">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-label uppercase text-muted">Questions fréquentes</p>
                <h3 className="mt-2 font-serif text-display-xs">
                  Ce qu’il faut savoir avant de {project.navLabel.toLowerCase()}
                </h3>
                <p className="mt-3 text-note leading-relaxed text-muted">
                  Vous avez une question spécifique sur un dossier ou une référence HOMERA ? Notre équipe vous répond avec les éléments du bien.
                </p>
                <Link
                  href="/contact"
                  className="homera-underline mt-5 inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink"
                >
                  Poser une question à l’équipe <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              <div className="space-y-3">
                {decisionGuide.faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-card border border-border bg-card px-5 py-4 transition-colors open:border-homera-terracotta/35"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body-sm font-medium text-foreground">
                      <span>{faq.question}</span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-homera-terracotta transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="mt-3 border-t border-border pt-3 text-note leading-relaxed text-muted">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

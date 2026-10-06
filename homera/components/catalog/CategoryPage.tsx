import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { getCategoryVerificationNote } from "@/lib/editorial-guides";
import { countLabel, formatFCFA } from "@/lib/format";
import { PER_PAGE, buildCatalogParams, isPristine, parseCatalogQuery, searchCatalog } from "@/lib/properties";
import { categoryQuery, type PublicCategory, type PublicProjectPage } from "@/lib/nav";
import { searchParamsToQuery, type NextSearchParams } from "@/lib/search-params";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { PageHero } from "@/components/catalog/PageHero";
/* ================================================================== HOMERA — PAGE D’UNE CATÉGORIE ------------------------------------------------------------------ « Acheter › Terrains », « Louer › Studios », « Séjour › À la nuitée » : une page de résultats déjà cadrée, mais qui reste filtrable (commune, budget, surface, équipements) et partageable. ================================================================== */ export async function CategoryPageView({
  project,
  category,
  searchParams,
}: {
  project: PublicProjectPage;
  category: PublicCategory;
  searchParams: NextSearchParams;
}) {
  const parsed = parseCatalogQuery(searchParamsToQuery(searchParams)); // La catégorie fixe le projet et le type ; l’adresse peut préciser le reste.
  const initialQuery = {
    ...categoryQuery(category.filter),
    ...parsed,
    intent: category.filter.intent,
    types: category.filter.types ?? [],
    stayNights: category.filter.stayNights ?? null,
  };
  const results = searchCatalog(initialQuery);
  const cheapest = results.reduce(
    (lowest, property) => (lowest === null || property.price < lowest ? property.price : lowest),
    null as number | null,
  );
  const cities = new Set(results.map((property) => property.city));
  const initialVisible = Math.min(4, Math.max(1, parsed.page)) * PER_PAGE; // Les filtres de la recherche en cours suivent d’une catégorie à l’autre
  // (hors projet, type et durée, qui appartiennent à la page d’arrivée).
  const carried = buildCatalogParams({ ...parsed, intent: "", types: [], stayNights: null, page: 1 }).toString();
  const carry = carried ? `?${carried}` : "";
  const verificationNote = getCategoryVerificationNote(project.slug, category.slug);
  return (
    <>
      {" "}
      <PageHero
        crumbs={[
          { label: "Accueil", href: "/" },
          { label: project.navLabel, href: `/${project.slug}` },
          { label: category.label },
        ]}
        eyebrow={category.hint}
        title={category.title}
        intro={category.intro}
        facts={[
          { label: "Biens disponibles", value: String(results.length) },
          { label: "Communes", value: String(cities.size) },
          { label: "À partir de", value: cheapest !== null ? formatFCFA(cheapest) : "—" },
        ]}
        actions={
          <Link
            href={`/explorer?intention=${project.slug}${carried ? `&${carried}` : ""}`}
            className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            {" "}
            Voir tout le projet {project.navLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />{" "}
          </Link>
        }
      />{" "}
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        {verificationNote && (
          <section
            aria-labelledby="categorie-reperes"
            className="mb-10 rounded-card border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-7"
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.16em] text-homera-terracotta">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Repères de sélection HOMERA
                </p>
                <h2 id="categorie-reperes" className="mt-2 font-serif text-display-xs">
                  {verificationNote.title}
                </h2>
                <p className="mt-2 text-note leading-relaxed text-muted">{verificationNote.summary}</p>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {verificationNote.checkpoints.map((checkpoint) => (
                  <li
                    key={checkpoint}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-background/70 p-4 text-caption leading-relaxed text-muted"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />
                    <span className="text-foreground">{checkpoint}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
        <CatalogExplorer
          basePath={`/${project.slug}/${category.slug}`}
          initialQuery={initialQuery}
          initialVisible={initialVisible}
          locked={category.filter.stayNights ? ["intent", "types", "stayNights"] : ["intent", "types"]}
          emptyHint={`Aucun bien ne correspond à ces critères dans « ${category.label} ». Élargissez la commune ou le budget, ou consultez la page ${project.navLabel}.`}
        />{" "}
        {/* ---------------- Autres catégories du projet ---------------- */}{" "}
        <section aria-labelledby="categorie-soeurs" className="mt-20">
          {" "}
          <h2 id="categorie-soeurs" className="font-serif text-display-xs">
            {" "}
            Autres catégories · {project.navLabel}{" "}
          </h2>{" "}
          <ul className="mt-6 flex flex-wrap gap-3">
            {" "}
            {project.categories
              .filter((entry) => entry.slug !== category.slug)
              .map((entry) => {
                const entryResults = searchCatalog(categoryQuery(entry.filter));
                return (
                  <li key={entry.slug}>
                    {" "}
                    <Link
                      href={`/${project.slug}/${entry.slug}${carry}`}
                      className="homera-press inline-flex min-h-11 items-center gap-3 rounded-full border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
                    >
                      {" "}
                      {entry.label}{" "}
                      <span className="homera-num text-caption text-muted">{countLabel(entryResults.length)}</span>{" "}
                    </Link>{" "}
                  </li>
                );
              })}{" "}
            <li>
              {" "}
              <Link
                href={`/explorer?intention=${project.slug}${carried ? `&${carried}` : ""}`}
                className="homera-underline inline-flex min-h-11 items-center gap-2 text-note font-medium homera-accent-ink"
              >
                {" "}
                Explorer tout {project.navLabel.toLowerCase()}{" "}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />{" "}
              </Link>{" "}
            </li>{" "}
          </ul>{" "}
          {!isPristine(parsed) && (
            <p className="mt-4 text-caption text-muted">
              {" "}
              Les filtres de votre recherche restent actifs dans cette catégorie : commune, budget, surface et
              équipements suivent d’une page à l’autre.{" "}
            </p>
          )}{" "}
        </section>{" "}
      </div>{" "}
    </>
  );
}

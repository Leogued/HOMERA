import type { Metadata } from "next";
import Link from "next/link";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { PageHero } from "@/components/catalog/PageHero";
import { PROJECT_PAGES } from "@/lib/nav";
import { PER_PAGE, parseCatalogQuery, searchCatalog } from "@/lib/properties";
import { searchParamsToQuery } from "@/lib/search-params";
/* ================================================================== /explorer — LA RECHERCHE PUBLIQUE ------------------------------------------------------------------ Tout ce qu’un visiteur peut consulter sans compte : la recherche, les filtres, le tri, les cartes, la pagination progressive — et une adresse qui conserve la recherche pour la partager. Le serveur rend le premier écran (utile sans JavaScript et pour le référencement) ; le client prend le relais pour le reste. ================================================================== */ export const metadata: Metadata =
  {
    title: "Explorer les biens — HOMERA",
    description:
      "Recherchez un bien vérifié au Bénin : ville, quartier, type, budget, surface et équipements. Chaque fiche indique ce qui a été contrôlé, par qui et quand.",
  };
export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseCatalogQuery(searchParamsToQuery(await searchParams));
  const results = searchCatalog(query);
  const cities = new Set(results.map((property) => property.city)); // ?page=2 est le repli sans JavaScript : on affiche alors deux écrans.
  const initialVisible = Math.min(4, Math.max(1, query.page)) * PER_PAGE;
  return (
    <>
      {" "}
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: "Explorer" }]}
        eyebrow="Recherche"
        title="Explorer les biens vérifiés"
        intro="Tous les biens publiés par HOMERA : filtrez par projet, commune, budget, surface ou équipements. Chaque fiche indique ce qui a été contrôlé, par qui et à quelle date."
        facts={[
          { label: "Biens disponibles", value: String(results.length) },
          { label: "Communes", value: String(cities.size) },
          { label: "Type de recherche", value: "Sans compte" },
        ]}
        actions={
          <>
            {" "}
            {PROJECT_PAGES.map((project) => (
              <Link
                key={project.slug}
                href={`/${project.slug}`}
                className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
              >
                {" "}
                {project.navLabel}{" "}
              </Link>
            ))}{" "}
          </>
        }
      />{" "}
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        {" "}
        <CatalogExplorer initialQuery={query} initialVisible={initialVisible} />{" "}
      </div>{" "}
    </>
  );
}

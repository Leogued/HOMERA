import type { Metadata } from "next";
import Link from "next/link";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { PageHero } from "@/components/catalog/PageHero";
import { PROJECT_PAGES } from "@/lib/nav";
import { PER_PAGE, parseCatalogQuery, queryToCatalogFilters } from "@/lib/properties";
import { searchParamsToQuery } from "@/lib/search-params";
import { catalogFacets, catalogPriceBounds, searchProperties } from "@/lib/server/services/properties";
import { getDb } from "@/lib/server/db/client";
/* ==================================================================
   /explorer — LA RECHERCHE PUBLIQUE
   ------------------------------------------------------------------
   Tout ce qu’un visiteur peut consulter sans compte : la recherche, les filtres, le tri, les
   cartes, la pagination progressive — et une adresse qui conserve la recherche pour la
   partager.
   Le serveur rend le premier écran (utile sans JavaScript et pour le référencement) ; le client
   prend le relais pour le reste.
   ================================================================== */
export const metadata: Metadata = {
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
  // Source de vérité : la base HOMERA. Filtrage, tri et pagination sont
  // calculés en SQL — le navigateur ne télécharge que la page affichée.
  const db = getDb();
  const filters = queryToCatalogFilters(query);
  // ?page=2 est le repli sans JavaScript : on rend alors deux écrans d’un coup.
  const firstPage = searchProperties(db, filters, { page: 1, perPage: Math.min(4, Math.max(1, query.page)) * PER_PAGE });
  const facets = catalogFacets(db, filters);
  const priceBounds = catalogPriceBounds(db, filters);
  return (
    <>
      {" "}
      <PageHero
        compact
        crumbs={[{ label: "Accueil", href: "/" }, { label: "Explorer" }]}
        eyebrow="Recherche"
        title="Explorer les biens vérifiés"
        intro="Tous les biens publiés par HOMERA : filtrez par projet, commune, budget, surface ou équipements. Chaque fiche indique ce qui a été contrôlé, par qui et à quelle date."
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
        <CatalogExplorer initialQuery={query} initialPage={firstPage} initialFacets={facets} initialPriceBounds={priceBounds} />{" "}
      </div>{" "}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPageView } from "@/components/catalog/CategoryPage";
import { findCategory, findProject } from "@/lib/nav";
import type { NextSearchParams } from "@/lib/search-params";
/* Page d’une catégorie de projet : /louer/<categorie>. Le contenu vient de lib/nav.ts — une seule source pour le menu, les pages de projet et ces pages de résultats. */ const PROJECT =
  "louer" as const;
export const dynamicParams = false;
export function generateStaticParams() {
  return (findProject(PROJECT)?.categories ?? []).map((category) => ({ categorie: category.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ categorie: string }> }): Promise<Metadata> {
  const { categorie } = await params;
  const found = findCategory(PROJECT, categorie);
  if (!found) return { title: "Catégorie introuvable — HOMERA" };
  return { title: `${found.category.title} — HOMERA`, description: found.category.intro };
}
export default async function CategoriePage({
  params,
  searchParams,
}: {
  params: Promise<{ categorie: string }>;
  searchParams: Promise<NextSearchParams>;
}) {
  const { categorie } = await params;
  const found = findCategory(PROJECT, categorie);
  if (!found) notFound();
  return <CategoryPageView project={found.page} category={found.category} searchParams={await searchParams} />;
}

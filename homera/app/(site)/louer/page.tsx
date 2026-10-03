import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectPageView } from "@/components/catalog/ProjectPage";
import { findProject } from "@/lib/nav";
import type { NextSearchParams } from "@/lib/search-params";
export const metadata: Metadata = {
  title: "Louer un logement au Bénin — maisons, appartements, studios, locaux | HOMERA",
  description:
    "Locations vérifiées au Bénin : maisons, appartements, studios et locaux commerciaux. Loyer, surface et statut affichés dès la fiche, visite sur créneau planifié.",
};
export default async function LouerPage({ searchParams }: { searchParams: Promise<NextSearchParams> }) {
  const project = findProject("louer");
  if (!project) notFound();
  return <ProjectPageView project={project} searchParams={await searchParams} />;
}

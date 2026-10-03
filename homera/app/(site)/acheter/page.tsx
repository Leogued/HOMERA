import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectPageView } from "@/components/catalog/ProjectPage";
import { findProject } from "@/lib/nav";
import type { NextSearchParams } from "@/lib/search-params";
export const metadata: Metadata = {
  title: "Acheter un bien au Bénin — maisons, appartements, terrains, locaux | HOMERA",
  description:
    "Biens à vendre vérifiés au Bénin : maisons et villas, appartements, terrains titrés ou sous ACD, locaux commerciaux. Chaque fiche indique ce qui a été contrôlé et quand.",
};
export default async function AcheterPage({ searchParams }: { searchParams: Promise<NextSearchParams> }) {
  const project = findProject("acheter");
  if (!project) notFound();
  return <ProjectPageView project={project} searchParams={await searchParams} />;
}

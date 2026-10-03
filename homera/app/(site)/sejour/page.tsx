import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectPageView } from "@/components/catalog/ProjectPage";
import { findProject } from "@/lib/nav";
import type { NextSearchParams } from "@/lib/search-params";
export const metadata: Metadata = {
  title: "Séjourner au Bénin — nuitée, quelques jours, courte période | HOMERA",
  description:
    "Logements meublés et équipés vérifiés au Bénin : réservation à la nuitée, pour quelques jours ou pour une courte période, avec durée minimale affichée.",
};
export default async function SejourPage({ searchParams }: { searchParams: Promise<NextSearchParams> }) {
  const project = findProject("sejour");
  if (!project) notFound();
  return <ProjectPageView project={project} searchParams={await searchParams} />;
}

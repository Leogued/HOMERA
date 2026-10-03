import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { OwnerWorkspace } from "@/components/workspace/OwnerWorkspace";

const SECTIONS = ["biens", "demandes", "visites", "locations", "agents", "documents", "abonnement", "profil", "parametres"] as const;
export const metadata: Metadata = { title: "Espace propriétaire — HOMERA", robots: { index: false, follow: false } };
export default async function OwnerSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(SECTIONS as readonly string[]).includes(section)) notFound();
  return <WorkspaceShell role="proprietaire" section={section}><OwnerWorkspace section={section} /></WorkspaceShell>;
}

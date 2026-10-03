import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { AdminWorkspace } from "@/components/workspace/AdminWorkspace";
const SECTIONS = ["utilisateurs", "proprietaires", "agents", "biens", "visites", "demandes", "signalements", "documents", "statistiques", "parametres"] as const;
export const metadata: Metadata = { title: "Administration — HOMERA", robots: { index: false, follow: false } };
export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(SECTIONS as readonly string[]).includes(section)) notFound();
  return <WorkspaceShell role="admin" section={section}><AdminWorkspace section={section} /></WorkspaceShell>;
}

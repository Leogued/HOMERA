import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { OwnerWorkspace } from "@/components/workspace/OwnerWorkspace";

const SECTIONS = ["biens", "demandes", "visites", "locations", "agents", "documents", "abonnement", "profil", "parametres"] as const;
export const metadata: Metadata = { title: "Espace propriétaire — HOMERA", robots: { index: false, follow: false } };
export default async function OwnerSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(SECTIONS as readonly string[]).includes(section)) notFound();
  const gate = await guardWorkspace("proprietaire", `/proprietaire/${section}`);
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="proprietaire" />;
  return <WorkspaceShell role="proprietaire" section={section}><OwnerWorkspace section={section} /></WorkspaceShell>;
}

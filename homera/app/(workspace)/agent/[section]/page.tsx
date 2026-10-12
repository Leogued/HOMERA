import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { AgentWorkspace } from "@/components/workspace/AgentWorkspace";
const SECTIONS = ["biens", "visites", "clients", "documents", "autorisations", "profil"] as const;
export const metadata: Metadata = { title: "Espace agent — HOMERA", robots: { index: false, follow: false } };
export default async function AgentSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(SECTIONS as readonly string[]).includes(section)) notFound();
  const gate = await guardWorkspace("agent", `/agent/${section}`);
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="agent" />;
  return <WorkspaceShell role="agent" section={section}><AgentWorkspace section={section} /></WorkspaceShell>;
}

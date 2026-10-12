import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { AdminWorkspace } from "@/components/workspace/AdminWorkspace";
const SECTIONS = ["utilisateurs", "proprietaires", "agents", "biens", "visites", "demandes", "signalements", "documents", "statistiques", "parametres"] as const;
export const metadata: Metadata = { title: "Administration — HOMERA", robots: { index: false, follow: false } };
export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(SECTIONS as readonly string[]).includes(section)) notFound();
  const gate = await guardWorkspace("admin", `/admin/${section}`);
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="admin" />;
  return <WorkspaceShell role="admin" section={section}><AdminWorkspace section={section} /></WorkspaceShell>;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientApplications } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Mes demandes — Espace client HOMERA", robots: { index: false, follow: false } };
export default async function ClientApplicationsPage() {
  const gate = await guardWorkspace("client", "/client/demandes");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="client" section="demandes"><ClientApplications /></WorkspaceShell>;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientContracts } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Mes contrats — Espace client HOMERA", robots: { index: false, follow: false } };
export default async function ClientContractsPage() {
  const gate = await guardWorkspace("client", "/client/contrats");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="client" section="contrats"><ClientContracts /></WorkspaceShell>;
}

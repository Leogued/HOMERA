import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientContractReader } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Consulter un contrat — HOMERA", robots: { index: false, follow: false } };
export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await guardWorkspace("client", `/client/contrats/${id}`);
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="client" section="contrats"><ClientContractReader contractId={id} /></WorkspaceShell>;
}

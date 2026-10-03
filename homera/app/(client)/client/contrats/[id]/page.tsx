import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientContractReader } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Consulter un contrat — HOMERA", robots: { index: false, follow: false } };
export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceShell role="client" section="contrats"><ClientContractReader contractId={id} /></WorkspaceShell>;
}

import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientContracts } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Mes contrats — Espace client HOMERA", robots: { index: false, follow: false } };
export default function ClientContractsPage() {
  return <WorkspaceShell role="client" section="contrats"><ClientContracts /></WorkspaceShell>;
}

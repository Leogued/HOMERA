import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientApplications } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Mes demandes — Espace client HOMERA", robots: { index: false, follow: false } };
export default function ClientApplicationsPage() {
  return <WorkspaceShell role="client" section="demandes"><ClientApplications /></WorkspaceShell>;
}

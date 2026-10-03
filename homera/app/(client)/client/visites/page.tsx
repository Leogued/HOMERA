import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientVisits } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Mes visites — Espace client HOMERA", robots: { index: false, follow: false } };
export default function ClientVisitsPage() {
  return <WorkspaceShell role="client" section="visites"><ClientVisits /></WorkspaceShell>;
}

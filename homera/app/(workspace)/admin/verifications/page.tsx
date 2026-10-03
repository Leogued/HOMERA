import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { AdminWorkspace } from "@/components/workspace/AdminWorkspace";
export const metadata: Metadata = { title: "Vérifications — Administration HOMERA", robots: { index: false, follow: false } };
export default function AdminVerificationsPage() {
  return <WorkspaceShell role="admin" section="verifications"><AdminWorkspace section="verifications" /></WorkspaceShell>;
}

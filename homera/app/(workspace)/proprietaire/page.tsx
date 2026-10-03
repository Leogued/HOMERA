import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { OwnerWorkspace } from "@/components/workspace/OwnerWorkspace";

export const metadata: Metadata = { title: "Espace propriétaire — HOMERA", robots: { index: false, follow: false } };
export default function OwnerHomePage() {
  return <WorkspaceShell role="proprietaire" section="dashboard"><OwnerWorkspace section="dashboard" /></WorkspaceShell>;
}

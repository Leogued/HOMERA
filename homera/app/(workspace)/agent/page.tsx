import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { AgentWorkspace } from "@/components/workspace/AgentWorkspace";
export const metadata: Metadata = { title: "Espace agent — HOMERA", robots: { index: false, follow: false } };
export default function AgentHomePage() {
  return <WorkspaceShell role="agent" section="dashboard"><AgentWorkspace section="dashboard" /></WorkspaceShell>;
}

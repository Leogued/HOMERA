import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { AgentWorkspace } from "@/components/workspace/AgentWorkspace";
export const metadata: Metadata = { title: "Espace agent — HOMERA", robots: { index: false, follow: false } };
export default async function AgentHomePage() {
  const gate = await guardWorkspace("agent", "/agent");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="agent" />;
  return <WorkspaceShell role="agent" section="dashboard"><AgentWorkspace section="dashboard" /></WorkspaceShell>;
}

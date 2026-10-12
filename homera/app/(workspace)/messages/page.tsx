import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { MessagesPage } from "@/components/workspace/CommunicationPages";
export const metadata: Metadata = { title: "Messages — HOMERA", robots: { index: false, follow: false } };
export default async function MessagesRoute() {
  const gate = await guardWorkspace("any", "/messages");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  // « any » = session suffisante ; le refus reste traité si la règle change.
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="any" section="messages"><MessagesPage /></WorkspaceShell>;
}

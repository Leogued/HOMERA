import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientSearches } from "@/components/client/ClientSearches";
export const metadata: Metadata = { title: "Recherches récentes — Espace client HOMERA", robots: { index: false, follow: false } };
export default async function ClientSearchesPage() {
  const gate = await guardWorkspace("client", "/client/recherches");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="client" section="recherches"><ClientSearches /></WorkspaceShell>;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { OwnerWorkspace } from "@/components/workspace/OwnerWorkspace";

export const metadata: Metadata = { title: "Espace propriétaire — HOMERA", robots: { index: false, follow: false } };
export default async function OwnerHomePage() {
  const gate = await guardWorkspace("proprietaire", "/proprietaire");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="proprietaire" />;
  return <WorkspaceShell role="proprietaire" section="dashboard"><OwnerWorkspace section="dashboard" /></WorkspaceShell>;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { AdminWorkspace } from "@/components/workspace/AdminWorkspace";
export const metadata: Metadata = { title: "Administration — HOMERA", robots: { index: false, follow: false } };
export default async function AdminHomePage() {
  const gate = await guardWorkspace("admin", "/admin");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="admin" />;
  return <WorkspaceShell role="admin" section="dashboard"><AdminWorkspace section="dashboard" /></WorkspaceShell>;
}

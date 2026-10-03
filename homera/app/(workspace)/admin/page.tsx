import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { AdminWorkspace } from "@/components/workspace/AdminWorkspace";
export const metadata: Metadata = { title: "Administration — HOMERA", robots: { index: false, follow: false } };
export default function AdminHomePage() {
  return <WorkspaceShell role="admin" section="dashboard"><AdminWorkspace section="dashboard" /></WorkspaceShell>;
}

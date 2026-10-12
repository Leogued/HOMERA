import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ProfilePage } from "@/components/workspace/ProfileSettings";
export const metadata: Metadata = { title: "Mon profil — Espace client HOMERA", robots: { index: false, follow: false } };
export default async function ClientProfilePage() {
  const gate = await guardWorkspace("client", "/client/profil");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="client" section="profil"><ProfilePage role="client" /></WorkspaceShell>;
}

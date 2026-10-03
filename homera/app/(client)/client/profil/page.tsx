import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ProfilePage } from "@/components/workspace/ProfileSettings";
export const metadata: Metadata = { title: "Mon profil — Espace client HOMERA", robots: { index: false, follow: false } };
export default function ClientProfilePage() {
  return <WorkspaceShell role="client" section="profil"><ProfilePage role="client" /></WorkspaceShell>;
}

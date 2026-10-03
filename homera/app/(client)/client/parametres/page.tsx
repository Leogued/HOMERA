import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { PreferencesPage } from "@/components/workspace/ProfileSettings";
export const metadata: Metadata = { title: "Paramètres — Espace client HOMERA", robots: { index: false, follow: false } };
export default function ClientPreferencesPage() {
  return <WorkspaceShell role="client" section="parametres"><PreferencesPage /></WorkspaceShell>;
}

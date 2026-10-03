import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientFavorites } from "@/components/workspace/ClientFavorites";
export const metadata: Metadata = { title: "Mes favoris — Espace client HOMERA", robots: { index: false, follow: false } };
export default function ClientFavoritesPage() {
  return <WorkspaceShell role="client" section="favoris"><ClientFavorites /></WorkspaceShell>;
}

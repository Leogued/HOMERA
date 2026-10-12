import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientFavorites } from "@/components/workspace/ClientFavorites";
export const metadata: Metadata = { title: "Mes favoris — Espace client HOMERA", robots: { index: false, follow: false } };
export default async function ClientFavoritesPage() {
  const gate = await guardWorkspace("client", "/client/favoris");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="client" section="favoris"><ClientFavorites /></WorkspaceShell>;
}

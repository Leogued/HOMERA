import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ClientRecommendations } from "@/components/client/ClientRecommendations";
export const metadata: Metadata = { title: "Recommandations — Espace client HOMERA", robots: { index: false, follow: false } };
export default async function ClientRecommendationsPage() {
  const gate = await guardWorkspace("client", "/client/recommandations");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="client" section="recommandations"><ClientRecommendations /></WorkspaceShell>;
}

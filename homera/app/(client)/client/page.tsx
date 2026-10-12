import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { ClientDashboard } from "@/components/client/ClientDashboard";

export const metadata: Metadata = {
  title: "Espace client — HOMERA",
  description:
    "Retrouvez vos recherches récentes, biens favoris, recommandations et le suivi de votre projet immobilier sur HOMERA.",
  robots: { index: false, follow: false },
};

export default async function ClientPage() {
  const gate = await guardWorkspace("client", "/client");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <ClientDashboard />;
}

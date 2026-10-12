import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { VisitScheduler } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Demander une visite — HOMERA", robots: { index: false, follow: false } };
export default async function NewVisitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = params.bien;
  const propertyId = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  const gate = await guardWorkspace("client", "/client/visites/nouvelle");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="client" section="visites"><VisitScheduler initialPropertyId={propertyId} /></WorkspaceShell>;
}

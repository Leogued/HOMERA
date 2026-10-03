import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { VisitScheduler } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Demander une visite — HOMERA", robots: { index: false, follow: false } };
export default async function NewVisitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = params.bien;
  const propertyId = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  return <WorkspaceShell role="client" section="visites"><VisitScheduler initialPropertyId={propertyId} /></WorkspaceShell>;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { RentalRequestForm } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Demande de location — HOMERA", robots: { index: false, follow: false } };
export default async function NewRentalRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const visitValue = params.visite;
  const visitId = Array.isArray(visitValue) ? visitValue[0] ?? "" : visitValue ?? "";
  const propertyValue = params.bien;
  const propertyId = Array.isArray(propertyValue) ? propertyValue[0] ?? "" : propertyValue ?? "";
  const gate = await guardWorkspace("client", "/client/demandes/nouvelle");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return <WorkspaceShell role="client" section="demandes"><RentalRequestForm initialVisitId={visitId} initialPropertyId={propertyId} /></WorkspaceShell>;
}

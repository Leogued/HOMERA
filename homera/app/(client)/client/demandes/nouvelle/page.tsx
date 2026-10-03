import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { RentalRequestForm } from "@/components/workspace/ClientJourneys";
export const metadata: Metadata = { title: "Demande de location — HOMERA", robots: { index: false, follow: false } };
export default async function NewRentalRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const propertyValue = params.bien;
  const visitValue = params.visite;
  const propertyId = Array.isArray(propertyValue) ? propertyValue[0] ?? "" : propertyValue ?? "";
  const visitId = Array.isArray(visitValue) ? visitValue[0] ?? "" : visitValue ?? "";
  return <WorkspaceShell role="client" section="demandes"><RentalRequestForm initialPropertyId={propertyId} initialVisitId={visitId} /></WorkspaceShell>;
}

import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { PropertyWizard } from "@/components/workspace/PropertyWizard";
export const metadata: Metadata = { title: "Ajouter un bien — Espace propriétaire HOMERA", robots: { index: false, follow: false } };
export default async function AddPropertyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.modifier;
  const listingId = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  return <WorkspaceShell role="proprietaire" section="ajouter-bien"><PropertyWizard initialListingId={listingId} /></WorkspaceShell>;
}

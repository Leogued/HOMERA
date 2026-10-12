import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
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
  const gate = await guardWorkspace("proprietaire", "/proprietaire/ajouter-bien");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="proprietaire" />;
  return <WorkspaceShell role="proprietaire" section="ajouter-bien"><PropertyWizard initialListingId={listingId} /></WorkspaceShell>;
}

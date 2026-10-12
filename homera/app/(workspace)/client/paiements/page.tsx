import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardWorkspace, signinHref } from "@/lib/server/auth/guard";
import { WorkspaceRefusal } from "@/components/workspace/WorkspaceRefusal";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { PaymentMethodsWorkspace } from "@/components/workspace/PaymentMethodsPanel";

export const metadata: Metadata = {
  title: "Moyens de paiement — HOMERA",
  robots: { index: false, follow: false },
};

export default async function ClientPaymentsPage() {
  const gate = await guardWorkspace("client", "/client/paiements");
  if (gate.status === "signin") redirect(signinHref(gate.returnTo));
  if (gate.status === "denied") return <WorkspaceRefusal role="client" />;
  return (
    <WorkspaceShell role="client" section="paiements">
      <PaymentMethodsWorkspace contextRole="client" />
    </WorkspaceShell>
  );
}

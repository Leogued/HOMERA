import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { PaymentMethodsWorkspace } from "@/components/workspace/PaymentMethodsPanel";

export const metadata: Metadata = {
  title: "Moyens de paiement — HOMERA",
  robots: { index: false, follow: false },
};

export default function ClientPaymentsPage() {
  return (
    <WorkspaceShell role="client" section="paiements">
      <PaymentMethodsWorkspace contextRole="client" />
    </WorkspaceShell>
  );
}

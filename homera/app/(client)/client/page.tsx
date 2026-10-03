import type { Metadata } from "next";
import { ClientDashboard } from "@/components/client/ClientDashboard";

export const metadata: Metadata = {
  title: "Espace client — HOMERA",
  description:
    "Retrouvez vos recherches récentes, biens favoris, recommandations et le suivi de votre projet immobilier sur HOMERA.",
  robots: { index: false, follow: false },
};

export default function ClientPage() {
  return <ClientDashboard />;
}

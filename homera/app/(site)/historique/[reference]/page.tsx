import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/server/db/client";
import { publicPropertyHistory } from "@/lib/server/services/properties";
import { PropertyHistory } from "@/components/workspace/PropertyHistory";

/* Rendu à la demande : l’historique doit refléter le journal du jour, pas
   une page figée à la construction. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }): Promise<Metadata> {
  const { reference } = await params;
  const history = publicPropertyHistory(getDb(), reference);
  return {
    title: `Historique ${history?.reference ?? reference} — HOMERA`,
    description: history
      ? `Chronologie des événements enregistrés pour ${history.title} (${history.place}).`
      : "Chronologie des événements et vérifications d’un bien HOMERA.",
  };
}

export default async function PropertyHistoryPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const history = publicPropertyHistory(getDb(), reference);
  if (!history) notFound();
  return <PropertyHistory history={history} />;
}

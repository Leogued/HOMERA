import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROPERTIES } from "@/lib/content";
import { DEMO_OWNER_LISTINGS } from "@/lib/portal-data";
import { PropertyHistory } from "@/components/workspace/PropertyHistory";
export const dynamicParams = false;
export function generateStaticParams() {
  return Array.from(new Set([...PROPERTIES.map((property) => property.homeraId), ...DEMO_OWNER_LISTINGS.map((item) => item.reference)])).map((reference) => ({ reference }));
}
export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Historique ${reference} — HOMERA`, description: "Chronologie des événements et vérifications d’un bien HOMERA." };
}
export default async function PropertyHistoryPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const exists = PROPERTIES.some((property) => property.homeraId === reference) || DEMO_OWNER_LISTINGS.some((item) => item.reference === reference);
  if (!exists) notFound();
  return <PropertyHistory reference={reference} />;
}

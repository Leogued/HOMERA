import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROPERTIES } from "@/lib/content";
import { INTENT_LABELS, TYPE_LABELS, formatFCFA } from "@/lib/format";
import { PropertyDetail } from "@/components/catalog/PropertyDetail"; /* ================================================================== /biens/<identifiant> — LA FICHE PUBLIQUE D’UN BIEN ------------------------------------------------------------------ Toutes les fiches du catalogue de démonstration sont générées au build : le visiteur, le moteur de recherche et le partage de lien obtiennent la même page. Un identifiant inconnu rend un vrai 404. ================================================================== */ /* Le catalogue est connu à la construction : une référence qui n’y figure pas ne déclenche pas de rendu, elle est rejetée au niveau du routage — la page 404 est alors rendue par le serveur, pas par le navigateur. */
export const dynamicParams = false;
export function generateStaticParams() {
  return PROPERTIES.map((property) => ({ id: property.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const property = PROPERTIES.find((entry) => entry.id === id);
  if (!property) return { title: "Bien introuvable — HOMERA" };
  const place = `${property.district}, ${property.city}`;
  const price = `${formatFCFA(property.price)}${property.pricePeriod ? ` ${property.pricePeriod}` : ""}`;
  return {
    title: `${property.title} — ${place} | HOMERA`,
    description: `${TYPE_LABELS[property.type]} ${INTENT_LABELS[property.intent].toLowerCase()} à ${place} : ${price}, ${property.surface} m². Référence ${property.homeraId}, vérifiée le ${property.verifiedOn}.`,
    openGraph: {
      title: `${property.title} — HOMERA`,
      description: `${place} · ${price} · référence ${property.homeraId}`,
      type: "article",
      locale: "fr_BJ",
    },
  };
}
export default async function BienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = PROPERTIES.find((entry) => entry.id === id);
  if (!property) notFound();
  return <PropertyDetail property={property} />;
}

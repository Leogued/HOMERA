import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument, LEGAL_DOCUMENTS, type LegalDocumentSlug } from "@/components/site/LegalDocument";
const LEGAL_SLUGS: LegalDocumentSlug[] = ["confidentialite", "conditions-generales"];
export function generateStaticParams() { return LEGAL_SLUGS.map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const document = LEGAL_DOCUMENTS[slug as LegalDocumentSlug];
  return document ? { title: `${document.title} — HOMERA`, description: document.intro } : { title: "Informations légales — HOMERA" };
}
export default async function LegalRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!LEGAL_SLUGS.includes(slug as LegalDocumentSlug)) notFound();
  return <LegalDocument slug={slug as LegalDocumentSlug} />;
}

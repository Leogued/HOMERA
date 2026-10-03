import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetail, serviceBySlug } from "@/components/site/ServiceDetail";
const SERVICE_SLUGS = ["gestion-immobiliere", "maintenance", "demenagement", "travaux"] as const;
export function generateStaticParams() { return SERVICE_SLUGS.map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  return service ? { title: `${service.title} — Services HOMERA`, description: service.description } : { title: "Service HOMERA" };
}
export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!serviceBySlug(slug)) notFound();
  return <ServiceDetail slug={slug} />;
}

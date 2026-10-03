import { LegalDocument, type LegalDocumentSlug } from "@/components/site/LegalDocument";
export function LegalAlias({ slug }: { slug: LegalDocumentSlug }) { return <LegalDocument slug={slug} />; }

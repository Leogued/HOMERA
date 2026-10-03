import type { Metadata } from "next";
import { LegalAlias } from "@/components/site/LegalAlias";
export const metadata: Metadata = { title: "Règles de location — HOMERA", description: "Parcours de candidature, contrat, signature et remise des clés." };
export default function Page() { return <LegalAlias slug="regles-location" />; }

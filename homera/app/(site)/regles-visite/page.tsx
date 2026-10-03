import type { Metadata } from "next";
import { LegalAlias } from "@/components/site/LegalAlias";
export const metadata: Metadata = { title: "Règles de visite — HOMERA", description: "Conseils et règles de sécurité pour organiser une visite immobilière." };
export default function Page() { return <LegalAlias slug="regles-visite" />; }

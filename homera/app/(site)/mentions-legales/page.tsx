import type { Metadata } from "next";
import { LegalAlias } from "@/components/site/LegalAlias";
export const metadata: Metadata = { title: "Mentions légales — HOMERA", description: "Mentions légales du prototype HOMERA." };
export default function Page() { return <LegalAlias slug="mentions-legales" />; }

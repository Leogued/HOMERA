import type { Metadata } from "next";
import { LegalAlias } from "@/components/site/LegalAlias";
export const metadata: Metadata = { title: "Politique relative aux cookies — HOMERA", description: "Stockage local et cookies du prototype HOMERA." };
export default function Page() { return <LegalAlias slug="cookies" />; }

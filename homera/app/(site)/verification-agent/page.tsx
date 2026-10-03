import type { Metadata } from "next";
import { AgentVerification } from "@/components/workspace/AgentVerification";
export const metadata: Metadata = { title: "Vérifier un agent autorisé — HOMERA", description: "Vérifiez un mandat HOMERA pour un agent et une référence de bien précis." };
export default async function AgentVerificationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const agent = params.agent;
  const property = params.bien;
  const agentId = Array.isArray(agent) ? agent[0] ?? "" : agent ?? "";
  const propertyRef = Array.isArray(property) ? property[0] ?? "" : property ?? "";
  return <AgentVerification agentId={agentId} propertyRef={propertyRef} />;
}

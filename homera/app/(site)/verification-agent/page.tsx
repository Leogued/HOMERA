import type { Metadata } from "next";
import { getDb } from "@/lib/server/db/client";
import { publicMandateCheck } from "@/lib/server/services/authorizations";
import { AgentVerification } from "@/components/workspace/AgentVerification";

export const metadata: Metadata = {
  title: "Vérifier un agent autorisé — HOMERA",
  description: "Vérifiez un mandat HOMERA pour un agent et une référence de bien précis.",
};

/* Lecture à la demande : un mandat révoqué ou expiré depuis la dernière
   visite doit cesser d’apparaître valide immédiatement. */
export const dynamic = "force-dynamic";

export default async function AgentVerificationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const agent = params.agent;
  const property = params.bien;
  const agentId = Array.isArray(agent) ? agent[0] ?? "" : agent ?? "";
  const propertyRef = Array.isArray(property) ? property[0] ?? "" : property ?? "";
  const check = publicMandateCheck(getDb(), { agentRef: agentId, propertyRef });
  return <AgentVerification agentId={agentId} propertyRef={propertyRef} check={check} />;
}

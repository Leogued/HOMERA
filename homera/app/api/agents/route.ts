import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { fail, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/* ==================================================================
   /api/agents — AGENTS JOIGNABLES POUR UN MANDAT
   ------------------------------------------------------------------
   Un propriétaire doit pouvoir choisir un agent réel, pas deviner un
   identifiant. La liste vient de la base : un compte n’y figure que
   s’il détient le rôle agent, et le matricule affiché est celui que
   HOMERA a attribué.
   ================================================================== */

export type AgentOption = {
  id: string;
  matricule: string;
  name: string;
  agency: string;
  zone: string;
  verification: string;
};

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Session expirée.", 401, { code: "non-authentifie" });
  const db = getDb();
  const rows = db
    .prepare<[], {
      id: string;
      matricule: string;
      prenom: string;
      nom: string;
      email: string;
      structure: string;
      zone: string;
      verification_status: string;
      agency: string | null;
    }>(
      `SELECT u.id, a.matricule,
              COALESCE(NULLIF(p.value, ''), '') AS prenom,
              COALESCE(NULLIF(n.value, ''), '') AS nom,
              u.email, a.structure, a.zone, a.verification_status,
              g.name AS agency
         FROM agents a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN user_profiles p ON p.user_id = u.id AND p.key = 'prenom'
         LEFT JOIN user_profiles n ON n.user_id = u.id AND n.key = 'nom'
         LEFT JOIN agencies g ON g.id = a.agency_id
        WHERE u.status = 'actif'
        ORDER BY a.matricule ASC`,
    )
    .all();

  const agents: AgentOption[] = rows.map((row) => ({
    id: row.id,
    matricule: row.matricule,
    name: [row.prenom, row.nom].filter(Boolean).join(" ").trim() || row.email,
    agency: row.agency ?? row.structure ?? "",
    zone: row.zone ?? "",
    verification: row.verification_status,
  }));

  return ok({ agents });
}

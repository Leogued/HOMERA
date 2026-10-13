import { getDb } from "@/lib/server/db/client";
import { locationTree } from "@/lib/server/services/properties";
import { ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Hiérarchie administrative béninoise réellement utilisée par le
 * catalogue : pays → département → commune → quartier (arrondissement
 * inclus). Les listes sont calculées depuis les biens publiés, avec le
 * nombre d’annonces, afin qu’une commune vide ne soit jamais proposée.
 *
 * `?departement=` restreint les communes ; `?commune=` restreint les
 * quartiers. Sans paramètre, l’API renvoie l’arbre complet.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const department = (url.searchParams.get("departement") ?? "").trim();
  const commune = (url.searchParams.get("commune") ?? "").trim();
  return ok(locationTree(getDb(), { department, commune }));
}

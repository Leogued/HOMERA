import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { catalogFacets, catalogPriceBounds, createProperty, searchProperties } from "@/lib/server/services/properties";
import { parseInput, propertyDraftSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, ok, readJson, toBoolean, toNumber, toStringArray } from "@/lib/server/http";
import type { CatalogFilters } from "@/lib/server/services/properties";
import type { LandTitle, PropertyFeature, PropertyIntent, PropertyType } from "@/lib/content";

export const dynamic = "force-dynamic";

/** Recherche publique : les mêmes filtres que l’écran, appliqués en base. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const filters: CatalogFilters = {
    bathroomsMin: toNumber(params.get("sdb")),
    intent: (params.get("intention") ?? "") as PropertyIntent | "",
    types: toStringArray(params.get("type")) as PropertyType[],
    cities: toStringArray(params.get("ville")),
    districts: toStringArray(params.get("quartier")),
    features: toStringArray(params.get("equipement")) as PropertyFeature[],
    landTitles: toStringArray(params.get("titre")) as LandTitle[],
    q: params.get("q") ?? "",
    priceMin: toNumber(params.get("prix-min")),
    priceMax: toNumber(params.get("prix-max")),
    bedroomsMin: toNumber(params.get("chambres")),
    roomsMin: toNumber(params.get("pieces")),
    surfaceMin: toNumber(params.get("surface-min")),
    surfaceMax: toNumber(params.get("surface-max")),
    stayNights: toNumber(params.get("nuits")),
    recentOnly: toBoolean(params.get("nouveautes")),
    availableOnly: toBoolean(params.get("disponible")),
    verifiedOnly: toBoolean(params.get("verifie")),
    furnishedOnly: toBoolean(params.get("meuble")),
    sort: (params.get("tri") ?? "pertinence") as CatalogFilters["sort"],
  };
  const db = getDb();
  const page = Math.max(1, Math.round(toNumber(params.get("page")) ?? 1));
  const perPage = Math.min(48, Math.max(1, Math.round(toNumber(params.get("par-page")) ?? 9)));
  const result = searchProperties(db, filters, { page, perPage });
  const payload: Record<string, unknown> = { ...result };
  // Les facettes sont un supplément : on ne les calcule que si l’écran les demande.
  if (params.get("facettes") === "1") {
    payload.facets = catalogFacets(db, filters);
    payload.priceBounds = catalogPriceBounds(db, filters);
  }
  return ok(payload);
}

/** Dépôt d’un bien : le brouillon appartient au propriétaire connecté. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Connectez-vous pour déposer un bien.", 401, { code: "non-authentifie" });
  const parsed = parseInput(propertyDraftSchema, await readJson(request));
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(createProperty(getDb(), user, parsed.data, { ip: clientIp(request) }), 201);
}

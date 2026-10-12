import { NextResponse } from "next/server";
import type { ApiResult } from "./contracts";

/* ==================================================================
   HOMERA — COUCHE HTTP
   ------------------------------------------------------------------
   Une seule façon de répondre : jamais d’exception brute, jamais de
   pile technique envoyée au navigateur. Les services rendent un
   `ServiceResult`, ce fichier le traduit en statut HTTP.

   Les erreurs inattendues sont journalisées côté serveur et rendues
   sous une forme compréhensible, sans fuir d’information interne.
   ================================================================== */

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function ok<T>(data: T, status = 200): NextResponse<ApiResult<T>> {
  return NextResponse.json({ ok: true as const, data }, { status });
}

export function fail(message: string, status = 400, extra?: { fields?: Record<string, string>; code?: string }) {
  return NextResponse.json(
    { ok: false as const, message, ...(extra?.fields ? { fields: extra.fields } : {}), ...(extra?.code ? { code: extra.code } : {}) },
    { status },
  );
}

const STATUS_BY_CODE: Record<string, number> = {
  permission: 403,
  "non-authentifie": 401,
  verrouille: 429,
  indisponible: 409,
  "creneau-plein": 409,
  introuvable: 404,
  suspendu: 403,
};

/** Traduit le résultat d’un service en réponse HTTP. */
export function fromService<T>(result: ApiResult<T>, successStatus = 200): NextResponse {
  if (result.ok) return ok(result.data, successStatus);
  const status = STATUS_BY_CODE[result.code ?? ""] ?? 400;
  return fail(result.message, status, { fields: result.fields, code: result.code });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Adresse IP de l’appelant — journalisation et limitation du débit. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "";
}

export function userAgent(request: Request): string {
  return request.headers.get("user-agent") ?? "";
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  if (typeof value === "string" && value.trim()) return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  return [];
}

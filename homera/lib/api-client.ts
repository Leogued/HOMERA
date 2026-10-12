/* ==================================================================
   HOMERA — APPEL D’API CÔTÉ NAVIGATEUR
   ------------------------------------------------------------------
   Une seule façon d’appeler le serveur, pour trois raisons :

   • **jamais d’exception** : chaque appel rend une issue explicite
     (`ok` + données, ou `message` + champs fautifs). Les composants
     affichent cette issue, ils ne la devinent pas ;
   • **jamais de cache** : les données affichées viennent de la base, une
     réponse mise en cache mentirait ;
   • **un seul format** : l’enveloppe est celle de `lib/server/http.ts`,
     donc le serveur et le client parlent exactement la même langue.
   ================================================================== */

export type CallResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields?: Record<string, string>; code?: string };

const HEADERS = { "Content-Type": "application/json" };

async function request<T>(method: string, url: string, body?: unknown): Promise<CallResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as CallResult<T> | null;
    if (!payload) {
      return { ok: false, message: "Le serveur n’a pas répondu correctement. Réessayez dans un instant." };
    }
    return payload;
  } catch {
    return {
      ok: false,
      message: "La connexion au serveur HOMERA a échoué. Vérifiez votre réseau, puis réessayez.",
    };
  }
}

export const apiGet = <T,>(url: string) => request<T>("GET", url);
export const apiPost = <T,>(url: string, body?: unknown) => request<T>("POST", url, body);
export const apiPatch = <T,>(url: string, body?: unknown) => request<T>("PATCH", url, body);
export const apiDelete = <T,>(url: string) => request<T>("DELETE", url);

/** Message d’erreur affichable, quel que soit l’échec. */
export function messageOf(result: CallResult<unknown>, fallback = "L’action n’a pas abouti."): string {
  return result.ok ? "" : result.message || fallback;
}

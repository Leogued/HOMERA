/* ==================================================================
   HOMERA — `searchParams` de Next → URLSearchParams
   ------------------------------------------------------------------
   `searchParams` arrive sous forme d’objet, avec un tableau dès qu’un
   paramètre est répété (?type=villa&type=studio). Les filtres HOMERA
   utilisent justement la répétition : on la rétablit ici, une fois.
   ================================================================== */

export type NextSearchParams = Record<string, string | string[] | undefined>;

export function searchParamsToQuery(searchParams: NextSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const entry of value) params.append(key, entry);
    else params.set(key, value);
  }
  return params;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, type CallResult } from "@/lib/api-client";

/* ==================================================================
   HOMERA — LECTURE D’UNE RESSOURCE SERVEUR
   ------------------------------------------------------------------
   Trois états, jamais deux : `loading` (le serveur n’a pas répondu),
   `result` (sa réponse, réussie ou non), `reload()` (relire).

   Aucune donnée n’est inventée pendant l’attente : les composants
   affichent un squelette ou un état vide réel, jamais un exemple.

   L’état n’est écrit qu’au retour du serveur (jamais de façon
   synchrone dans le corps d’un effet) : c’est ce qui garantit qu’un
   écran n’affiche jamais une valeur que le serveur n’a pas donnée.
   ================================================================== */

export type ServerResource<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** `true` dès le premier chargement terminé (réussi ou non). */
  settled: boolean;
  reload: () => Promise<void>;
  setData: (next: T) => void;
};

export function useServerResource<T>(url: string | null): ServerResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  // Empêche toute écriture d’état après le démontage du composant.
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const result = url ? ((await apiGet<T>(url)) as CallResult<T>) : null;
    if (!alive.current) return;
    if (result?.ok) setData(result.data);
    else if (result && !result.ok) setError(result.message);
    if (url) setLoading(false);
    setSettled(true);
  }, [url]);

  // La lecture est lancée ici, mais l’état n’est écrit qu’au retour du
  // serveur : rien n’est annoncé avant d’être su.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = url ? ((await apiGet<T>(url)) as CallResult<T>) : null;
      if (cancelled) return;
      if (result?.ok) setData(result.data);
      else if (result && !result.ok) setError(result.message);
      if (url) setLoading(false);
      setSettled(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const patch = useCallback((next: T) => setData(next), []);

  return { data, loading, error, settled, reload: load, setData: patch };
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("HOMERA route error", error);
  }, [error]);

  return <main className="flex min-h-svh items-center justify-center bg-background px-5 py-16 text-foreground"><section className="w-full max-w-xl rounded-card border border-error/25 bg-card p-6 shadow-card sm:p-10" role="alert"><span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-error/[0.08] text-error"><AlertTriangle aria-hidden="true" /></span><p className="mt-5 text-caption font-semibold uppercase tracking-[0.14em] text-error">Erreur inattendue</p><h1 className="mt-2 font-serif text-heading-lg">Cette page n’a pas pu se charger.</h1><p className="mt-3 text-body-sm text-muted">Vos informations enregistrées dans cet onglet ne sont pas effacées. Réessayez ou revenez à l’exploration.</p>{error.digest && <p className="mt-3 font-mono text-caption text-muted">Référence : {error.digest}</p>}<div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={() => reset()} className="homera-press inline-flex min-h-11 items-center gap-2 rounded-full bg-homera-brown px-5 text-note font-semibold text-white"><RotateCcw className="h-4 w-4" aria-hidden="true" />Réessayer</button><Link href="/explorer" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-note font-semibold">Explorer les biens</Link></div></section></main>;
}

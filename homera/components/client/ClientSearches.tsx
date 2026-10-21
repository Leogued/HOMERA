"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, History, RotateCcw, Search, Trash2 } from "lucide-react";
import { useVisitor } from "@/components/providers/VisitorProvider";
import { ClientHero } from "@/components/client/ClientHero";
import { formatDay } from "@/components/workspace/VisitsSections";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel } from "@/components/workspace/Primitives";
import { INTENT_LABELS, TYPE_LABELS, countLabel } from "@/lib/format";
import { parseCatalogQuery } from "@/lib/properties";
import type { SavedSearch } from "@/lib/persistence";

/* ==================================================================
   HOMERA — RECHERCHES RÉCENTES DU CLIENT
   ------------------------------------------------------------------
   Les recherches que le client a explicitement enregistrées depuis
   le catalogue. « Relancer » rouvre l’adresse sauvegardée telle
   quelle : les résultats affichés sont donc ceux du jour, pas ceux
   du jour de l’enregistrement — le libellé le dit explicitement.
   ================================================================== */

function criteriaOf(search: SavedSearch): string[] {
  const question = search.href.indexOf("?");
  const query = parseCatalogQuery(question < 0 ? "" : search.href.slice(question + 1));
  const criteria: string[] = [];
  if (query.intent) criteria.push(INTENT_LABELS[query.intent]);
  for (const type of query.types.slice(0, 2)) criteria.push(TYPE_LABELS[type]);
  if (query.cities[0]) criteria.push(query.cities.slice(0, 2).join(" · "));
  return criteria.slice(0, 3);
}

export function ClientSearches() {
  const visitor = useVisitor();
  const searches = useMemo(() => visitor.searches, [visitor.searches]);

  if (!visitor.ready) {
    return (
      <>
        <ClientHero eyebrow="Historique" title="Recherches récentes" description="Lecture de vos recherches enregistrées…" />
        <p className="rounded-3xl border border-dashed border-border bg-card p-6 text-caption text-muted" role="status">
          Lecture de vos recherches…
        </p>
      </>
    );
  }

  return (
    <>
      <ClientHero
        eyebrow="Historique"
        title="Recherches récentes"
        description="Les critères que vous avez enregistrés depuis le catalogue. Relancez une recherche pour voir les biens disponibles aujourd’hui."
        stats={[{ icon: History, value: String(searches.length), label: searches.length === 1 ? "Recherche enregistrée" : "Recherches enregistrées" }]}
        actions={
          <Link href="/explorer" className={BUTTON_PRIMARY}>
            <Search className="h-4 w-4" aria-hidden="true" />Nouvelle recherche
          </Link>
        }
      />

      {searches.length === 0 ? (
        <EmptyPanel
          icon={History}
          title="Aucune recherche enregistrée"
          description="Lancez une recherche dans le catalogue, puis enregistrez vos critères pour les retrouver ici et les relancer en un clic."
          action={<Link href="/explorer" className={BUTTON_PRIMARY}>Explorer les biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        />
      ) : (
        <ul className="space-y-3">
          {searches.map((search) => (
            <li key={search.id} className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-homera-terracotta/[0.09] text-homera-terracotta">
                    <Search className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-foreground">{search.label}</p>
                    <p className="mt-1 text-caption text-muted">
                      {countLabel(search.count)} lors de l’enregistrement
                      {search.savedAt && <> · Enregistrée le {formatDay(search.savedAt)}</>}
                    </p>
                    {criteriaOf(search).length > 0 && (
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {criteriaOf(search).map((criterion) => (
                          <span key={criterion} className="rounded-full border border-border bg-background px-2.5 py-1 text-micro font-semibold text-muted">
                            {criterion}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link href={search.href} className={BUTTON_PRIMARY}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />Relancer
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Supprimer cette recherche enregistrée ?")) visitor.removeSearch(search.id);
                    }}
                    className={BUTTON_SECONDARY}
                    aria-label={`Supprimer la recherche ${search.label}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />Supprimer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

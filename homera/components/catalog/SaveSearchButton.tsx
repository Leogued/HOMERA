"use client";
import Link from "next/link";
import { useState } from "react";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { useVisitor } from "@/components/providers/VisitorProvider";
import { activeFilterCount, type CatalogQuery } from "@/lib/properties";
import { countLabel } from "@/lib/format";
/* ================================================================== HOMERA — ENREGISTRER UNE RECHERCHE ------------------------------------------------------------------ Enregistrer une recherche revient à noter une adresse : le bouton reprend exactement l’URL courante, avec le nombre de biens trouvés au moment de l’enregistrement. Aucune notification n’est promise, parce qu’aucun service de veille n’existe encore. ================================================================== */ export function SaveSearchButton({
  query,
  basePath,
  resultCount,
}: {
  query: CatalogQuery;
  basePath: string;
  resultCount: number;
}) {
  const { saveSearch, searches } = useVisitor();
  const [savedId, setSavedId] = useState<string | null>(null);
  const filters = activeFilterCount(query);
  const alreadySaved = searches.some((entry) => entry.id === savedId);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {" "}
      <button
        type="button"
        disabled={filters === 0}
        onClick={() => {
          const search = saveSearch(query, basePath);
          setSavedId(search.id);
        }}
        className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border disabled:hover:text-foreground"
      >
        {" "}
        {alreadySaved ? (
          <BookmarkCheck className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
        ) : (
          <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
        )}{" "}
        {alreadySaved ? "Recherche enregistrée" : "Enregistrer cette recherche"}{" "}
      </button>{" "}
      {filters === 0 && (
        <p className="text-caption text-muted"> Ajoutez un filtre pour pouvoir enregistrer la recherche. </p>
      )}{" "}
      {alreadySaved && (
        <p role="status" className="text-caption text-muted">
          {" "}
          {countLabel(resultCount)} — retrouvez-la sur{" "}
          <Link href="/favoris" className="homera-underline font-medium homera-accent-ink">
            {" "}
            vos favoris et recherches{" "}
          </Link>{" "}
          .{" "}
        </p>
      )}{" "}
    </div>
  );
}

"use client";
import Link from "next/link";
import { ArrowRight, BookmarkMinus, Heart, Search, ShieldCheck, Trash2 } from "lucide-react";
import { PropertyCard } from "@/components/catalog/PropertyCard";
import { useVisitor } from "@/components/providers/VisitorProvider";
import type { Property } from "@/lib/content";
import { countLabel } from "@/lib/format";
/* ================================================================== HOMERA — FAVORIS ET RECHERCHES ENREGISTRÉES ------------------------------------------------------------------ Tout tient dans le navigateur du visiteur : aucun compte, aucun envoi au serveur. L’écran le dit, et se vide d’un clic. ================================================================== */ export function FavoritesView({
  properties,
}: {
  properties: Property[];
}) {
  const { favorites, searches, ready, removeSearch, count } = useVisitor();
  const favoriteProperties = favorites
    .map((id) => properties.find((property) => property.id === id))
    .filter((property): property is Property => Boolean(property));
  if (!ready) {
    // Première peinture : on annonce le travail à venir sans inventer d’état.
    return (
      <div className="rounded-card border border-dashed border-border bg-card/50 p-8 text-center" aria-busy="true">
        {" "}
        <p className="text-note text-muted">Lecture de votre sélection locale…</p>{" "}
      </div>
    );
  }
  if (count === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        {" "}
        <section className="rounded-card border border-border bg-card p-8">
          {" "}
          <p className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.2em] text-muted">
            {" "}
            <Heart className="h-4 w-4 text-homera-terracotta" aria-hidden="true" /> Aucun favori pour l’instant{" "}
          </p>{" "}
          <h2 className="mt-4 font-serif text-display-sm">Composez votre sélection en la parcourant.</h2>{" "}
          <p className="mt-4 max-w-md text-note leading-relaxed text-muted">
            {" "}
            Le cœur, sur chaque carte, range un bien de côté. Rien n’est publié, rien n’est partagé : la sélection
            reste dans ce navigateur, et disparaît si vous l’effacez.{" "}
          </p>{" "}
          <div className="mt-6 flex flex-wrap gap-3">
            {" "}
            <Link
              href="/explorer"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white transition-colors "
            >
              {" "}
              Explorer les biens <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
            </Link>{" "}
            <Link
              href="/a-propos#protocole"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-border bg-card px-5 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              {" "}
              <ShieldCheck className="h-4 w-4 text-homera-terracotta" aria-hidden="true" /> Ce que « vérifié » veut
              dire{" "}
            </Link>{" "}
          </div>{" "}
        </section>{" "}
        <section className="rounded-card border border-dashed border-border bg-card/50 p-8">
          {" "}
          <p className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.2em] text-muted">
            {" "}
            <Search className="h-4 w-4 text-homera-terracotta" aria-hidden="true" /> Aucune recherche enregistrée{" "}
          </p>{" "}
          <p className="mt-4 text-note leading-relaxed text-muted">
            {" "}
            Dans l’explorateur, une recherche filtrée peut être enregistrée telle quelle — l’adresse complète,
            partageable, avec le nombre de biens trouvés.{" "}
          </p>{" "}
        </section>{" "}
      </div>
    );
  }
  return (
    <div className="space-y-12">
      {" "}
      {/* --- Recherches enregistrées --- */}{" "}
      {searches.length > 0 && (
        <section aria-labelledby="recherches-titre">
          {" "}
          <div className="flex flex-wrap items-end justify-between gap-3">
            {" "}
            <h2 id="recherches-titre" className="font-serif text-display-sm">
              {" "}
              Recherches enregistrées{" "}
            </h2>{" "}
            <p className="text-caption text-muted">{countLabel(searches.length, "recherche", "recherches")}</p>{" "}
          </div>{" "}
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {" "}
            {searches.map((search) => (
              <li
                key={search.id}
                className="flex items-start justify-between gap-4 rounded-card border border-border bg-card p-4"
              >
                {" "}
                <div className="min-w-0">
                  {" "}
                  <Link
                    href={search.href}
                    className="homera-underline block text-body-sm font-semibold text-foreground hover:text-homera-terracotta"
                  >
                    {" "}
                    {search.label}{" "}
                  </Link>{" "}
                  <p className="mt-1 text-caption text-muted">
                    {" "}
                    <span className="homera-num">{countLabel(search.count)}</span>{" "}
                    {search.savedAt && (
                      <span className="homera-num"> · enregistrée le {formatDay(search.savedAt)}</span>
                    )}{" "}
                  </p>{" "}
                </div>{" "}
                <button
                  type="button"
                  onClick={() => removeSearch(search.id)}
                  aria-label={`Supprimer la recherche : ${search.label}`}
                  className="homera-press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-homera-terracotta hover:text-homera-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber"
                >
                  {" "}
                  <Trash2 className="h-4 w-4" aria-hidden="true" />{" "}
                </button>{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </section>
      )}{" "}
      {/* --- Favoris --- */}{" "}
      <section aria-labelledby="favoris-titre">
        {" "}
        <div className="flex flex-wrap items-end justify-between gap-3">
          {" "}
          <h2 id="favoris-titre" className="font-serif text-display-sm">
            {" "}
            Biens mis de côté{" "}
          </h2>{" "}
          <p className="text-caption text-muted">{countLabel(favoriteProperties.length)}</p>{" "}
        </div>{" "}
        {favoriteProperties.length === 0 ? (
          <p className="mt-5 rounded-card border border-dashed border-border bg-card/50 p-6 text-note text-muted">
            {" "}
            Aucun bien en favori pour l’instant — le cœur sur chaque carte suffit.{" "}
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {" "}
            {favoriteProperties.map((property) => (
              <li key={property.id} className="h-full">
                {" "}
                <PropertyCard property={property} layout="grid" />{" "}
              </li>
            ))}{" "}
          </ul>
        )}{" "}
      </section>{" "}
      <p className="flex flex-wrap items-center gap-2 border-t border-border pt-6 text-caption text-muted">
        {" "}
        <BookmarkMinus className="h-4 w-4 text-homera-terracotta" aria-hidden="true" /> Votre sélection est conservée
        dans ce navigateur uniquement (clé locale <code className="font-mono">homera.visiteur.v1</code>), sans compte
        ni trace serveur. Effacer les données du site la supprime.{" "}
      </p>{" "}
    </div>
  );
} /** « 2026-10-03 » → « 3 octobre 2026 ». */
function formatDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

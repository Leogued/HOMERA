"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Bookmark, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useVisitor } from "@/components/providers/VisitorProvider";
import { PropertyCard } from "@/components/catalog/PropertyCard";
import { PropertyComparison } from "@/components/catalog/PropertyComparison";
import { Visual } from "@/components/ui/Visual";
import { PROPERTIES, type Property, type PropertyIntent, type PropertyType } from "@/lib/content";
import { useServerResource } from "@/lib/use-server-resource";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice, EmptyPanel, INPUT_CLASS } from "@/components/workspace/Primitives";

const PAGE_SIZE = 9;
const TYPE_ORDER: PropertyType[] = ["villa", "appartement", "studio", "chambre", "immeuble", "terrain", "boutique", "salle", "espace"];
const TYPE_PLURALS: Record<PropertyType, string> = {
  villa: "Maisons",
  appartement: "Appartements",
  studio: "Studios",
  chambre: "Chambres meublées",
  immeuble: "Immeubles",
  terrain: "Terrains",
  boutique: "Boutiques",
  salle: "Salles de fête",
  espace: "Espaces louables",
};
const INTENT_ORDER: PropertyIntent[] = ["acheter", "louer", "sejour"];
const INTENT_SHORT: Record<PropertyIntent, string> = {
  acheter: "À vendre",
  louer: "À louer",
  sejour: "Séjours",
};
const PRICE_BUCKETS = [
  { id: "tous", label: "Tous les prix", test: (price: number) => price >= 0 },
  { id: "moins-1m", label: "Moins de 1 000 000 FCFA", test: (price: number) => price < 1_000_000 },
  {
    id: "1m-50m",
    label: "De 1 à 50 millions FCFA",
    test: (price: number) => price >= 1_000_000 && price <= 50_000_000,
  },
  { id: "plus-50m", label: "Plus de 50 millions FCFA", test: (price: number) => price > 50_000_000 },
] as const;
type PriceBucketId = (typeof PRICE_BUCKETS)[number]["id"];
const SORTS = [
  { id: "recent", label: "Plus récents" },
  { id: "ancien", label: "Plus anciens" },
  { id: "prix-croissant", label: "Prix croissant" },
  { id: "prix-decroissant", label: "Prix décroissant" },
  { id: "surface", label: "Surface décroissante" },
  { id: "titre", label: "Titre A–Z" },
] as const;
type SortId = (typeof SORTS)[number]["id"];
const HERO_MEDIA =
  PROPERTIES.filter((property) => property.type === "villa")[1]?.media ??
  PROPERTIES.find((property) => property.type === "villa")?.media ??
  "page-cotonou";

type Filters = {
  types: PropertyType[];
  city: string;
  price: PriceBucketId;
  intents: PropertyIntent[];
};
const EMPTY_FILTERS: Filters = { types: [], city: "toutes", price: "tous", intents: [] };

export function ClientFavorites() {
  const { account } = useAuth();
  const visitor = useVisitor();
  const [sort, setSort] = useState<SortId>("recent");
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  /* Les favoris sont lus sur le compte : le cœur d'une fiche et cette page
     montrent donc exactement la même liste, sur le même appareil ou un autre.
     Le serveur les rend le plus récemment ajouté d'abord. */
  const accountFavorites = useServerResource<{ items: Property[]; ids: string[] }>(
    account ? "/api/favorites" : null,
  );
  const favorites = useMemo<Property[]>(() => {
    if (account) return accountFavorites.data?.items ?? [];
    return visitor.favorites
      .map((id) => PROPERTIES.find((property) => property.id === id))
      .filter(isProperty);
  }, [account, accountFavorites.data, visitor.favorites]);
  const loading = !visitor.ready || (account != null && accountFavorites.loading);

  const typeCounts = useMemo(() => {
    const counts = { villa: 0, appartement: 0, studio: 0, chambre: 0, immeuble: 0, terrain: 0, boutique: 0 } as Record<PropertyType, number>;
    for (const property of favorites) counts[property.type] += 1;
    return counts;
  }, [favorites]);
  const intentCounts = useMemo(() => {
    const counts = { acheter: 0, louer: 0, sejour: 0 } as Record<PropertyIntent, number>;
    for (const property of favorites) counts[property.intent] += 1;
    return counts;
  }, [favorites]);
  const cities = useMemo(
    () => [...new Set(favorites.map((property) => property.city))].sort((a, b) => a.localeCompare(b, "fr")),
    [favorites],
  );
  const filtered = useMemo(() => {
    const bucket = PRICE_BUCKETS.find((entry) => entry.id === applied.price) ?? PRICE_BUCKETS[0];
    return favorites.filter(
      (property) =>
        (applied.types.length === 0 || applied.types.includes(property.type)) &&
        (applied.city === "toutes" || property.city === applied.city) &&
        bucket.test(property.price) &&
        (applied.intents.length === 0 || applied.intents.includes(property.intent)),
    );
  }, [favorites, applied]);
  const sorted = useMemo(() => {
    if (sort === "recent") return filtered;
    const list = [...filtered];
    switch (sort) {
      case "ancien":
        return list.reverse();
      case "prix-croissant":
        return list.sort((a, b) => a.price - b.price);
      case "prix-decroissant":
        return list.sort((a, b) => b.price - a.price);
      case "surface":
        return list.sort((a, b) => b.surface - a.surface);
      case "titre":
        return list.sort((a, b) => a.title.localeCompare(b.title, "fr"));
    }
  }, [filtered, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const applyFilters = () => {
    setApplied(draft);
    setPage(1);
  };
  const resetFilters = () => {
    setApplied(EMPTY_FILTERS);
    setDraft(EMPTY_FILTERS);
    setSort("recent");
    setPage(1);
  };
  const chipType = (type: PropertyType | null) => {
    const types = type ? [type] : [];
    setApplied((current) => ({ ...current, types }));
    setDraft((current) => ({ ...current, types }));
    setPage(1);
  };
  const toggleDraft = (kind: "types" | "intents", value: PropertyType | PropertyIntent) => {
    setDraft((current) => {
      const list = (current[kind] as string[]).includes(value)
        ? (current[kind] as string[]).filter((entry) => entry !== value)
        : [...(current[kind] as string[]), value];
      return { ...current, [kind]: list };
    });
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="grid min-w-0 content-start gap-5">
        <section
          aria-labelledby="favoris-title"
          className="relative overflow-hidden rounded-3xl bg-homera-night text-white"
        >
          <div aria-hidden="true" className="absolute inset-0">
            <Visual
              mediaKey={HERO_MEDIA}
              alt=""
              sizes="(min-width: 1280px) 60rem, 100vw"
              veil="none"
              priority
              className="h-full w-full"
              imageClassName="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(20,12,8,.85)_25%,rgba(20,12,8,.45)_60%,rgba(20,12,8,.15))]" />
          </div>
          <div className="relative flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-homera-amber/60 bg-homera-amber/15 text-homera-amber">
                <Heart className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 id="favoris-title" className="font-serif text-display-md text-white sm:text-display-lg">
                  Mes favoris
                </h1>
                <p className="mt-2 max-w-md text-body-sm leading-relaxed text-white/80">
                  Retrouvez ici tous les biens que vous avez enregistrés pour les consulter plus tard.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-homera-cream/95 px-5 py-4">
              <Bookmark className="h-5 w-5 shrink-0 text-homera-terracotta" aria-hidden="true" />
              <p className="text-caption leading-snug text-homera-night">
                <span className="block text-muted">Vous avez</span>
                <span className="block font-serif text-display-xs">{favoriteLabel(favorites.length)}</span>
                <span className="block text-muted">Continuez à explorer pour en découvrir plus.</span>
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div aria-busy="true" aria-live="polite" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <span className="sr-only">Lecture de vos favoris…</span>
            <div className="homera-skeleton h-72" />
            <div className="homera-skeleton h-72" />
            <div className="homera-skeleton hidden h-72 xl:block" />
          </div>
        ) : favorites.length === 0 ? (
          <EmptyPanel
            icon={Heart}
            title="Votre sélection est vide"
            description="Ajoutez un bien avec le bouton cœur depuis les résultats ou sa fiche : la sélection est enregistrée sur votre compte."
            action={
              <Link href="/explorer" className={BUTTON_PRIMARY}>
                Voir les biens <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par type de bien">
                <FilterChip
                  active={applied.types.length === 0}
                  onClick={() => chipType(null)}
                  label={`Tous (${favorites.length})`}
                />
                {TYPE_ORDER.filter((type) => typeCounts[type] > 0).map((type) => (
                  <FilterChip
                    key={type}
                    active={applied.types.length === 1 && applied.types[0] === type}
                    onClick={() => chipType(type)}
                    label={`${TYPE_PLURALS[type]} (${typeCounts[type]})`}
                  />
                ))}
              </div>
              <label className="inline-flex items-center gap-2 text-caption font-semibold text-muted">
                Trier par :
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as SortId);
                    setPage(1);
                  }}
                  aria-label="Trier les favoris"
                  className="min-h-10 rounded-full border border-border bg-card px-3 text-note font-semibold text-foreground focus:border-homera-terracotta focus:outline-none"
                >
                  {SORTS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filtered.length === 0 ? (
              <EmptyPanel
                icon={Heart}
                title="Aucun favori ne correspond à ces filtres"
                description="Élargissez les critères ou réinitialisez pour retrouver toute la sélection."
                action={
                  <button type="button" onClick={resetFilters} className={BUTTON_SECONDARY}>
                    Réinitialiser les filtres
                  </button>
                }
              />
            ) : (
              <>
                <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {pageItems.map((property) => (
                    <li key={property.id} className="min-w-0">
                      <PropertyCard property={property} layout="grid" />
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-caption text-muted">{totalLabel(sorted.length)}</p>
                  <nav aria-label="Pages des favoris" className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage(Math.max(1, safePage - 1))}
                      disabled={safePage <= 1}
                      aria-label="Page précédente"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                      <button
                        key={number}
                        type="button"
                        onClick={() => setPage(number)}
                        aria-label={`Page ${number}`}
                        aria-current={number === safePage ? "page" : undefined}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-note font-semibold transition-colors ${
                          number === safePage
                            ? "bg-homera-night text-white"
                            : "border border-border bg-card text-foreground hover:border-homera-terracotta hover:text-homera-terracotta"
                        }`}
                      >
                        {number}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                      disabled={safePage >= totalPages}
                      aria-label="Page suivante"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </>
            )}

            {filtered.length >= 2 && (
              <div>
                <PropertyComparison properties={filtered} />
              </div>
            )}
          </>
        )}

        <div>
          <DemoNotice>Les favoris sont partagés avec la page publique /favoris.</DemoNotice>
        </div>
      </div>

      <div className="grid min-w-0 content-start gap-5">
        {favorites.length > 0 && (
          <section
            aria-labelledby="filtres-title"
            className="rounded-2xl border border-border bg-card p-5"
          >
            <h2 id="filtres-title" className="text-body font-semibold text-foreground">
              Filtres
            </h2>
            <div className="mt-4 space-y-5">
              <fieldset>
                <legend className="text-note font-semibold text-foreground">Type de bien</legend>
                <ul className="mt-2 space-y-1.5">
                  {TYPE_ORDER.map((type) => (
                    <li key={type}>
                      <label className="flex cursor-pointer items-center gap-2.5 text-note text-foreground">
                        <input
                          type="checkbox"
                          checked={draft.types.includes(type)}
                          onChange={() => toggleDraft("types", type)}
                          className="h-4 w-4 shrink-0 accent-homera-terracotta"
                        />
                        <span className="flex-1">{TYPE_PLURALS[type]}</span>
                        <span className="text-caption text-muted">{typeCounts[type]}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <div>
                <label htmlFor="favoris-ville" className="text-note font-semibold text-foreground">
                  Localisation
                </label>
                <select
                  id="favoris-ville"
                  value={draft.city}
                  onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                  className={`${INPUT_CLASS} mt-2`}
                >
                  <option value="toutes">Toutes les villes</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="favoris-prix" className="text-note font-semibold text-foreground">
                  Prix
                </label>
                <select
                  id="favoris-prix"
                  value={draft.price}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, price: event.target.value as PriceBucketId }))
                  }
                  className={`${INPUT_CLASS} mt-2`}
                >
                  {PRICE_BUCKETS.map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>
                      {bucket.label}
                    </option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="text-note font-semibold text-foreground">Statut</legend>
                <ul className="mt-2 space-y-1.5">
                  {INTENT_ORDER.map((intent) => (
                    <li key={intent}>
                      <label className="flex cursor-pointer items-center gap-2.5 text-note text-foreground">
                        <input
                          type="checkbox"
                          checked={draft.intents.includes(intent)}
                          onChange={() => toggleDraft("intents", intent)}
                          className="h-4 w-4 shrink-0 accent-homera-terracotta"
                        />
                        <span className="flex-1">{INTENT_SHORT[intent]}</span>
                        <span className="text-caption text-muted">{intentCounts[intent]}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <button
                type="button"
                onClick={applyFilters}
                className="homera-press flex min-h-11 w-full items-center justify-center rounded-btn bg-homera-night px-4 text-note font-semibold text-white transition-colors hover:bg-homera-night/90"
              >
                Appliquer les filtres
              </button>
            </div>
          </section>
        )}

        <section
          aria-labelledby="alerte-title"
          className="rounded-2xl border border-homera-terracotta/20 bg-homera-terracotta/[0.05] p-5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-homera-terracotta/[0.10] text-homera-terracotta">
            <Heart className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 id="alerte-title" className="mt-3 text-body font-semibold text-foreground">
            Vous n’avez pas trouvé ce que vous cherchez ?
          </h2>
          <p className="mt-1 text-caption leading-relaxed text-muted">
            Les alertes automatiques ne sont pas actives dans le pilote. Réglez les notifications de
            votre espace.
          </p>
          <Link
            href="/client/parametres"
            className="homera-press mt-4 inline-flex min-h-10 items-center gap-2 rounded-btn bg-homera-amber px-4 text-note font-semibold text-homera-night transition-colors hover:bg-homera-amber/90"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            Voir mes préférences
          </Link>
        </section>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`homera-press min-h-10 rounded-full px-4 text-note font-semibold transition-colors ${
        active
          ? "bg-homera-night text-white"
          : "border border-border bg-card text-foreground hover:border-homera-terracotta hover:text-homera-terracotta"
      }`}
    >
      {label}
    </button>
  );
}

function isProperty(value: Property | undefined): value is Property {
  return Boolean(value);
}

function favoriteLabel(count: number): string {
  if (count === 0) return "Aucun bien favori";
  return `${count} bien${count > 1 ? "s" : ""} favori${count > 1 ? "s" : ""}`;
}

function totalLabel(count: number): string {
  return `${count} bien${count > 1 ? "s" : ""} au total`;
}

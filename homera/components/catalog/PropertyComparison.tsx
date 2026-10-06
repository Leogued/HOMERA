"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Check, MapPin, Scale, ShieldCheck } from "lucide-react";
import { FEATURE_LABELS, type Property } from "@/lib/content";
import {
  INTENT_LABELS,
  LAND_TITLE_LABELS,
  TYPE_LABELS,
  formatFCFA,
  formatPropertyPrice,
  formatSurface,
} from "@/lib/format";
import { Visual } from "@/components/ui/Visual";

const MAX_COMPARE = 3;

export function PropertyComparison({ properties }: { properties: Property[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    properties.slice(0, MAX_COMPARE).map((property) => property.id),
  );

  if (properties.length < 2) {
    return null;
  }

  const validSelectedIds = selectedIds.filter((id) => properties.some((property) => property.id === id));
  const activeIds =
    validSelectedIds.length >= 2
      ? validSelectedIds.slice(0, MAX_COMPARE)
      : properties.slice(0, MAX_COMPARE).map((property) => property.id);

  const compared = activeIds
    .map((id) => properties.find((property) => property.id === id))
    .filter((property): property is Property => Boolean(property));

  const toggleProperty = (id: string) => {
    if (activeIds.includes(id)) {
      if (activeIds.length <= 2) return;
      setSelectedIds(activeIds.filter((entry) => entry !== id));
      return;
    }
    if (activeIds.length >= MAX_COMPARE) {
      setSelectedIds([...activeIds.slice(1), id]);
      return;
    }
    setSelectedIds([...activeIds, id]);
  };

  return (
    <section
      aria-labelledby="comparateur-favoris-titre"
      className="rounded-card border border-border bg-card p-5 shadow-card sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="inline-flex items-center gap-2 text-label uppercase text-homera-terracotta">
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            Aide à la décision
          </p>
          <h2 id="comparateur-favoris-titre" className="mt-1.5 font-serif text-display-xs sm:text-display-sm">
            Comparer vos biens côte à côte
          </h2>
          <p className="mt-1 text-caption leading-relaxed text-muted">
            Prix, surface, situation foncière, vérification documentaire et équipements sur une même grille de lecture.
          </p>
        </div>
        {properties.length > 2 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Choisir les biens à comparer">
            {properties.map((property) => {
              const active = activeIds.includes(property.id);
              return (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => toggleProperty(property.id)}
                  aria-pressed={active}
                  className={`homera-press min-h-9 rounded-full border px-3 py-1 text-caption font-semibold transition-colors ${
                    active
                      ? "border-homera-brown bg-homera-brown text-white"
                      : "border-border bg-background text-muted hover:border-homera-terracotta hover:text-foreground"
                  }`}
                >
                  {property.title.split(" ").slice(0, 3).join(" ")}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        className={`mt-6 grid grid-cols-1 gap-5 ${
          compared.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {compared.map((property) => {
          const pricePerSqm =
            property.surface > 0 ? Math.round(property.price / property.surface) : null;
          const available = property.availabilityStatus !== "indisponible";

          return (
            <article
              key={property.id}
              className="flex flex-col justify-between rounded-card border border-border bg-background p-4 sm:p-5"
            >
              <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-media">
                  <Visual
                    mediaKey={property.media}
                    alt={property.alt}
                    sizes="(min-width: 1280px) 28vw, (min-width: 768px) 44vw, 92vw"
                    veil="none"
                    quality={70}
                    className="h-full w-full"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-homera-night/85 px-2.5 py-1 text-micro font-semibold uppercase tracking-[0.14em] text-white">
                    {INTENT_LABELS[property.intent]} · {TYPE_LABELS[property.type]}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="font-mono text-micro text-muted">{property.homeraId}</p>
                  <h3 className="mt-1 font-serif text-display-xs">
                    <Link href={`/biens/${property.id}`} className="hover:text-homera-terracotta">
                      {property.title}
                    </Link>
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-caption text-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-homera-terracotta" aria-hidden="true" />
                    {property.district}, {property.city}
                  </p>
                </div>

                <dl className="mt-4 divide-y divide-border border-y border-border text-caption">
                  <div className="flex items-baseline justify-between gap-2 py-2.5">
                    <dt className="text-muted">Prix affiché</dt>
                    <dd className="homera-num font-semibold text-foreground">
                      {formatPropertyPrice(property)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 py-2.5">
                    <dt className="text-muted">Surface</dt>
                    <dd className="homera-num font-medium text-foreground">
                      {formatSurface(property.surface)}
                      {pricePerSqm && property.intent === "acheter" ? (
                        <span className="text-muted"> · {formatFCFA(pricePerSqm)}/m²</span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 py-2.5">
                    <dt className="text-muted">Configuration</dt>
                    <dd className="homera-num font-medium text-foreground">
                      {property.type === "terrain"
                        ? "Parcelle nue"
                        : `${property.rooms ?? 1} p. · ${property.bedrooms} ch. · ${property.bathrooms} sdb`}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 py-2.5">
                    <dt className="text-muted">
                      {property.type === "terrain"
                        ? "Situation foncière"
                        : property.intent === "sejour"
                          ? "Séjour minimal"
                          : "Niveau / accès"}
                    </dt>
                    <dd className="font-medium text-foreground">
                      {property.landTitle
                        ? LAND_TITLE_LABELS[property.landTitle]
                        : property.minNights
                          ? `${property.minNights} nuit${property.minNights > 1 ? "s" : ""}`
                          : property.floor ?? "Accès direct"}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 py-2.5">
                    <dt className="text-muted">Contrôle HOMERA</dt>
                    <dd className="homera-num inline-flex items-center gap-1 font-medium text-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                      Vérifié le {property.verifiedOn}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 py-2.5">
                    <dt className="text-muted">Disponibilité</dt>
                    <dd className={`font-semibold ${available ? "text-success" : "text-error"}`}>
                      {available ? "Disponible" : "Indisponible"}
                    </dd>
                  </div>
                </dl>

                {property.features && property.features.length > 0 && (
                  <div className="mt-3">
                    <p className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">
                      Équipements principaux
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {property.features.slice(0, 4).map((feature) => (
                        <li
                          key={feature}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-micro font-medium text-foreground"
                        >
                          <Check className="h-3 w-3 text-homera-terracotta" aria-hidden="true" />
                          {FEATURE_LABELS[feature]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 pt-2">
                <Link
                  href={`/biens/${property.id}`}
                  className="homera-press inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-btn border border-border bg-card px-3 text-caption font-semibold text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
                >
                  Lire la fiche
                </Link>
                {available && (
                  <Link
                    href={`/client/visites/nouvelle?bien=${property.id}`}
                    className="homera-press inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-btn homera-cta px-3 text-caption font-semibold text-white transition-colors"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Visiter
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

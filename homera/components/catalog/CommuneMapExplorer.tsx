"use client";

import { useMemo } from "react";
import { Compass, MapPin, RotateCcw } from "lucide-react";
import { PROPERTIES } from "@/lib/content";
import { countLabel } from "@/lib/format";
import type { CatalogFacets, CatalogQuery } from "@/lib/properties";

type CommuneMeta = {
  name: string;
  axis: string;
  summary: string;
  x: number;
  y: number;
  labelAlign: "start" | "middle" | "end";
};

const COMMUNES: CommuneMeta[] = [
  {
    name: "Ouidah",
    axis: "Côte Ouest · Route des Pêches",
    summary: "Résidences côtières, villas de séjour et parcelles proches du littoral historique.",
    x: 108,
    y: 162,
    labelAlign: "middle",
  },
  {
    name: "Abomey-Calavi",
    axis: "Plateau Nord · Grand Nokoué",
    summary: "Pôle résidentiel en forte croissance : parcelles titrées, villas familiales et studios.",
    x: 286,
    y: 78,
    labelAlign: "middle",
  },
  {
    name: "Cotonou",
    axis: "Cœur économique · Littoral",
    summary: "Quartiers d’affaires et résidentiels prisés : Fidjrossè, Haie Vive, Ganhi, Cadjèhoun, Akpakpa.",
    x: 334,
    y: 158,
    labelAlign: "middle",
  },
  {
    name: "Porto-Novo",
    axis: "Est lagunaire · Capitale",
    summary: "Cadre résidentiel calme autour de la lagune : maisons familiales, terrains et locaux.",
    x: 498,
    y: 112,
    labelAlign: "middle",
  },
];

export function CommuneMapExplorer({
  query,
  facets,
  onChange,
}: {
  query: CatalogQuery;
  facets: CatalogFacets;
  onChange: (patch: Partial<CatalogQuery>) => void;
}) {
  const activeCity = query.cities.length === 1 ? query.cities[0] : null;
  const focusedMeta = COMMUNES.find((commune) => commune.name === activeCity) ?? null;

  const districtsByCity = useMemo(() => {
    const map = new Map<string, { name: string; count: number }[]>();
    for (const commune of COMMUNES) {
      const counts = new Map<string, number>();
      for (const property of PROPERTIES) {
        if (property.city !== commune.name) continue;
        counts.set(property.district, (counts.get(property.district) ?? 0) + 1);
      }
      map.set(
        commune.name,
        [...counts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr")),
      );
    }
    return map;
  }, []);

  const toggleCity = (city: string) => {
    const exists = query.cities.includes(city);
    const nextCities = exists ? query.cities.filter((entry) => entry !== city) : [city];
    const allowedDistricts = new Set(
      PROPERTIES.filter((property) => nextCities.length === 0 || nextCities.includes(property.city)).map(
        (property) => property.district,
      ),
    );
    const nextDistricts = query.districts.filter((district) => allowedDistricts.has(district));
    onChange({ cities: nextCities, districts: nextDistricts });
  };

  const toggleDistrict = (city: string, district: string) => {
    const exists = query.districts.includes(district);
    const nextDistricts = exists
      ? query.districts.filter((entry) => entry !== district)
      : [...query.districts, district];
    const nextCities = query.cities.includes(city) ? query.cities : [...query.cities, city];
    onChange({ cities: nextCities, districts: nextDistricts });
  };

  return (
    <section
      aria-labelledby="commune-map-title"
      className="mt-6 rounded-card border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="inline-flex items-center gap-2 text-label uppercase text-homera-terracotta">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            Repères géographiques · Sud-Bénin
          </p>
          <h2 id="commune-map-title" className="mt-1 font-serif text-display-xs">
            Explorer par commune et quartier
          </h2>
          <p className="mt-1 text-caption leading-relaxed text-muted">
            Sélectionnez une commune sur la carte du littoral ou cliquez directement sur un quartier vérifié.
          </p>
        </div>
        {(query.cities.length > 0 || query.districts.length > 0) && (
          <button
            type="button"
            onClick={() => onChange({ cities: [], districts: [] })}
            className="homera-press inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-caption font-semibold text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Toutes les communes
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_1fr] xl:items-center">
        <div className="overflow-hidden rounded-media border border-border bg-background p-3 sm:p-4">
          <svg
            viewBox="0 0 600 225"
            role="img"
            aria-label="Carte schématique des communes couvertes par HOMERA : Ouidah, Abomey-Calavi, Cotonou et Porto-Novo"
            className="h-auto w-full select-none text-foreground"
          >
            <title>Corridor littoral et lagunaire HOMERA : Ouidah, Abomey-Calavi, Cotonou, Porto-Novo</title>
            <path
              d="M 0 182 Q 160 174 330 172 T 600 160 L 600 225 L 0 225 Z"
              fill="var(--homera-terracotta)"
              fillOpacity="0.08"
            />
            <path
              d="M 0 182 Q 160 174 330 172 T 600 160"
              fill="none"
              stroke="var(--homera-terracotta)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              strokeOpacity="0.55"
            />
            <ellipse
              cx="322"
              cy="122"
              rx="48"
              ry="20"
              fill="var(--homera-amber)"
              fillOpacity="0.14"
              stroke="var(--border)"
              strokeWidth="1"
            />
            <ellipse
              cx="472"
              cy="134"
              rx="38"
              ry="14"
              fill="var(--homera-amber)"
              fillOpacity="0.14"
              stroke="var(--border)"
              strokeWidth="1"
            />
            <path
              d="M 108 162 Q 220 164 334 158 L 286 78 M 334 158 Q 415 138 498 112"
              fill="none"
              stroke="var(--border)"
              strokeWidth="2"
            />
            <text
              x="322"
              y="125"
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="9"
              fontWeight="600"
              letterSpacing="1.2"
            >
              LAC NOKOUÉ
            </text>
            <text
              x="500"
              y="206"
              textAnchor="end"
              fill="var(--muted)"
              fontSize="9"
              fontWeight="600"
              letterSpacing="1.6"
            >
              OCÉAN ATLANTIQUE · GOLFE DE GUINÉE
            </text>
            <text
              x="215"
              y="153"
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="8.5"
              letterSpacing="0.8"
            >
              Route des Pêches
            </text>
            {COMMUNES.map((commune) => {
              const selected = query.cities.includes(commune.name);
              const count = facets.cities.find((entry) => entry.value === commune.name)?.count ?? 0;
              return (
                <g
                  key={commune.name}
                  onClick={() => toggleCity(commune.name)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={commune.x}
                    cy={commune.y}
                    r={selected ? 22 : 16}
                    fill="var(--homera-terracotta)"
                    fillOpacity={selected ? "0.2" : "0.08"}
                  />
                  <circle
                    cx={commune.x}
                    cy={commune.y}
                    r={selected ? 10 : 8}
                    fill={selected ? "var(--homera-terracotta)" : "var(--card)"}
                    stroke={selected ? "var(--homera-terracotta)" : "var(--foreground)"}
                    strokeWidth="2.5"
                  />
                  <text
                    x={commune.x}
                    y={commune.y - 16}
                    textAnchor={commune.labelAlign}
                    fill="var(--foreground)"
                    fontSize="12"
                    fontWeight="700"
                  >
                    {commune.name}
                  </text>
                  <text
                    x={commune.x}
                    y={commune.y + 24}
                    textAnchor={commune.labelAlign}
                    fill="var(--muted)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {count} bien{count > 1 ? "s" : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="group" aria-label="Filtrer par commune">
            {COMMUNES.map((commune) => {
              const selected = query.cities.includes(commune.name);
              const count = facets.cities.find((entry) => entry.value === commune.name)?.count ?? 0;
              return (
                <button
                  key={commune.name}
                  type="button"
                  onClick={() => toggleCity(commune.name)}
                  aria-pressed={selected}
                  className={`homera-press flex flex-col items-start justify-between rounded-card border p-3.5 text-left transition-colors ${
                    selected
                      ? "border-homera-terracotta bg-homera-terracotta/[0.07]"
                      : "border-border bg-background hover:border-homera-terracotta/45"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                      {commune.name}
                    </span>
                    <span className="homera-num rounded-full border border-border bg-card px-2 py-0.5 text-micro font-semibold text-muted">
                      {countLabel(count)}
                    </span>
                  </div>
                  <span className="mt-1 text-micro font-semibold uppercase tracking-[0.12em] text-homera-terracotta">
                    {commune.axis}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-card border border-border bg-background p-4">
            <p className="text-micro font-semibold uppercase tracking-[0.14em] text-muted">
              {focusedMeta ? `Quartiers vérifiés · ${focusedMeta.name}` : "Quartiers phares du catalogue"}
            </p>
            {focusedMeta && (
              <p className="mt-1 text-caption leading-relaxed text-muted">{focusedMeta.summary}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(focusedMeta
                ? (districtsByCity.get(focusedMeta.name) ?? []).map((entry) => ({
                    city: focusedMeta.name,
                    name: entry.name,
                    count: entry.count,
                  }))
                : COMMUNES.flatMap((commune) =>
                    (districtsByCity.get(commune.name) ?? []).slice(0, 2).map((entry) => ({
                      city: commune.name,
                      name: entry.name,
                      count: entry.count,
                    })),
                  )
              ).map((district) => {
                const active = query.districts.includes(district.name);
                return (
                  <button
                    key={`${district.city}-${district.name}`}
                    type="button"
                    onClick={() => toggleDistrict(district.city, district.name)}
                    aria-pressed={active}
                    className={`homera-press inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-medium transition-colors ${
                      active
                        ? "border-homera-brown bg-homera-brown text-white"
                        : "border-border bg-card text-foreground hover:border-homera-terracotta hover:text-homera-terracotta"
                    }`}
                  >
                    <span>{district.name}</span>
                    <span className={`homera-num text-micro ${active ? "text-white/75" : "text-muted"}`}>
                      {district.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

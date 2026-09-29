"use client";

import { useState } from "react";
import { ShieldCheck, MapPin, Bed, Bath, Maximize, Calendar, ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Property {
  id: string;
  homeraId: string;
  title: string;
  type: string;
  intent: "louer" | "acheter" | "sejour";
  price: string;
  pricePeriod?: string;
  location: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  surface: number;
  verificationDate: string;
  status: "Vérifié" | "En attente";
}

const mockProperties: Property[] = [
  {
    id: "1",
    homeraId: "HOM-CTN-000421",
    title: "Villa Moderne 4 Chambres & Jardin Tropical",
    type: "villas",
    intent: "louer",
    price: "450 000 FCFA",
    pricePeriod: "/ mois",
    location: "Fidjrossè Calvaire",
    city: "Cotonou",
    bedrooms: 4,
    bathrooms: 3,
    surface: 280,
    verificationDate: "12/09/2026",
    status: "Vérifié",
  },
  {
    id: "2",
    homeraId: "HOM-CTN-000305",
    title: "Appartement F3 avec Balcon & Vue Dégagée",
    type: "appartements",
    intent: "louer",
    price: "220 000 FCFA",
    pricePeriod: "/ mois",
    location: "Haie Vive",
    city: "Cotonou",
    bedrooms: 2,
    bathrooms: 2,
    surface: 110,
    verificationDate: "05/09/2026",
    status: "Vérifié",
  },
  {
    id: "3",
    homeraId: "HOM-CAL-000108",
    title: "Parcelle Clôturée de 500m² avec Titre Foncier",
    type: "terrains",
    intent: "acheter",
    price: "18 500 000 FCFA",
    location: "Tankpè Carrefour",
    city: "Abomey-Calavi",
    bedrooms: 0,
    bathrooms: 0,
    surface: 500,
    verificationDate: "14/09/2026",
    status: "Vérifié",
  },
  {
    id: "4",
    homeraId: "HOM-CTN-000512",
    title: "Duplex de Standing Meublé pour Séjour",
    type: "appartements",
    intent: "sejour",
    price: "45 000 FCFA",
    pricePeriod: "/ nuité",
    location: "Ganhi",
    city: "Cotonou",
    bedrooms: 2,
    bathrooms: 2,
    surface: 95,
    verificationDate: "18/09/2026",
    status: "Vérifié",
  },
];

export function FeaturedProperties() {
  const [filterType, setFilterType] = useState<string>("tous");

  const filteredProperties =
    filterType === "tous"
      ? mockProperties
      : mockProperties.filter((p) => p.type === filterType);

  return (
    <section id="biens" className="py-20 bg-muted/10 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-block px-4 py-1.5 rounded-full text-[11px] font-semibold bg-homera-terracotta/10 text-homera-terracotta border border-homera-terracotta/30 uppercase tracking-[0.16em]">
              Sélection Certifiée
            </div>
            <h2 className="font-serif text-display-sm sm:text-display-md text-foreground">
              Des biens qui méritent votre attention
            </h2>
            <p className="text-muted text-[13px] sm:text-[0.9375rem] max-w-xl leading-relaxed">
              Chaque bien possède son identifiant unique HOMERA et sa fiche de vérification d&apos;identité et de mandat.
            </p>
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { id: "tous", label: "Tous" },
              { id: "villas", label: "Villas" },
              { id: "appartements", label: "Appartements" },
              { id: "terrains", label: "Terrains" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-4 py-2 rounded-xl text-[12.5px] font-medium tracking-[0.01em] transition-all whitespace-nowrap ${
                  filterType === tab.id
                    ? "bg-homera-brown text-white shadow-sm"
                    : "bg-card border border-border text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between group"
            >
              {/* Image Container with Badges */}
              <div className="relative h-56 bg-stone-800 overflow-hidden flex items-center justify-center">
                {/* Fallback gradient placeholder */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent z-10" />
                <div className="text-stone-400 text-xs font-mono uppercase tracking-widest z-0">
                  {property.title}
                </div>

                {/* Intent Tag (Top Left) */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest bg-homera-brown/90 backdrop-blur-md text-white border border-white/20">
                    {property.intent === "louer" && "À Louer"}
                    {property.intent === "acheter" && "À Vendre"}
                    {property.intent === "sejour" && "Séjour"}
                  </span>
                </div>

                {/* Verification Badge (Top Right) */}
                <div className="absolute top-4 right-4 z-20">
                  <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/90 backdrop-blur-md text-white flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Vérifié HOMERA
                  </span>
                </div>

                {/* Homera Unique ID Overlay (Bottom Left) */}
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                  <span className="font-mono text-[11px] font-medium tracking-[0.04em] text-homera-terracotta bg-black/60 px-2.5 py-1 rounded-md border border-homera-terracotta/40">
                    {property.homeraId}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  {/* Location */}
                  <div className="flex items-center text-[11.5px] text-muted font-medium gap-1">
                    <MapPin className="w-3.5 h-3.5 text-homera-terracotta" />
                    <span>
                      {property.location}, {property.city}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-homera-terracotta transition-colors line-clamp-2">
                    {property.title}
                  </h3>
                </div>

                {/* Property Specs */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border text-xs text-muted homera-num">
                  {property.bedrooms > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-homera-brown dark:text-homera-terracotta" />
                      <span>{property.bedrooms} ch.</span>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Bath className="w-4 h-4 text-homera-brown dark:text-homera-terracotta" />
                      <span>{property.bathrooms} sdb.</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Maximize className="w-4 h-4 text-homera-brown dark:text-homera-terracotta" />
                    <span>{property.surface} m²</span>
                  </div>
                </div>

                {/* Price & Action */}
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[17px] font-semibold text-homera-brown dark:text-homera-terracotta homera-num">
                      {property.price}
                    </span>
                    {property.pricePeriod && (
                      <span className="text-xs text-muted ml-1">
                        {property.pricePeriod}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Eye className="w-3.5 h-3.5" />
                    Fiche du bien
                  </Button>
                </div>
              </div>

              {/* Card Footer Verification Info */}
              <div className="bg-muted/20 px-6 py-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted homera-num">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-homera-terracotta" />
                  Vérifié le {property.verificationDate}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Mandat Valide
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center pt-4">
          <Button variant="primary" size="lg" className="gap-2">
            Voir tous les biens certifiés au Bénin
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { Search, MapPin, Building2, Wallet } from "lucide-react";

type IntentType = "acheter" | "louer" | "sejour";

export function Hero() {
  const [activeIntent, setActiveIntent] = useState<IntentType>("acheter");
  const [location, setLocation] = useState("Cotonou");
  const [propertyType, setPropertyType] = useState("");
  const [budget, setBudget] = useState("");

  return (
    <section className="relative isolate overflow-hidden bg-black text-white pt-34 pb-16 sm:pt-42 sm:pb-24">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/video/background_video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/35" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8 text-center">
        {/* Main Title — DM Serif Display, graisse 400 (aucun faux gras) */}
        <h1 className="font-serif text-display-sm sm:text-display-lg lg:text-display-xl text-white max-w-4xl mx-auto">
          L&apos;immobilier au Bénin en toute <br />
          <span className="homera-accent text-[1.06em]">simplicité</span>
        </h1>

        {/* Subtitle */}
        <p className="text-stone-300 text-sm sm:text-[0.9375rem] max-w-2xl mx-auto font-sans font-normal leading-relaxed">
          Immobilier en toute sérénité, sans surprise ni intermédiaire douteux — la plateforme de confiance pour tous vos projets au Bénin.
        </p>

        {/* Floating White Search Widget */}
        <div className="mt-8 max-w-4xl mx-auto bg-card dark:bg-[#2B1A12] text-stone-800 dark:text-white p-5 sm:p-7 rounded-3xl shadow-2xl border border-stone-200/50 dark:border-white/10 text-left space-y-5">
          {/* Tabs */}
          <div className="flex border-b border-stone-200 dark:border-white/10 pb-3 gap-2">
            <button
              onClick={() => setActiveIntent("acheter")}
              className={`px-5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                activeIntent === "acheter"
                  ? "bg-[#2A170F] text-white shadow-md"
                  : "text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5"
              }`}
            >
              Acheter
            </button>
            <button
              onClick={() => setActiveIntent("louer")}
              className={`px-5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                activeIntent === "louer"
                  ? "bg-[#2A170F] text-white shadow-md"
                  : "text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5"
              }`}
            >
              Louer
            </button>
            <button
              onClick={() => setActiveIntent("sejour")}
              className={`px-5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                activeIntent === "sejour"
                  ? "bg-[#2A170F] text-white shadow-md"
                  : "text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5"
              }`}
            >
              Séjour
            </button>
          </div>

          {/* Input Fields Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Localisation */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-[0.02em] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-homera-terracotta" />
                Localisation
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#2A170F] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-[13px] font-normal focus:outline-none focus:ring-2 focus:ring-homera-terracotta"
              >
                <option value="Cotonou">Cotonou (Fidjrossè, Akpakpa...)</option>
                <option value="Abomey-Calavi">Abomey-Calavi (Tankpè, Akassato...)</option>
                <option value="Porto-Novo">Porto-Novo</option>
                <option value="Ouidah">Ouidah</option>
              </select>
            </div>

            {/* Type de bien */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-[0.02em] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-homera-terracotta" />
                Type de bien
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#2A170F] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-[13px] font-normal focus:outline-none focus:ring-2 focus:ring-homera-terracotta"
              >
                <option value="">Tous les types</option>
                <option value="appartement">Appartement / Studio</option>
                <option value="villa">Villa / Maison</option>
                <option value="terrain">Terrain nu / Parcelle</option>
                <option value="local">Local commercial</option>
              </select>
            </div>

            {/* Budget */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-[0.02em] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-homera-terracotta" />
                Budget max (XOF)
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#2A170F] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white text-[13px] font-normal focus:outline-none focus:ring-2 focus:ring-homera-terracotta"
              >
                <option value="">Indifférent</option>
                <option value="100k">100 000 FCFA</option>
                <option value="250k">250 000 FCFA</option>
                <option value="500k">500 000 FCFA</option>
                <option value="1m">1 000 000 FCFA +</option>
              </select>
            </div>

            {/* Submit Button */}
            <div>
              <button className="w-full bg-[#2A170F] hover:bg-[#3A2116] text-white font-medium text-[13px] py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl">
                <Search className="w-4 h-4 text-white" />
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Button } from "@/components/ui/Button";
import { CheckCircle2, ArrowRight, Home, Key, Hotel } from "lucide-react";

export function ExplorerSection() {
  return (
    <section id="explorer" className="py-20 bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold bg-homera-terracotta/10 text-homera-terracotta border border-homera-terracotta/30 uppercase tracking-widest">
            Explorer par intention
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Une vision fluide de vos ambitions <br className="hidden sm:block" />
            <span className="text-homera-terracotta italic">de vie au Bénin</span>
          </h2>
          <p className="text-muted text-base">
            Trouver, acheter ou louer un bien immobilier ne devrait jamais ressembler à un parcours du combattant.
          </p>
        </div>

        {/* 1. LOUER */}
        <div id="louer" className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-card border border-border p-8 rounded-3xl shadow-card scroll-mt-24">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-homera-brown/10 dark:bg-white/10 text-homera-brown dark:text-foreground text-xs font-semibold uppercase tracking-wider">
              <Key className="w-4 h-4 text-homera-terracotta" />
              Louer • Habitation
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Résidences de standing & appartements sans mauvaise surprise
            </h3>
            <p className="text-muted leading-relaxed">
              Pour se loger au quotidien à Cotonou ou Abomey-Calavi, accédez à des fiches descriptives complètes, des photos fidèles et une prise de rendez-vous de visite transparente.
            </p>
            <ul className="space-y-3 text-sm font-medium text-foreground">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-homera-terracotta flex-shrink-0" />
                <span>Visites sur créneau planifié et avis vérifiés</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-homera-terracotta flex-shrink-0" />
                <span>Parcours de location structuré (Demande $\rightarrow$ Contrat $\rightarrow$ Remise des clés)</span>
              </li>
            </ul>
            <div className="pt-2">
              <Button variant="primary" className="gap-2">
                Trouver un logement à louer
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Visual Showcase Block */}
          <div className="relative h-64 sm:h-80 rounded-2xl bg-gradient-to-tr from-homera-brown via-homera-brown-light to-stone-800 overflow-hidden flex items-center justify-center p-6 text-white text-center shadow-lg">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#c9a227_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10 space-y-3">
              <Home className="w-12 h-12 text-homera-terracotta mx-auto" />
              <h4 className="font-serif text-xl font-bold">Appartements & Villas</h4>
              <p className="text-xs text-stone-300 max-w-xs mx-auto">
                Du studio moderne à la villa familiale avec jardin à Fidjrossè ou Calavi.
              </p>
            </div>
          </div>
        </div>

        {/* 2. ACHETER */}
        <div id="acheter" className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-card border border-border p-8 rounded-3xl shadow-card lg:flex-row-reverse scroll-mt-24">
          {/* Visual Showcase Block */}
          <div className="relative h-64 sm:h-80 rounded-2xl bg-gradient-to-tr from-stone-900 via-homera-brown to-stone-800 overflow-hidden flex items-center justify-center p-6 text-white text-center shadow-lg lg:order-1">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#c9a227_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10 space-y-3">
              <Key className="w-12 h-12 text-homera-terracotta mx-auto" />
              <h4 className="font-serif text-xl font-bold">Terrains & Titres vérifiés</h4>
              <p className="text-xs text-stone-300 max-w-xs mx-auto">
                Acquisitions sécurisées pour résidents au Bénin et diaspora.
              </p>
            </div>
          </div>

          <div className="space-y-6 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-homera-terracotta/10 text-homera-terracotta text-xs font-semibold uppercase tracking-wider">
              <Home className="w-4 h-4 text-homera-terracotta" />
              Acheter • Patrimoine
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Acquérir un bien ou du foncier avec traçabilité intégrée
            </h3>
            <p className="text-muted leading-relaxed">
              Investissez en toute confiance. HOMERA identifie les propriétaires réels et s&apos;assure des autorisations de vente avant toute mise en relation.
            </p>
            <ul className="space-y-3 text-sm font-medium text-foreground">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-homera-terracotta flex-shrink-0" />
                <span>Examen des documents de propriété et autorisations de mandat</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-homera-terracotta flex-shrink-0" />
                <span>Historique du bien consultable pour une transaction sereine</span>
              </li>
            </ul>
            <div className="pt-2">
              <Button variant="accent" className="gap-2">
                Explorer les biens en vente
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 3. SÉJOURNER */}
        <div id="sejour" className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-card border border-border p-8 rounded-3xl shadow-card scroll-mt-24">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-homera-brown/10 dark:bg-white/10 text-homera-brown dark:text-foreground text-xs font-semibold uppercase tracking-wider">
              <Hotel className="w-4 h-4 text-homera-terracotta" />
              Séjour • Court Terme
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              L&apos;hospitalité béninoise dans des espaces de charme
            </h3>
            <p className="text-muted leading-relaxed">
              Voyageurs, professionnels en déplacement ou membres de la diaspora de passage au pays : réservez vos nuits ou semaines en toute tranquillité.
            </p>
            <ul className="space-y-3 text-sm font-medium text-foreground">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-homera-terracotta flex-shrink-0" />
                <span>Disponibilités actualisées et gestion d&apos;accueil personnalisée</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-homera-terracotta flex-shrink-0" />
                <span>Logements meublés et équipés aux standards vérifiés</span>
              </li>
            </ul>
            <div className="pt-2">
              <Button variant="outline" className="gap-2">
                Réserver un séjour temporaire
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Visual Showcase Block */}
          <div className="relative h-64 sm:h-80 rounded-2xl bg-gradient-to-tr from-amber-950 via-homera-brown to-stone-900 overflow-hidden flex items-center justify-center p-6 text-white text-center shadow-lg">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#c9a227_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10 space-y-3">
              <Hotel className="w-12 h-12 text-homera-terracotta mx-auto" />
              <h4 className="font-serif text-xl font-bold">Séjours Meublés</h4>
              <p className="text-xs text-stone-300 max-w-xs mx-auto">
                Des hébergements prêts à vivre pour vos déplacements à Cotonou et Calavi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

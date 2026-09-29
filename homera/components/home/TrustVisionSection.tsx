import { ShieldCheck, Globe, UserCheck, HeartHandshake, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function TrustVisionSection() {
  const pillars = [
    {
      title: "Sans démarche d'illusion ni surprise",
      desc: "Fini les photos non conformes, les frais de déplacement abusifs et les intermédiaires sans mandat clair.",
      icon: ShieldCheck,
    },
    {
      title: "Traçabilité irréfutable",
      desc: "Chaque bien possède son matricule unique et conservateur d'historique de propriété et de vérification.",
      icon: UserCheck,
    },
    {
      title: "Pensé pour la Diaspora & Résidents",
      desc: "Recherchez, vérifiez et suivez vos projets immobiliers au Bénin en toute tranquillité, où que vous soyez.",
      icon: Globe,
    },
    {
      title: "Cadre équitable et certifié",
      desc: "Propriétaires, mandataires autorisés et clients collaborent dans un environnement structuré et sécurisé.",
      icon: HeartHandshake,
    },
  ];

  return (
    <section className="py-20 bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Manifest Statement */}
        <div className="bg-homera-brown text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-card-hover">
          <div className="absolute top-0 right-0 w-80 h-80 bg-homera-terracotta/10 rounded-full blur-3xl pointer-events-none" />
          <span className="inline-block text-[11px] uppercase tracking-[0.16em] font-semibold text-homera-terracotta border border-homera-terracotta/30 px-3.5 py-1 rounded-full">
            Notre Déclaration
          </span>
          <h2 className="font-serif text-display-sm sm:text-display-md max-w-2xl mx-auto">
            Une conviction fondatrice : restaurer la confiance dans la pierre béninoise
          </h2>
          <p className="homera-accent text-[1.25rem] sm:text-[1.375rem] leading-[1.45] text-stone-300 max-w-xl mx-auto">
            « HOMERA ne cherche pas simplement à afficher des annonces. L&apos;objectif est de créer une véritable infrastructure numérique autour du bien immobilier. »
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="bg-card border border-border p-6 rounded-2xl shadow-card hover:border-homera-terracotta transition-all duration-300 space-y-4"
              >
                <div className="w-10 h-10 rounded-xl bg-homera-terracotta/10 text-homera-terracotta flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground leading-snug">
                  {pillar.title}
                </h3>
                <p className="text-[12.5px] text-muted leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Final Conversion Banner */}
        <div className="bg-gradient-to-r from-homera-brown via-homera-brown-light to-stone-900 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-card">
          <h3 className="font-serif text-display-xs sm:text-display-sm">
            Votre prochain bien est peut-être ici.
          </h3>
          <p className="text-muted-light text-[13px] max-w-lg mx-auto leading-relaxed">
            Découvrez nos logements et parcelles certifiés à Cotonou et Abomey-Calavi dès aujourd&apos;hui.
          </p>
          <div>
            <Button variant="accent" size="lg" className="gap-2">
              Rechercher maintenant
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

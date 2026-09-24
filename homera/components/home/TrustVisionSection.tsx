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
        <div className="bg-homera-blue text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-card-hover">
          <div className="absolute top-0 right-0 w-80 h-80 bg-homera-gold/10 rounded-full blur-3xl pointer-events-none" />
          <span className="inline-block text-xs uppercase tracking-widest font-semibold text-homera-gold border border-homera-gold/30 px-3.5 py-1 rounded-full">
            Notre Déclaration
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold max-w-2xl mx-auto leading-tight">
            Une conviction fondatrice : restaurer la confiance dans la pierre béninoise
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
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
                className="bg-card border border-border p-6 rounded-2xl shadow-card hover:border-homera-gold transition-all duration-300 space-y-4"
              >
                <div className="w-10 h-10 rounded-xl bg-homera-gold/10 text-homera-gold flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  {pillar.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Final Conversion Banner */}
        <div className="bg-gradient-to-r from-homera-blue via-homera-blue-light to-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-card">
          <h3 className="font-serif text-2xl sm:text-3xl font-bold">
            Votre prochain bien est peut-être ici.
          </h3>
          <p className="text-muted-light text-sm max-w-lg mx-auto">
            Découvrez nos logements et parcelles certifiés à Cotonou et Abomey-Calavi dès aujourd&apos;hui.
          </p>
          <div>
            <Button variant="gold" size="lg" className="gap-2">
              Rechercher maintenant
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

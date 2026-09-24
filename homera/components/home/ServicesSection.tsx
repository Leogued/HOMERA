import { Wrench, Home, Truck, Paintbrush, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ServicesSection() {
  const services = [
    {
      title: "Gestion Immobilière",
      desc: "Prise en charge opérationnelle de votre bien : suivi des loyers, états des lieux et relation locataire.",
      icon: Home,
    },
    {
      title: "Maintenance & Réparation",
      desc: "Interventions rapides en plomberie, électricité et maintenance préventive par des techniciens certifiés.",
      icon: Wrench,
    },
    {
      title: "Travaux & Aménagement",
      desc: "Rénovation, peinture et aménagement d'intérieur pour valoriser votre logement ou le préparer à la location.",
      icon: Paintbrush,
    },
    {
      title: "Déménagement Accompagné",
      desc: "Transport et manutention sécurisés de vos meubles et effets personnels vers votre nouveau chez-vous.",
      icon: Truck,
    },
  ];

  return (
    <section id="services" className="py-20 bg-muted/10 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold bg-homera-terracotta/10 text-homera-terracotta border border-homera-terracotta/30 uppercase tracking-widest">
            Écosystème Complémentaire
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Services sur-mesure pour votre habitat
          </h2>
          <p className="text-muted text-base">
            Trouver un bien n&apos;est que la première étape. HOMERA vous accompagne au quotidien dans la gestion, l&apos;entretien et la valorisation de votre patrimoine.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <div
                key={idx}
                className="bg-card border border-border p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-homera-terracotta/10 text-homera-terracotta flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {service.desc}
                  </p>
                </div>
                <div className="pt-2">
                  <button className="text-xs font-semibold text-homera-brown dark:text-homera-terracotta hover:underline flex items-center gap-1">
                    En savoir plus
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact CTA */}
        <div className="text-center pt-4">
          <Button variant="outline" size="lg" className="gap-2">
            Demander un service sur-mesure
          </Button>
        </div>
      </div>
    </section>
  );
}

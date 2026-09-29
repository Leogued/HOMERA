import { ShieldCheck, UserCheck, Users, MapPin } from "lucide-react";

export function StatsSection() {
  const stats = [
    {
      number: "+250",
      label: "Biens vérifiés",
      description: "Villas, studios, appartements avec identifiant unique traçable.",
      icon: ShieldCheck,
      color: "text-homera-terracotta bg-homera-terracotta/10",
    },
    {
      number: "+80",
      label: "Propriétaires enregistrés",
      description: "Propriétaires enregistrés et titulaires certifiés au Bénin.",
      icon: UserCheck,
      color: "text-homera-brown dark:text-foreground bg-homera-brown/10 dark:bg-white/10",
    },
    {
      number: "+45",
      label: "Agents & Mandataires",
      description: "Mandataires habilités aux visites et dossiers de location.",
      icon: Users,
      color: "text-homera-terracotta bg-homera-terracotta/10",
    },
    {
      number: "4",
      label: "Villes couvertes",
      description: "Cotonou, Abomey-Calavi, Porto-Novo, Ouidah.",
      icon: MapPin,
      color: "text-homera-brown dark:text-foreground bg-homera-brown/10 dark:bg-white/10",
    },
  ];

  return (
    <section className="py-16 bg-muted/5 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="font-serif text-display-sm text-foreground">
            HOMERA en quelques chiffres
          </h2>
          <p className="text-muted text-[13px] sm:text-[0.9375rem] max-w-xl mx-auto leading-relaxed">
            Une dynamique au service de la sécurité immobilière et de la lisibilité du marché.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="bg-card border border-border p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 space-y-4 relative overflow-hidden group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif text-display-md text-homera-brown dark:text-homera-terracotta homera-num">
                    {stat.number}
                  </span>
                  <div className={`p-3 rounded-xl ${stat.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground font-sans leading-snug">
                    {stat.label}
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-center text-muted-light mt-6 tracking-[0.01em]">
          * Les données chiffrées ci-dessus représentent des exemples de maquette du système pilote HOMERA.
        </p>
      </div>
    </section>
  );
}

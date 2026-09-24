import { ShieldCheck, FileCheck, UserCheck, Search, CheckCircle, Lock, Award, AlertCircle } from "lucide-react";

export function VerificationProtocol() {
  const steps = [
    {
      num: "01",
      title: "Soumission",
      desc: "Le bien est enregistré par son propriétaire ou son mandataire.",
      icon: FileCheck,
    },
    {
      num: "02",
      title: "Identification",
      desc: "Attribution de l'identifiant unique traçable (ex: HOM-CTN-000421).",
      icon: Lock,
    },
    {
      num: "03",
      title: "Documents",
      desc: "Examen des pièces justificatives et titres de propriété présentés.",
      icon: Search,
    },
    {
      num: "04",
      title: "Mandat",
      desc: "Contrôle de l'autorisation explicite de commercialisation du mandataire.",
      icon: UserCheck,
    },
    {
      num: "05",
      title: "Vérification",
      desc: "Examen des caractéristiques réelles, photos et disponibilité du bien.",
      icon: ShieldCheck,
    },
    {
      num: "06",
      title: "Validation",
      desc: "Dossier validé ou renvoyé par l'équipe d'audit HOMERA.",
      icon: CheckCircle,
    },
    {
      num: "07",
      title: "Traçabilité",
      desc: "Publication de la fiche officielle avec badge d'autorisation actif.",
      icon: Award,
    },
  ];

  return (
    <section id="protocole" className="py-20 bg-background text-foreground border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Title Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-homera-terracotta/10 text-homera-terracotta border border-homera-terracotta/30 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            Transparence & Rigueur
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Le protocole de vérification rigoureux HOMERA
          </h2>
          <p className="text-muted text-base">
            Parce que la confiance ne se décrète pas, HOMERA applique une méthode structurée en 7 étapes avant d&apos;accorder l&apos;autorisation de publication.
          </p>
        </div>

        {/* 7-Step Cards Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-card border border-border p-5 rounded-2xl shadow-card hover:border-homera-terracotta transition-all duration-300 flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xl font-bold text-homera-terracotta">
                    {step.num}
                  </span>
                  <div className="p-2 rounded-lg bg-homera-brown/10 dark:bg-white/10 text-homera-brown dark:text-homera-terracotta group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground font-sans">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clarification Alert Box */}
        <div className="bg-homera-brown/5 dark:bg-homera-brown/20 border border-homera-brown/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 rounded-xl bg-homera-brown text-homera-terracotta flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 text-sm">
            <h4 className="font-bold text-foreground font-sans">
              Attention : Ce que « Vérifié par HOMERA » signifie réellement
            </h4>
            <p className="text-muted leading-relaxed">
              HOMERA ne communique pas «&nbsp;Ce bien est juridiquement parfait&nbsp;». La promesse HOMERA est précise&nbsp;:{" "}
              <strong className="text-foreground">
                « Ce bien a fait l&apos;objet d&apos;un processus de vérification HOMERA portant sur les éléments indiqués dans sa fiche (identité du propriétaire, mandat d&apos;agent, localisation, photos). »
              </strong>{" "}
              Cette clarté protège les utilisateurs et garantit une crédibilité totale de notre infrastructure.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

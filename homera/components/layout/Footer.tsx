import Link from "next/link";
import { ShieldCheck, MapPin, Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-homera-brown text-white border-t border-white/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center font-serif text-homera-brown text-[1.25rem] leading-none">
                H
              </div>
              <div className="flex flex-col">
                <span className="homera-brand text-[1.3125rem] text-white">
                  HOMERA
                </span>
                <span className="text-[10px] uppercase font-sans tracking-[0.18em] text-homera-terracotta font-semibold -mt-1">
                  Bénin • Confiance
                </span>
              </div>
            </Link>
            <p className="text-[12.5px] text-stone-300 max-w-sm leading-relaxed font-sans">
              HOMERA est la plateforme immobilière béninoise qui structure tout le parcours autour du bien — de sa recherche et sa vérification jusqu&apos;à la visite, la location, l&apos;achat et sa gestion.
            </p>
            <div className="flex items-center gap-2 text-[12.5px] text-homera-terracotta font-medium">
              <ShieldCheck className="w-4 h-4 text-homera-terracotta" />
              <span>Infrastructure & Identifiants Numériques Unique</span>
            </div>
          </div>

          {/* Nav Col 1: Explorer */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-homera-terracotta uppercase tracking-[0.14em]">
              Explorer
            </h4>
            <ul className="space-y-2 text-[12.5px] text-stone-300">
              <li>
                <Link href="#acheter" className="hover:text-white transition-colors">
                  Maisons & Villas
                </Link>
              </li>
              <li>
                <Link href="#louer" className="hover:text-white transition-colors">
                  Appartements de standing
                </Link>
              </li>
              <li>
                <Link href="#acheter" className="hover:text-white transition-colors">
                  Terrains & Parcelles
                </Link>
              </li>
              <li>
                <Link href="#sejour" className="hover:text-white transition-colors">
                  Séjours & Meublés
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Col 2: Services & Protocole */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-homera-terracotta uppercase tracking-[0.14em]">
              Écosystème
            </h4>
            <ul className="space-y-2 text-[12.5px] text-stone-300">
              <li>
                <Link href="#protocole" className="hover:text-white transition-colors">
                  Protocole de Vérification
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-white transition-colors">
                  Gestion Immobilière
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-white transition-colors">
                  Maintenance & Réparation
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-white transition-colors">
                  Accompagnement Déménagement
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Col 3: Contact & Ancrage */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-homera-terracotta uppercase tracking-[0.14em]">
              Bénin & Contact
            </h4>
            <ul className="space-y-2 text-[12.5px] text-stone-300">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-homera-terracotta" />
                <span>Cotonou & Abomey-Calavi</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-homera-terracotta" />
                <span>+229 01 00 00 00 00</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-homera-terracotta" />
                <span>contact@homera.bj</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between text-[12px] text-stone-400 gap-4">
          <p>© {new Date().getFullYear()} HOMERA. Tous droits réservés. République du Bénin.</p>
          <div className="flex items-center space-x-6">
            <Link href="#" className="hover:text-white transition-colors">
              Mentions Légales
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Politique de Confidentialité
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Conditions Générales (CGU)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

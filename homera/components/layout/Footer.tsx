import Link from "next/link";
import { ShieldCheck, MapPin, Mail, Phone } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

/* ==================================================================
   HOMERA — PIED DE PAGE
   ------------------------------------------------------------------
   Structure, couleurs et contenu conservés. Ce qui est ajouté :
   apparition progressive des colonnes, soulignés animés au survol, et
   liens de services pointant vers l’ancre réelle de chaque métier —
   le clic met directement en avant le bon service plus haut.
   ================================================================== */

export function Footer() {
  return (
    <footer className="homera-on-dark relative overflow-hidden bg-homera-brown pt-16 pb-12 text-white">
      {/* Halo discret : prolonge la scène finale plutôt que de la couper */}
      <span
        aria-hidden="true"
        className="homera-halo pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-homera-terracotta/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Colonne de marque */}
          <Reveal y={20} className="space-y-4 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card font-serif text-[1.25rem] leading-none text-homera-brown">
                H
              </span>
              <span className="flex flex-col">
                <span className="homera-brand text-[1.3125rem] text-white">Homera</span>
                <span className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-homera-terracotta">
                  Bénin • Confiance
                </span>
              </span>
            </Link>
            <p className="max-w-sm text-[12.5px] leading-relaxed text-stone-300">
              HOMERA est la plateforme immobilière béninoise qui structure tout le parcours
              autour du bien — de sa recherche et sa vérification jusqu’à la visite, la
              location, l’achat et sa gestion.
            </p>
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-homera-terracotta">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Infrastructure & identifiants numériques uniques
            </p>
          </Reveal>

          {/* Explorer */}
          <Reveal delay={80} y={20} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-homera-terracotta">
              Explorer
            </h2>
            <ul className="space-y-2 text-[12.5px] text-stone-300">
              {[
                { label: "Maisons & villas", href: "#biens" },
                { label: "Appartements de standing", href: "#biens" },
                { label: "Terrains & parcelles", href: "#biens" },
                { label: "Séjours & meublés", href: "#biens" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="homera-underline inline-block transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Écosystème */}
          <Reveal delay={160} y={20} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-homera-terracotta">
              Écosystème
            </h2>
            <ul className="space-y-2 text-[12.5px] text-stone-300">
              {[
                { label: "Protocole de vérification", href: "#protocole" },
                { label: "Gestion immobilière", href: "#services-gestion" },
                { label: "Maintenance & réparation", href: "#services-maintenance" },
                { label: "Déménagement accompagné", href: "#services-demenagement" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="homera-underline inline-block transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Contact */}
          <Reveal delay={240} y={20} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-homera-terracotta">
              Bénin & contact
            </h2>
            <ul className="space-y-2 text-[12.5px] text-stone-300">
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                <span>Cotonou & Abomey-Calavi</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                <span className="homera-num">+229 01 00 00 00 00</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                <span>contact@homera.bj</span>
              </li>
            </ul>
          </Reveal>
        </div>

        {/* Barre inférieure */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-[12px] text-stone-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} HOMERA. Tous droits réservés. République du Bénin.
          </p>
          <ul className="flex items-center gap-6">
            {["Mentions légales", "Politique de confidentialité", "Conditions générales (CGU)"].map(
              (label) => (
                <li key={label}>
                  <Link href="#" className="homera-underline transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </footer>
  );
}

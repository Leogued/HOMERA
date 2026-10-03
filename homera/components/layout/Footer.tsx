import Link from "next/link";
import { ShieldCheck, MapPin, Mail, Phone } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
/* ================================================================== HOMERA — PIED DE PAGE ------------------------------------------------------------------ Structure et contenu conservés ; les adresses pointent désormais vers les pages publiques réelles (explorateur, projets, services, informations légales) au lieu d’ancres internes à l’accueil. Un lien de pied de page ne doit jamais être un cul-de-sac. ================================================================== */ const COLUMNS =
  [
    {
      title: "Explorer",
      links: [
        { label: "Tous les biens", href: "/explorer" },
        { label: "Maisons & villas", href: "/acheter/maisons" },
        { label: "Appartements", href: "/louer/appartements" },
        { label: "Terrains & parcelles", href: "/acheter/terrains" },
        { label: "Séjours & meublés", href: "/sejour" },
      ],
    },
    {
      title: "Écosystème",
      links: [
        { label: "Protocole de vérification", href: "/a-propos#protocole" },
        { label: "Gestion immobilière", href: "/services#gestion" },
        { label: "Maintenance & réparation", href: "/services#maintenance" },
        { label: "Déménagement accompagné", href: "/services#demenagement" },
        { label: "Travaux & aménagement", href: "/services#travaux" },
      ],
    },
    {
      title: "La plateforme",
      links: [
        { label: "Qui sommes-nous", href: "/a-propos" },
        { label: "Acheter au Bénin", href: "/acheter" },
        { label: "Louer au Bénin", href: "/louer" },
        { label: "Nous contacter", href: "/contact" },
        { label: "Créer un compte", href: "/inscription" },
        { label: "Espace personnel", href: "/connexion" },
      ],
    },
  ];
export function Footer() {
  return (
    <footer className="homera-on-dark relative overflow-hidden bg-homera-brown pt-16 pb-12 text-white">
      {" "}
      {/* Halo discret : prolonge la scène finale plutôt que de la couper */}{" "}
      <span
        aria-hidden="true"
        className="homera-halo pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-homera-terracotta/10 blur-3xl"
      />{" "}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {" "}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {" "}
          {/* Colonne de marque */}{" "}
          <Reveal y={20} className="space-y-4 lg:col-span-2">
            {" "}
            <Link href="/" className="flex items-center gap-3">
              {" "}
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card font-serif text-display-xs leading-none text-homera-brown">
                {" "}
                H{" "}
              </span>{" "}
              <span className="flex flex-col">
                {" "}
                <span className="homera-brand text-brand-sm text-white">Homera</span>{" "}
                <span className="-mt-1 text-micro font-semibold uppercase tracking-[0.18em] text-homera-terracotta">
                  {" "}
                  Bénin • Confiance{" "}
                </span>{" "}
              </span>{" "}
            </Link>{" "}
            <p className="max-w-sm text-note leading-relaxed text-homera-cream-dark">
              {" "}
              HOMERA est la plateforme immobilière béninoise qui structure tout le parcours autour du bien — de sa
              recherche et sa vérification jusqu’à la visite, la location, l’achat et sa gestion.{" "}
            </p>{" "}
            <p className="flex items-center gap-2 text-note font-medium text-homera-terracotta">
              {" "}
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Infrastructure & identifiants numériques uniques{" "}
            </p>{" "}
          </Reveal>{" "}
          {COLUMNS.map((column, index) => (
            <Reveal key={column.title} delay={80 + index * 80} y={20} className="space-y-3">
              {" "}
              <h2 className="text-label uppercase text-homera-terracotta">{column.title}</h2>{" "}
              <ul className="space-y-2 text-note text-homera-cream-dark">
                {" "}
                {column.links.map((link) => (
                  <li key={link.href}>
                    {" "}
                    <Link
                      href={link.href}
                      className="homera-underline inline-block transition-colors hover:text-white"
                    >
                      {" "}
                      {link.label}{" "}
                    </Link>{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
            </Reveal>
          ))}{" "}
        </div>{" "}
        {/* Coordonnées */}{" "}
        <Reveal
          delay={240}
          y={20}
          className="mt-10 grid grid-cols-1 gap-4 border-t border-white/10 pt-8 text-note text-homera-cream-dark sm:grid-cols-3"
        >
          {" "}
          <p className="flex items-center gap-2">
            {" "}
            <MapPin className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" /> Cotonou & Abomey-Calavi{" "}
          </p>{" "}
          <p className="flex items-center gap-2">
            {" "}
            <Phone className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />{" "}
            <span className="homera-num">+229 01 00 00 00 00</span>{" "}
          </p>{" "}
          <p className="flex items-center gap-2">
            {" "}
            <Mail className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" /> contact@homera.bj{" "}
          </p>{" "}
        </Reveal>{" "}
        {/* Barre inférieure */}{" "}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-note text-muted-light sm:flex-row">
          {" "}
          <p>
            {" "}
            © {new Date().getFullYear()} HOMERA. Tous droits réservés. République du Bénin.{" "}
            <span className="ml-2 text-caption">Système pilote : biens et chiffres de démonstration.</span>{" "}
          </p>{" "}
          <ul className="flex flex-wrap items-center gap-6">
            {" "}
            {[
              { label: "Mentions légales", href: "/legal#mentions" },
              { label: "Politique de confidentialité", href: "/legal#confidentialite" },
              { label: "Conditions générales (CGU)", href: "/legal#cgu" },
            ].map((item) => (
              <li key={item.href}>
                {" "}
                <Link href={item.href} className="homera-underline transition-colors hover:text-white">
                  {" "}
                  {item.label}{" "}
                </Link>{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </div>{" "}
      </div>{" "}
    </footer>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, Heart, KeyRound, Search, UserRound } from "lucide-react";
import { PageHero } from "@/components/catalog/PageHero";
/* ================================================================== /connexion — L’ESPACE CONNECTÉ, ANNONCÉ SANS LE SIMULER ------------------------------------------------------------------ Tout ce qui est public se consulte sans compte : recherche, fiches, catégories, services, contact. Cette page annonce ce que le compte apportera (favoris, recherches enregistrées, suivi de dossier) et dit clairement qu’il n’existe pas encore — plutôt que d’afficher un faux formulaire qui refuserait tout le monde. ================================================================== */ export const metadata: Metadata =
  {
    title: "Espace personnel — HOMERA",
    description:
      "L’espace personnel HOMERA arrive : favoris, recherches enregistrées, demandes de visite et suivi de dossier. En attendant, tout le catalogue se consulte sans compte.",
  };
const FEATURES = [
  { icon: Heart, title: "Vos favoris", detail: "Retrouver les biens mis de côté, sur tous vos appareils." },
  { icon: Search, title: "Recherches enregistrées", detail: "Rejouer une recherche et être prévenu des nouveautés." },
  {
    icon: CalendarCheck,
    title: "Visites et demandes",
    detail: "Suivre vos demandes de visite et vos dossiers en cours.",
  },
  {
    icon: KeyRound,
    title: "Espace propriétaire",
    detail: "Déposer un bien, suivre sa vérification et sa publication.",
  },
];
export default function ConnexionPage() {
  return (
    <>
      {" "}
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: "Se connecter" }]}
        eyebrow="Espace personnel"
        title="Votre espace HOMERA arrive"
        intro="La création de compte n’est pas encore ouverte : nous préférons livrer un espace utile plutôt qu’un formulaire vide. En attendant, l’intégralité du catalogue et des fiches se consulte librement, sans inscription."
        actions={
          <>
            {" "}
            <Link
              href="/explorer"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white transition-colors "
            >
              {" "}
              Explorer les biens vérifiés <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
            </Link>{" "}
            <Link
              href="/contact"
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-border px-5 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              {" "}
              Être prévenu de l’ouverture{" "}
            </Link>{" "}
          </>
        }
      />{" "}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {" "}
        <h2 className="font-serif text-display-sm">Ce que le compte apportera</h2>{" "}
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {" "}
          {FEATURES.map((feature) => (
            <li key={feature.title} className="rounded-card border border-border bg-card p-5">
              {" "}
              <feature.icon className="h-5 w-5 text-homera-terracotta" aria-hidden="true" />{" "}
              <h3 className="mt-4 font-serif text-display-xs">{feature.title}</h3>{" "}
              <p className="mt-2 text-note leading-relaxed text-muted">{feature.detail}</p>{" "}
            </li>
          ))}{" "}
        </ul>{" "}
        <div className="mt-14 flex flex-col gap-4 rounded-card border border-border bg-card/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          {" "}
          <p className="flex items-start gap-3 text-body-sm leading-relaxed text-muted">
            {" "}
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" /> Vous cherchez un
            bien maintenant ? Tout est déjà accessible : filtrez par commune, budget et surface, puis contactez-nous
            avec la référence du bien.{" "}
          </p>{" "}
          <Link
            href="/explorer"
            className="homera-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            {" "}
            <UserRound className="h-4 w-4" aria-hidden="true" /> Continuer sans compte{" "}
          </Link>{" "}
        </div>{" "}
      </div>{" "}
    </>
  );
}

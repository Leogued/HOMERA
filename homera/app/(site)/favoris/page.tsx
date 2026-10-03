import type { Metadata } from "next";
import { FavoritesView } from "@/components/catalog/FavoritesView";
import { PageHero } from "@/components/catalog/PageHero";
import { PROPERTIES } from "@/lib/content";
/* ================================================================== /favoris — CE QUE LE VISITEUR A MIS DE CÔTÉ ------------------------------------------------------------------ Pas de compte, pas de serveur : la sélection vit dans le navigateur. La page le dit clairement, et sert aussi de rappel pour les recherches enregistrées depuis l’explorateur. ================================================================== */ export const metadata: Metadata =
  {
    title: "Favoris et recherches enregistrées — HOMERA",
    description:
      "Votre sélection de biens vérifiés et vos recherches enregistrées, conservées dans votre navigateur — sans compte, sans trace serveur.",
    robots: { index: false, follow: true },
  };
export default function FavorisPage() {
  return (
    <>
      {" "}
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: "Favoris" }]}
        eyebrow="Sans compte"
        title="Vos favoris et vos recherches"
        intro="Tout ce que vous mettez de côté reste dans ce navigateur. Aucun compte à créer, aucun envoi au serveur : vous pouvez fermer l’onglet et revenir plus tard."
        facts={[
          { label: "Stockage", value: "Navigateur" },
          { label: "Compte requis", value: "Aucun" },
          { label: "Biens publiés", value: String(PROPERTIES.length) },
        ]}
      />{" "}
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
        {" "}
        <FavoritesView properties={PROPERTIES} />{" "}
      </div>{" "}
    </>
  );
}

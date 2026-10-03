import { Footer } from "@/components/layout/Footer";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { NotFoundView } from "@/components/layout/NotFoundView";
/* ================================================================== 404 GÉNÉRALE — adresse sans route correspondante ------------------------------------------------------------------ Ce fichier s’affiche hors de la coquille (site) : il recompose donc l’en-tête, la cible de saut et le pied de page pour rester cohérent avec le reste du site. ================================================================== */ export const metadata =
  {
    title: "Page introuvable — HOMERA",
    description:
      "Cette adresse ne correspond à aucune page du site HOMERA. Retrouvez le catalogue vérifié depuis l’explorateur.",
  };
export default function Introuvable() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {" "}
      <PublicHeader />{" "}
      <main id="contenu" className="flex flex-1 items-start">
        {" "}
        <div className="w-full">
          {" "}
          <NotFoundView context="page" />{" "}
        </div>{" "}
      </main>{" "}
      <Footer />{" "}
    </div>
  );
}

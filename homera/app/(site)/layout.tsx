import type { ReactNode } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
/* ================================================================== HOMERA — HABILLAGE DES PAGES PUBLIQUES ------------------------------------------------------------------ Toutes les pages publiques hors accueil partagent ce cadre : en-tête lisible (le site n’est plus posé sur la vidéo d’accueil), contenu, pied de page. L’accueil garde son propre en-tête transparent — c’est sa signature, pas une exception oubliée. ================================================================== */ export default function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {" "}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-btn focus:bg-homera-brown focus:px-4 focus:py-2 focus:text-note focus:text-white"
      >
        {" "}
        Aller au contenu{" "}
      </a>{" "}
      <PublicHeader />{" "}
      <main id="contenu" className="flex-1">
        {" "}
        {children}{" "}
      </main>{" "}
      <Footer />{" "}
    </div>
  );
}

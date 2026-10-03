import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { IdentityStatement } from "@/components/home/IdentityStatement";
import { StatsSection } from "@/components/home/StatsSection";
import { ExplorerSection } from "@/components/home/ExplorerSection";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { PropertyDossier } from "@/components/home/PropertyDossier";
import { VerificationProtocol } from "@/components/home/VerificationProtocol";
import { ServicesSection } from "@/components/home/ServicesSection";
import { EditorialSection } from "@/components/home/EditorialSection";
import { TrustVisionSection } from "@/components/home/TrustVisionSection";
import { Footer } from "@/components/layout/Footer";
import { SearchProvider } from "@/components/providers/SearchProvider";
import { BackToTop, ChapterRail, ReadingProgress } from "@/components/ui/ChapterRail";
import { CustomCursor } from "@/components/ui/CustomCursor";
/* ================================================================== HOMERA — PAGE D’ACCUEIL ------------------------------------------------------------------ La page est un parcours en neuf scènes : 01 Immersion ......... hero vidéo + recherche 02 Repères ........... chiffres, comptés à l’entrée en scène 03 Intentions ........ quatre portes expansibles 04 Sélection ......... biens vérifiés, galerie et aperçu natif 05 Identité .......... le bien et son identifiant unique 06 Vérification ...... sept mouvements racontés 07 Écosystème ........ services, sommaire interactif 08 Magazine .......... l’univers éditorial 09 Manifeste ......... convictions puis projection finale Le fil est continu : chaque section fond dans la suivante, et le rail de chapitres rappelle où l’on se trouve dans le voyage. ================================================================== */ export default function Home() {
  return (
    <SearchProvider>
      {" "}
      <div className="relative flex min-h-screen flex-col justify-between bg-background text-foreground transition-colors duration-300">
        {" "}
        {/* Repères de lecture (desktop) */} <ReadingProgress /> <ChapterRail /> <BackToTop /> <CustomCursor />{" "}
        {/* En-tête — toujours transparent */} <Navbar /> {/* Scènes */}{" "}
        <main className="flex-1">
          {" "}
          <Hero /> <StatsSection /> <IdentityStatement /> <ExplorerSection /> <FeaturedProperties />{" "}
          <PropertyDossier /> <VerificationProtocol /> <ServicesSection /> <EditorialSection /> <TrustVisionSection />{" "}
        </main>{" "}
        <Footer />{" "}
      </div>{" "}
    </SearchProvider>
  );
}

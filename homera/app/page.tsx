import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { StatsSection } from "@/components/home/StatsSection";
import { ExplorerSection } from "@/components/home/ExplorerSection";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { VerificationProtocol } from "@/components/home/VerificationProtocol";
import { ServicesSection } from "@/components/home/ServicesSection";
import { TrustVisionSection } from "@/components/home/TrustVisionSection";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-between transition-colors duration-300">
      {/* Navbar Header */}
      <Navbar />

      {/* Main Sections */}
      <main className="flex-1">
        {/* Hero with Search Engine */}
        <Hero />

         {/* Ecosystem Key Numbers */}
        <StatsSection />

        {/* Intent-based Explorer */}
        <ExplorerSection />

        {/* Certified Featured Properties */}
        <FeaturedProperties />

        {/* 7-Step Verification Protocol */}
        <VerificationProtocol />

        {/* Habitat Ecosystem Services */}
        <ServicesSection />

        {/* Trust Vision & Manifesto */}
        <TrustVisionSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { SearchModule } from "@/components/home/SearchModule";
import { useSearch } from "@/components/providers/SearchProvider";
import { cssVars, onAnimationFrame, useMotionPreferences } from "@/lib/motion";
import { CHAPTERS } from "@/lib/content";

/* ==================================================================
   HOMERA — HERO
   ------------------------------------------------------------------
   Cadrage, format et composition conservés : même section plein écran,
   même vidéo, même voile noir à 35 %, même titre, même sous-titre et
   même emplacement de recherche.

   Ce qui change : la profondeur. Le contenu se pose en couches
   (titre, sous-titre, recherche, repère de chapitre) qui apparaissent
   en décalé, puis se dissipent à des vitesses différentes au moment
   du défilement — la recherche reste lisible plus longtemps, la vidéo
   prend très légèrement de l’échelle. Aucun effet de diaporama.
   ================================================================== */

export function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);
  const { reduced, compact } = useMotionPreferences();
  const { isSearching } = useSearch();

  /* --- Entrée : léger différé pour laisser respirer la vidéo --- */
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /* --- Sortie : progression du défilement sur la hauteur du hero --- */
  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    let last = 0;
    let value = 0;
    const measure = () => {
      const height = element.offsetHeight || window.innerHeight;
      value = Math.min(1, Math.max(0, window.scrollY / height));
    };

    measure();
    const stop = onAnimationFrame((time) => {
      if (time - last < 66) return;
      last = time;
      const previous = value;
      measure();
      if (Math.abs(previous - value) > 0.004) setProgress(value);
    });

    return stop;
  }, []);

  const eased = reduced ? 0 : progress;
  const contentShift = compact ? 42 : 92;

  const contentStyle: React.CSSProperties = reduced
    ? {}
    : {
        transform: `translate3d(0, ${(-eased * contentShift).toFixed(1)}px, 0)`,
        opacity: Math.max(0, 1 - eased * 1.32).toFixed(3),
        willChange: progress > 0 && progress < 1 ? "transform, opacity" : undefined,
      };

  // La recherche reste importante : elle se dissipe plus tard et se déplace moins.
  const searchStyle: React.CSSProperties = reduced
    ? {}
    : {
        transform: `translate3d(0, ${(-eased * 34).toFixed(1)}px, 0) scale(${(1 - eased * 0.03).toFixed(3)})`,
        opacity: Math.max(0, 1 - Math.max(0, eased - 0.42) * 1.9).toFixed(3),
      };

  const videoStyle: React.CSSProperties = reduced
    ? {}
    : {
        transform: `translate3d(0, ${(eased * 58).toFixed(1)}px, 0) scale(${(1.02 + eased * 0.05).toFixed(3)})`,
        willChange: "transform",
      };

  /** Reveal d’entrée : delay + amplitude de flou (0 sur les grands titres, coûteux). */
  const reveal = (delay: number, blur = 0) =>
    cssVars({ "--reveal-delay": `${delay}ms`, "--reveal-blur": `${blur}px` });

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="homera-scene homera-on-dark relative isolate min-h-svh overflow-hidden bg-black pt-34 pb-16 text-white sm:pt-42 sm:pb-24 lg:min-h-svh"
      aria-label="Accueil HOMERA"
    >
      {/* Vidéo d’origine — cadrage, format et contenu inchangés */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={videoStyle}
      >
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/video/background_video.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Voile de contraste d’origine (35 %) + assombrissement progressif */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${(0.35 + eased * 0.22).toFixed(3)})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_10%,transparent_35%,rgba(0,0,0,0.55)_100%)]"
      />
      <div aria-hidden="true" className="homera-grain-layer absolute inset-0 z-[2]" />

      {/* Passage progressif vers la scène suivante : pas de rupture franche */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-24 bg-gradient-to-b from-transparent to-background sm:h-32"
      />

      {/* Contenu */}
      <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <div
          className="space-y-8 text-center lg:mt-[max(0px,calc(100svh-29rem))]"
          style={contentStyle}
        >
          {/* Repère de chapitre : annonce le voyage, sans bruit */}
          <p
            className="homera-reveal flex items-center justify-center gap-3 text-[10.5px] font-medium uppercase tracking-[0.42em] text-white/55"
            data-revealed={entered}
            style={reveal(0)}
          >
            <span aria-hidden="true" className="h-px w-8 bg-white/30" />
            {CHAPTERS[0].index} — {CHAPTERS[0].label}
            <span aria-hidden="true" className="h-px w-8 bg-white/30" />
          </p>

          <div className="homera-reveal" data-revealed={entered} style={reveal(120)}>
            {/* Titre d’origine — DM Serif Display, proportions et cadrage conservés */}
            <h1 className="font-serif text-display-sm sm:text-display-lg lg:text-display-xl text-white max-w-4xl mx-auto lg:-translate-y-[max(7rem,calc(50svh-12.5rem))]">
              L&apos;immobilier au Bénin en toute <br />
              <span className="homera-accent text-[1.06em]">simplicité</span>
            </h1>
          </div>

          <div className="homera-reveal" data-revealed={entered} style={reveal(260)}>
            <p className="text-stone-300 text-sm sm:text-[0.9375rem] max-w-2xl mx-auto font-sans font-normal leading-relaxed lg:-translate-y-[max(7rem,calc(50svh-12.5rem))]">
              Immobilier en toute sérénité, sans surprise ni intermédiaire douteux — la
              plateforme de confiance pour tous vos projets au Bénin.
            </p>
          </div>

          {/* Recherche — module conservé, mis en scène */}
          <div
            className="homera-reveal mt-8"
            data-revealed={entered}
            style={reveal(420, 4)}
          >
            {/* La sortie au défilement vit sur une couche distincte : l’entrée reste intacte */}
            <div style={searchStyle}>
              <SearchModule />
            </div>
          </div>
        </div>

        {/* Repère de défilement — s’efface quand la recherche occupe la place,
            et sur les écrans trop courts pour l’afficher sans gêne */}
        <div
          className={`homera-reveal homera-scroll-cue-wrap pointer-events-none absolute inset-x-0 bottom-8 z-20 flex flex-col items-center gap-3 text-white/65 transition-opacity duration-500 sm:bottom-10 ${
            isSearching ? "opacity-0" : ""
          }`}
          data-revealed={entered}
          style={reveal(900)}
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.36em]">
            Défiler
          </span>
          <span className="homera-scroll-cue h-10 w-px text-white/50" aria-hidden="true" />
          <ArrowDown className="h-3 w-3 -mt-1" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

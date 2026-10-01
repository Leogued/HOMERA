"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, Pause, Play } from "lucide-react";
import { SearchModule } from "@/components/home/SearchModule";
import { useSearch } from "@/components/providers/SearchProvider";
import { cssVars, useMotionPreferences, usePointerMotion, useSceneMotion } from "@/lib/motion";
import { phase } from "@/lib/motion-math";
import { CHAPTERS } from "@/lib/content";

/* Cadrage, vidéo, titre et recherche d'origine conservés.
   Trois couches indépendantes : la vidéo dérive à peine, le titre se
   retire, la recherche reste présente plus longtemps. Aucun scroll détourné. */
export function Hero() {
  const [entered, setEntered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { reduced, compact } = useMotionPreferences();
  const { isSearching } = useSearch();

  const update = useCallback((element: HTMLElement, progress: number) => {
    const exit = phase(progress, 0.06, 0.88);
    element.style.setProperty("--hero-copy-y", `${(-exit * (compact ? 28 : 64)).toFixed(2)}px`);
    element.style.setProperty("--hero-copy-opacity", (1 - exit).toFixed(4));
    element.style.setProperty("--hero-search-y", `${(-progress * (compact ? 8 : 20)).toFixed(2)}px`);
    element.style.setProperty("--hero-search-opacity", (1 - phase(progress, 0.54, 1)).toFixed(4));
    element.style.setProperty("--hero-video-scale", (1 + progress * 0.018).toFixed(5));
    element.style.setProperty("--hero-video-y", `${(progress * Math.min(5, element.offsetHeight * 0.004)).toFixed(2)}px`);
    element.style.setProperty("--hero-veil", (0.35 + progress * 0.12).toFixed(4));
  }, [compact]);
  const sectionRef = useSceneMotion<HTMLElement>(update, { enabled: !reduced, mode: "exit", response: 75 });
  const pointerRef = usePointerMotion<HTMLDivElement>({ strength: 5, enabled: !reduced, sourceRef: sectionRef });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Une vidéo hors champ ou un onglet masqué ne doit pas consommer de décodage.
  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;
    let visible = section.getBoundingClientRect().bottom > 0;
    const sync = () => {
      if (reduced || userPaused || !visible || document.hidden || section.closest("[inert]")) video.pause();
      else void video.play().catch(() => {});
    };
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }) : null;
    observer?.observe(section);
    const page = section.closest("main");
    const overlay = typeof MutationObserver !== "undefined" ? new MutationObserver(sync) : null;
    if (page) overlay?.observe(page, { attributes: true, attributeFilter: ["inert"] });
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { observer?.disconnect(); overlay?.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [reduced, userPaused, sectionRef]);

  const reveal = (delay: number, blur = 0) =>
    cssVars({ "--reveal-delay": `${delay}ms`, "--reveal-blur": `${blur}px` });

  return (
    <section ref={sectionRef} id="hero"
      className="homera-scene homera-hero homera-on-dark relative isolate min-h-svh overflow-hidden bg-black pt-34 pb-16 text-white sm:pt-42 sm:pb-24 lg:min-h-svh"
      aria-label="Accueil HOMERA">
      <div aria-hidden="true" className="homera-hero-video absolute inset-0">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover"
          autoPlay muted loop playsInline preload="auto">
          <source src="/video/background_video.mp4" type="video/mp4" />
        </video>
      </div>
      <div aria-hidden="true" className="homera-hero-veil absolute inset-0" />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_10%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
      <div aria-hidden="true" className="homera-grain-layer absolute inset-0 z-[2]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-36 bg-gradient-to-b from-transparent to-background sm:h-48" />

      <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <div className="space-y-8 text-center lg:mt-[max(0px,calc(100svh-29rem))]">
          <p className="homera-reveal flex items-center justify-center gap-3 text-[10.5px] font-medium uppercase tracking-[0.42em] text-white/65"
            data-revealed={entered} style={reveal(640)}>
            <span aria-hidden="true" className="h-px w-8 bg-white/30" />
            {CHAPTERS[0].index} — {CHAPTERS[0].label}
            <span aria-hidden="true" className="h-px w-8 bg-white/30" />
          </p>
          <div ref={pointerRef} className="homera-hero-pointer space-y-8">
            <div className="homera-hero-copy">
              <div className="homera-reveal" data-revealed={entered} style={reveal(90)}>
                <h1 className="font-serif text-display-sm sm:text-display-lg lg:text-display-xl text-white max-w-4xl mx-auto lg:-translate-y-[max(7rem,calc(50svh-12.5rem))]">
                  L&apos;immobilier au Bénin en toute <br />
                  <span className="homera-accent text-[1.06em]">simplicité</span>
                </h1>
              </div>
            </div>
            <div className="homera-hero-copy">
              <div className="homera-reveal" data-revealed={entered} style={reveal(240)}>
                <p className="text-stone-300 text-sm sm:text-[0.9375rem] max-w-2xl mx-auto font-sans font-normal leading-relaxed lg:-translate-y-[max(7rem,calc(50svh-12.5rem))]">
                  Immobilier en toute sérénité, sans surprise ni intermédiaire douteux — la
                  plateforme de confiance pour tous vos projets au Bénin.
                </p>
              </div>
            </div>
          </div>
          <div className="homera-reveal mt-8" data-revealed={entered} style={reveal(400, 2)}>
            <div className="homera-hero-search"><SearchModule /></div>
          </div>
        </div>
        <div data-searching={isSearching} className={`homera-reveal homera-scroll-cue-wrap pointer-events-none absolute inset-x-0 bottom-8 z-20 flex flex-col items-center gap-3 text-white/65 transition-opacity duration-500 sm:bottom-10 ${isSearching ? "opacity-0" : ""}`}
          data-revealed={entered} style={reveal(920)}>
          <span className="text-[10px] font-medium uppercase tracking-[0.36em]">Défiler</span>
          <span className="homera-scroll-cue h-10 w-px text-white/50" aria-hidden="true" />
          <ArrowDown className="h-3 w-3 -mt-1" aria-hidden="true" />
        </div>
      </div>
      <button type="button" onClick={() => setUserPaused((value) => !value)}
        disabled={reduced} aria-pressed={userPaused || reduced}
        aria-label={reduced ? "Vidéo arrêtée : mouvement réduit" : userPaused ? "Relancer la vidéo de fond" : "Mettre la vidéo de fond en pause"}
        className="homera-press absolute bottom-4 left-4 z-20 flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 text-[10px] font-medium text-white/85 backdrop-blur-sm sm:left-6">
        {userPaused || reduced ? <Play className="h-3 w-3" aria-hidden="true" /> : <Pause className="h-3 w-3" aria-hidden="true" />}
        {reduced ? "Mouvement réduit" : userPaused ? "Relancer" : "Pause vidéo"}
      </button>
    </section>
  );
}

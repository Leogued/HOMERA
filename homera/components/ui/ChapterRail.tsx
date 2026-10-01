"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { CHAPTERS } from "@/lib/content";
import { useActiveSection, onScrollFrame } from "@/lib/motion";

/* ==================================================================
   HOMERA — FIL CONDUCTEUR
   ------------------------------------------------------------------
   Deux repères discrets, sur desktop uniquement :
   • une barre de progression de lecture, en haut de page ;
   • un rail de chapitres à gauche, qui raconte où l’on se trouve
     dans le parcours (Immersion → Repères → Intentions → …).

   Les libellés n’apparaissent qu’au survol / focus : présents sans
   être bavards, et cliquables au clavier.
   ================================================================== */

export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => onScrollFrame(() => {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const progress = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
    if (barRef.current) barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
  }), []);
  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent">
      <div ref={barRef} className="h-full origin-left bg-gradient-to-r from-homera-terracotta via-homera-terracotta-light to-homera-amber" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}

export function ChapterRail() {
  const active = useActiveSection(CHAPTERS.map((chapter) => chapter.id));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Le rail n’a de sens qu’une fois le hero quitté.
    let last = false;
    const measure = () => {
      const next = window.scrollY > window.innerHeight * 0.75;
      if (next !== last) {
        last = next;
        setVisible(next);
      }
    };
    return onScrollFrame(measure);
  }, []);

  return (
    <nav
      aria-label="Chapitres de la page"
      className={`homera-chapter-rail pointer-events-none fixed left-5 top-1/2 z-40 -translate-y-1/2 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      inert={!visible}
      style={{ transition: "opacity 600ms var(--homera-ease)" }}
    >
      <ul className="pointer-events-auto space-y-1.5">
        {CHAPTERS.map((chapter) => {
          const isActive = chapter.id === active;
          return (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                aria-label={`${chapter.index} — ${chapter.label}`}
                aria-current={isActive ? "true" : undefined}
                className="group flex items-center gap-3 rounded-full py-1 pl-0.5 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-terracotta"
              >
                <span
                  aria-hidden="true"
                  className={`block rounded-full transition-all duration-500 ease-[cubic-bezier(.22,.61,.28,1)] ${
                    isActive
                      ? "h-2 w-2 bg-homera-terracotta"
                      : "h-1.5 w-1.5 bg-foreground/25 group-hover:bg-foreground/50"
                  }`}
                />
                <span
                  className={`homera-num text-[10px] font-semibold tracking-[0.18em] transition-colors duration-300 ${
                    isActive ? "homera-accent-ink" : "text-muted group-hover:text-foreground"
                  }`}
                >
                  {chapter.index}
                </span>
                <span
                  aria-hidden="true"
                  className={`homera-rail-label whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.16em] transition-all duration-500 ease-[cubic-bezier(.22,.61,.28,1)] ${
                    isActive
                      ? "max-w-[12rem] text-foreground/70 opacity-100"
                      : "max-w-0 overflow-hidden text-foreground/50 opacity-0 group-hover:max-w-[12rem] group-hover:opacity-100"
                  }`}
                >
                  {chapter.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------
   Remonter — utile sur une page longue, discret partout
   ------------------------------------------------------------------ */

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let last = false;
    const measure = () => {
      const next = window.scrollY > window.innerHeight * 1.6;
      if (next !== last) {
        last = next;
        setVisible(next);
      }
    };
    return onScrollFrame(measure);
  }, []);

  return (
    <button
      type="button"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Revenir en haut de la page"
      title="Haut de page"
      className={`homera-press fixed bottom-6 right-5 z-[65] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-[0_20px_45px_-30px_rgba(28,17,11,0.9)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(.22,.61,.28,1)] hover:border-homera-terracotta hover:text-homera-terracotta ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

"use client";

import { useCallback } from "react";
import { useMotionPreferences, useSceneMotion } from "@/lib/motion";
import { phase } from "@/lib/motion-math";

const LINES = ["L’immobilier commence par un lieu.", "La confiance commence par HOMERA."];
const WORDS = LINES.join(" ").split(" ");

/** Un seul grand texte scroll-reveal : le lien entre repères et intentions. */
export function IdentityStatement() {
  const { reduced } = useMotionPreferences();
  const update = useCallback((element: HTMLElement, progress: number) => {
    element.querySelectorAll<HTMLElement>("[data-word]").forEach((word, index) => {
      const start = index / WORDS.length * 0.78;
      word.style.setProperty("--word-progress", phase(progress, start, start + 0.22).toFixed(4));
    });
    element.style.setProperty("--statement-line", phase(progress, 0.05, 0.9).toFixed(4));
  }, []);
  const ref = useSceneMotion<HTMLElement>(update, { enabled: !reduced, mode: "reveal", response: 65 });
  return (
    <section ref={ref} className="homera-statement homera-on-dark relative px-4 text-center sm:px-6" aria-labelledby="homera-statement-title">
      <div className="relative z-[1] mx-auto max-w-5xl">
        <span aria-hidden="true" className="homera-statement-thread mx-auto mb-10 block h-20 w-px bg-white/15"><span /></span>
        <p className="mb-6 text-micro font-semibold uppercase tracking-[.3em] text-homera-amber">Un lieu. Une identité. Une confiance.</p>
        <h2 id="homera-statement-title" className="font-serif text-display-2xl">
          <span className="sr-only">{LINES.join(" ")}</span>
          <span aria-hidden="true">
            {LINES.map((line, lineIndex) => (
              <span key={line} className="block">
                {line.split(" ").map((word, index) => (
                  <span key={`${lineIndex}-${index}`} data-word className={`homera-scroll-word inline-block ${word === "HOMERA." ? "text-homera-amber" : "text-homera-paper"}`}>{word}{"\u00a0"}</span>
                ))}
              </span>
            ))}
          </span>
        </h2>
        <p className="mx-auto mt-8 max-w-md text-body-sm leading-relaxed text-homera-cream-dark">Avant une annonce, il y a un lieu à découvrir et un dossier à comprendre.</p>
      </div>
    </section>
  );
}

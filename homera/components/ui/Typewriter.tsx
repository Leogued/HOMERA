"use client";
import { useEffect, useRef, useState } from "react";
import { useMotionPreferences } from "@/lib/motion";
/* ==================================================================
   HOMERA — MACHINE À ÉCRIRE DU HERO
   ------------------------------------------------------------------
   L'accroche se tape caractère par caractère, marque une pause de
   lecture, s'efface puis enchaîne la formulation suivante, en boucle.
   Mouvement réduit (`prefers-reduced-motion`) : texte statique, aucun
   timer. La hauteur est réservée par le parent : aucun déplacement de
   mise en page pendant le cycle. Les lecteurs d'écran reçoivent le
   texte complet, jamais la frappe en cours.
   ================================================================== */
const TYPE_MS = 40;
const ERASE_MS = 12;
/* Pause de lecture adaptée à la quantité de texte : ~85 ms par caractère,
   6,5 s minimum pour lire confortablement la phrase entière. */
const READ_MIN_MS = 6500;
const READ_PER_CHAR_MS = 85;
const NEXT_MS = 700;
const START_MS = 600;
export function Typewriter({ phrases, className = "" }: { phrases: string[]; className?: string }) {
  const { reduced } = useMotionPreferences();
  const [text, setText] = useState("");
  const timers = useRef<number[]>([]);
  useEffect(() => {
    let alive = true;
    if (reduced || phrases.length === 0) {
      const still = window.setTimeout(() => {
        if (alive) setText(phrases[0] ?? "");
      }, 0);
      return () => {
        alive = false;
        window.clearTimeout(still);
      };
    }
    let phrase = 0;
    let char = 0;
    let erasing = false;
    const later = (fn: () => void, ms: number) => {
      timers.current.push(
        window.setTimeout(() => {
          if (alive) fn();
        }, ms),
      );
    };
    const tick = () => {
      const current = phrases[phrase % phrases.length];
      if (!erasing) {
        char += 1;
        setText(current.slice(0, char));
        later(tick, char >= current.length ? ((erasing = true), Math.max(READ_MIN_MS, current.length * READ_PER_CHAR_MS)) : TYPE_MS);
      } else {
        char -= 1;
        setText(current.slice(0, Math.max(0, char)));
        if (char <= 0) {
          erasing = false;
          phrase += 1;
          later(tick, NEXT_MS);
        } else {
          later(tick, ERASE_MS);
        }
      }
    };
    later(tick, START_MS);
    return () => {
      alive = false;
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [reduced, phrases]);
  if (reduced) return <span className={className}>{phrases[0] ?? ""}</span>;
  return (
    <span className={className}>
      <span className="sr-only">{phrases[0] ?? ""}</span>
      <span aria-hidden="true">
        {text}
        <span aria-hidden="true" className="homera-type-caret" />
      </span>
    </span>
  );
}

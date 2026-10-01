"use client";

import { createElement, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useInView } from "@/lib/motion";

/* ==================================================================
   REVEAL — l’apparition progressive HOMERA
   ------------------------------------------------------------------
   Un seul composant pour toutes les entrées en scène : chaque élément
   arrive à son propre rythme (décalage, amplitude, flou) et le CSS
   désactive tout automatiquement si l’utilisateur préfère réduire les
   animations. Aucun élément ne bouge « en même temps ».
   ================================================================== */

type RevealProps = {
  children: ReactNode;
  /** Décalage dans la séquence d’apparition (ms). */
  delay?: number;
  /** Amplitude verticale (px). 0 pour un fondu pur. */
  y?: number;
  x?: number;
  blur?: number;
  scale?: number;
  /** Révélation par rideau (image qui se découvre). */
  clip?: boolean;
  /** Rayon appliqué au rideau (pour épouser les coins arrondis). */
  clipRadius?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
  threshold?: number;
  /** Révèle dès le premier rendu (héros, éléments déjà à l’écran). */
  immediate?: boolean;
};

export function Reveal({
  children,
  delay = 0,
  y = 24,
  x = 0,
  blur = 0,
  scale = 1,
  clip = false,
  clipRadius = 0,
  duration = 820,
  className = "",
  style,
  as = "div",
  threshold = 0.2,
  immediate = false,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold, once: true });
  const revealed = immediate || inView;

  const vars: Record<string, string> = {
    "--reveal-delay": `${delay}ms`,
    "--reveal-y": `${y}px`,
    "--reveal-x": `${x}px`,
    "--reveal-blur": `${blur}px`,
    "--reveal-scale": `${scale}`,
    "--reveal-duration": `${duration}ms`,
  };
  if (clip) {
    vars["--reveal-clip"] = "100%";
    vars["--reveal-clip-radius"] = `${clipRadius}px`;
  }

  // L'observateur regarde une boîte NON masquée : un clip-path fermé
  // ne peut pas empêcher sa propre détection d'entrée dans le viewport.
  if (clip) {
    return createElement(as, { ref, className, style },
      createElement("div", {
        "data-revealed": revealed ? "true" : "false",
        className: "homera-reveal homera-reveal-clip h-full",
        style: vars as CSSProperties,
      }, children),
    );
  }

  return createElement(
    as,
    {
      ref,
      "data-revealed": revealed ? "true" : "false",
      className: `homera-reveal ${clip ? "homera-reveal-clip" : ""} ${className}`,
      style: { ...(vars as CSSProperties), ...style },
    },
    children,
  );
}

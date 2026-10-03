"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

/* ==================================================================
   HOMERA — SCÈNES
   ------------------------------------------------------------------
   Briques communes à toutes les sections : en-tête de scène numéroté
   (le fil conducteur du voyage) et fondus entre deux scènes pour
   éviter l’enchaînement « section blanche / section blanche ».
   ================================================================== */

export function SceneHeader({
  index,
  eyebrow,
  title,
  intro,
  align = "left",
  tone = "light",
  className = "",
  actions,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
  actions?: ReactNode;
}) {
  const isCenter = align === "center";
  const muted = tone === "dark" ? "text-homera-cream-dark/80" : "text-muted";
  const accent = tone === "dark" ? "text-homera-amber" : "homera-accent-ink";

  return (
    <header
      className={`${isCenter ? "mx-auto max-w-3xl text-center" : "text-left"} ${className}`}
    >
      <Reveal y={14} blur={3} duration={640} className="flex items-center gap-3"
        style={{ justifyContent: isCenter ? "center" : "flex-start" }}
      >
        <span className={`homera-num text-caption font-semibold tracking-[0.3em] ${accent}`}>
          {index}
        </span>
        <span aria-hidden="true" className={`h-px w-10 ${tone === "dark" ? "bg-white/25" : "bg-homera-terracotta/40"}`} />
        <span className={`text-micro font-semibold uppercase tracking-[0.24em] ${muted}`}>
          {eyebrow}
        </span>
      </Reveal>

      <Reveal delay={90} y={26} as="h2" className={`mt-5 font-serif text-display-sm sm:text-display-md ${tone === "dark" ? "text-white" : "text-foreground"}`}>
        {title}
      </Reveal>

      {intro && (
        <Reveal delay={170} y={20} as="p" className={`mt-4 max-w-2xl text-body-sm leading-relaxed sm:text-body ${muted} ${isCenter ? "mx-auto" : ""}`}>
          {intro}
        </Reveal>
      )}

      {actions && (
        <Reveal delay={240} y={16} className={`mt-7 flex flex-wrap items-center gap-3 ${isCenter ? "justify-center" : ""}`}>
          {actions}
        </Reveal>
      )}
    </header>
  );
}

"use client";
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";
/* ================================================================== HOMERA — SCÈNES ------------------------------------------------------------------ Briques communes à toutes les sections : en-tête de scène (titre, introduction) et fondus entre deux scènes pour éviter l’enchaînement « section blanche / section blanche ». ================================================================== */ export function SceneHeader({
  title,
  intro,
  align = "left",
  tone = "light",
  className = "",
  actions,
}: {
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
  actions?: ReactNode;
}) {
  const isCenter = align === "center";
  const muted = tone === "dark" ? "text-homera-cream-dark/80" : "text-muted";
  return (
    <header className={`${isCenter ? "mx-auto max-w-3xl text-center" : "text-left"} ${className}`}>
      {" "}
      <Reveal
        delay={90}
        y={26}
        as="h2"
        className={`mt-5 font-serif text-display-sm sm:text-display-md ${tone === "dark" ? "text-white" : "text-foreground"}`}
      >
        {" "}
        {title}{" "}
      </Reveal>{" "}
      {intro && (
        <Reveal
          delay={170}
          y={20}
          as="p"
          className={`mt-4 max-w-2xl text-body-sm leading-relaxed sm:text-body ${muted} ${isCenter ? "mx-auto" : ""}`}
        >
          {" "}
          {intro}{" "}
        </Reveal>
      )}{" "}
      {actions && (
        <Reveal
          delay={240}
          y={16}
          className={`mt-7 flex flex-wrap items-center gap-3 ${isCenter ? "justify-center" : ""}`}
        >
          {" "}
          {actions}{" "}
        </Reveal>
      )}{" "}
    </header>
  );
}

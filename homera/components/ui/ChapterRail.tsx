"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { onScrollFrame } from "@/lib/motion";
/* ================================================================== HOMERA — FIL CONDUCTEUR ------------------------------------------------------------------ Un repère discret : une barre de progression de lecture, en haut de page. ================================================================== */ export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement | null>(null);
  useEffect(
    () =>
      onScrollFrame(() => {
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const progress = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
        if (barRef.current) barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      }),
    [],
  );
  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent">
      {" "}
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-homera-terracotta via-homera-terracotta-light to-homera-amber"
        style={{ transform: "scaleX(0)" }}
      />{" "}
    </div>
  );
}
/* ------------------------------------------------------------------ Remonter — utile sur une page longue, discret partout ------------------------------------------------------------------ */ export function BackToTop() {
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
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        })
      }
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Revenir en haut de la page"
      title="Haut de page"
      className={`homera-press fixed bottom-6 right-5 z-[65] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-[0_20px_45px_-30px_rgba(28,17,11,0.9)] backdrop-blur-md transition-all duration-500 ease-standard hover:border-homera-terracotta hover:text-homera-terracotta ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      {" "}
      <ArrowUp className="h-4 w-4" aria-hidden="true" />{" "}
    </button>
  );
}

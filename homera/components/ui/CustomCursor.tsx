"use client";

import { useEffect, useRef, useState } from "react";
import { requestMotionFrame, useCursorCapable } from "@/lib/motion";
import { damp } from "@/lib/motion-math";

const LABELS: Record<string, string> = { explore: "Explorer", property: "Voir le bien", drag: "Glisser" };

/* Une annotation, pas un remplacement de souris. Elle n'existe que
   sur une action disponible, et se retire dès le scroll ou la sortie.
   Le pointeur natif n'est jamais masqué. */
export function CustomCursor() {
  const capable = useCursorCapable();
  const [label, setLabel] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!capable) return;
    let cancel: (() => void) | null = null;
    let time = 0;
    let initialized = false;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const render = (nextTime: number) => {
      cancel = null;
      const elapsed = Math.min(64, time ? nextTime - time : 16);
      time = nextTime;
      current.x = damp(current.x, target.x, elapsed, 65);
      current.y = damp(current.y, target.y, elapsed, 65);
      if (ref.current) ref.current.style.transform = `translate3d(${(current.x + 15).toFixed(1)}px, ${(current.y + 18).toFixed(1)}px, 0)`;
      if (Math.abs(current.x - target.x) + Math.abs(current.y - target.y) > 0.3) cancel = requestMotionFrame(render);
    };
    const modeFor = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest<HTMLElement>("[data-cursor]") : null;
      if (!element || element.closest("[inert], [aria-hidden='true']") || element.matches(":disabled, [aria-disabled='true']")) return null;
      return LABELS[element.dataset.cursor ?? ""] ?? null;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const next = modeFor(event.target);
      setLabel(next);
      if (!next) return;
      target.x = event.clientX; target.y = event.clientY;
      if (!initialized) { current.x = target.x; current.y = target.y; initialized = true; }
      if (!cancel) cancel = requestMotionFrame(render);
    };
    const over = (event: PointerEvent) => setLabel(modeFor(event.target));
    const hide = () => { setLabel(null); initialized = false; cancel?.(); cancel = null; };
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerleave", hide);
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("blur", hide);
    return () => {
      cancel?.();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      window.removeEventListener("scroll", hide);
      window.removeEventListener("blur", hide);
    };
  }, [capable]);

  if (!capable) return null;
  return (
    <div ref={ref} aria-hidden="true" className="homera-cursor fixed left-0 top-0 z-[90]"
      style={{ opacity: label ? 1 : 0, transition: "opacity 160ms var(--homera-ease)" }}>
      <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border border-homera-terracotta/40 bg-homera-paper/95 px-3 py-2 text-micro font-semibold uppercase tracking-[.16em] text-homera-brown shadow-sm transition-transform duration-150 ${pressed ? "scale-95" : "scale-100"}`}>{label}</span>
    </div>
  );
}

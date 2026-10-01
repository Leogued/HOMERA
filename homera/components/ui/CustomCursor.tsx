"use client";

import { useEffect, useRef, useState } from "react";
import { useCursorCapable, useMediaQuery } from "@/lib/motion";

/* ==================================================================
   HOMERA — CURSEUR
   ------------------------------------------------------------------
   Desktop à pointeur fin uniquement. La souris native n’est jamais
   supprimée (le curseur natif reste visible, simplement accompagné
   d’un halo discret qui change d’intention) :
   • lien / bouton → halo qui se resserre ;
   • image ou carte explorable → annotation « Explorer » ;
   • carrousel → « Glisser ».

   Sur mobile, ou si l’utilisateur préfère réduire les animations, le
   composant ne rend strictement rien.
   ================================================================== */

type CursorLabel = { text: string } | null;

export function CustomCursor() {
  const capable = useCursorCapable();
  const isTouch = useMediaQuery("(hover: none), (pointer: coarse)");
  const [label, setLabel] = useState<CursorLabel>(null);
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!capable || isTouch) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    let interactionsBound = false;

    const render = () => {
      frame = 0;
      current.x += (target.x - current.x) * 0.2;
      current.y += (target.y - current.y) * 0.2;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${current.x.toFixed(1)}px, ${current.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
      if (Math.abs(target.x - current.x) > 0.2 || Math.abs(target.y - current.y) > 0.2) {
        frame = requestAnimationFrame(render);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!visible) setVisible(true);
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onPointerOver = (event: PointerEvent) => {
      const element = (event.target as HTMLElement | null)?.closest?.(
        "[data-cursor], a, button, input",
      ) as HTMLElement | null;
      if (!element) {
        setLabel(null);
        return;
      }
      const mode = element.dataset?.cursor;
      if (mode === "explore") setLabel({ text: "Explorer" });
      else if (mode === "drag") setLabel({ text: "Glisser" });
      else if (mode === "text") setLabel(null);
      else setLabel(null);
    };

    const onPointerDown = () => setPressed(true);
    const onPointerUp = () => setPressed(false);
    const onLeave = () => setVisible(false);

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointerleave", onLeave);
    interactionsBound = true;

    return () => {
      if (interactionsBound) {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerover", onPointerOver);
        document.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointerleave", onLeave);
      }
      if (frame) cancelAnimationFrame(frame);
    };
    // `visible` volontairement exclu : lu une seule fois, l’état est géré sans re-câblage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capable, isTouch]);

  if (!capable || isTouch) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      className="homera-cursor fixed left-0 top-0 z-[90] flex items-center justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms linear",
      }}
    >
      <span
        className={`flex items-center justify-center rounded-full border border-homera-terracotta/70 bg-homera-terracotta/12 backdrop-blur-[2px] ${
          pressed ? "scale-90" : "scale-100"
        }`}
        style={{
          width: label ? "auto" : "22px",
          height: label ? "22px" : "22px",
          paddingInline: label ? "10px" : 0,
          transition:
            "width 380ms var(--homera-ease), padding 380ms var(--homera-ease), transform 220ms var(--homera-ease), background-color 300ms linear",
        }}
      >
        {label && (
          <span className="whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.2em] text-homera-terracotta">
            {label.text}
          </span>
        )}
      </span>
    </div>
  );
}

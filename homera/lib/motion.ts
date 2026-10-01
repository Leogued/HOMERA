/* ==================================================================
   HOMERA — MOTEUR DE MOUVEMENT
   ------------------------------------------------------------------
   Un seul endroit décide comment la page bouge : frames à la demande
   partagées, seuils communs, et surtout respect
   strict de `prefers-reduced-motion` _et_ des appareils compacts.

   Aucune dépendance : ces primitives couvrent le besoin réel de la
   page (reveals, parallax, compteurs, scènes épinglées, chapitre
   actif) sans embarquer une librairie d’animation entière.

   Les préférences d’appareil passent par `useSyncExternalStore` :
   aucune cascade de rendu au montage, aucune désynchronisation entre
   le serveur et le navigateur.
   ================================================================== */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { clamp, damp, smoothstep, stickyProgress } from "@/lib/motion-math";

/* ------------------------------------------------------------------
   Boucle rAF partagée — un seul listener pour toute la page
   ------------------------------------------------------------------ */

import { onAnimationFrame, onScrollFrame, requestMotionFrame } from "@/lib/motion-frame";
export { onAnimationFrame, onScrollFrame, requestMotionFrame } from "@/lib/motion-frame";

/* ------------------------------------------------------------------
   Préférences d’appareil
   ------------------------------------------------------------------ */

/** Écoute une media query sans effet ni rendu en cascade. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type MotionPreferences = {
  /** `prefers-reduced-motion: reduce` */
  reduced: boolean;
  /** Écran compact / mobile — réduit l’amplitude et la durée des effets. */
  compact: boolean;
  /** Pointeur grossier (tactile) — désactive les effets liés à la souris. */
  coarse: boolean;
};

export function useMotionPreferences(): MotionPreferences {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const compact = useMediaQuery("(max-width: 767px)");
  const coarse = useMediaQuery("(hover: none), (pointer: coarse)");

  return useMemo(() => ({ reduced, compact, coarse }), [reduced, compact, coarse]);
}

/** Vrai uniquement après hydratation (portails, icônes dépendant du thème). */
export function useMounted(): boolean {
  const subscribe = useCallback(() => () => {}, []);
  const getSnapshot = useCallback(() => true, []);
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ------------------------------------------------------------------
   Apparition dans le viewport
   ------------------------------------------------------------------ */

type InViewOptions = {
  /** Part visible déclenchant l’apparition (0 → 1). */
  threshold?: number;
  rootMargin?: string;
  /** `false` pour rejouer l’animation à chaque passage. */
  once?: boolean;
};

export function useInView<T extends HTMLElement>({
  threshold = 0.22,
  rootMargin = "0px 0px -8% 0px",
  once = true,
}: InViewOptions = {}) {
  const ref = useRef<T | null>(null);
  // Même état serveur / première hydratation, même sans IntersectionObserver.
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") return requestMotionFrame(() => setInView(true));

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView } as const;
}

/* ------------------------------------------------------------------
   Progression de scroll d’une section (parallax / storytelling)
   ------------------------------------------------------------------ */

type SceneMode = "viewport" | "reveal" | "exit" | "sticky";

/**
 * Timeline continue : mesures à la demande, puis inertie très courte.
 * Les pixels vivent dans les variables CSS ; React ne change que les étapes.
 * Le contenu reste lisible tant que data-motion-ready n'est pas posé.
 */
export function useSceneMotion<T extends HTMLElement>(
  update: (element: T, progress: number) => void,
  { enabled = true, mode = "viewport", response = 85 }: {
    enabled?: boolean;
    mode?: SceneMode;
    response?: number;
  } = {},
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let cancel: (() => void) | null = null;
    let current = 0;
    let lastTime = 0;
    let first = true;
    let near = true;
    const sticky = element.querySelector<HTMLElement>("[data-story-sticky]");

    const tick = (time: number) => {
      cancel = null;
      if (document.hidden) return;
      const rect = element.getBoundingClientRect();
      const vh = window.innerHeight;
      const target = mode === "sticky"
        ? stickyProgress(rect.top, rect.height, sticky?.offsetHeight ?? vh,
            sticky ? parseFloat(getComputedStyle(sticky).top) || 0 : 0)
        : mode === "exit"
          ? clamp(-rect.top / Math.max(1, rect.height))
          : mode === "reveal"
            ? clamp((vh * 0.88 - rect.top) / (vh * 0.62 + rect.height * 0.18))
            : clamp((vh - rect.top) / Math.max(1, rect.height + vh));
      current = first || !near ? target : damp(current, target, Math.min(64, time - lastTime), response);
      first = false;
      lastTime = time;
      if (Math.abs(target - current) < 0.0005) current = target;
      element.dataset.motionReady = "true";
      element.style.setProperty("--scene-progress", current.toFixed(5));
      update(element, current);
      if (near && current !== target) cancel = requestMotionFrame(tick);
    };
    const wake = () => { if (!cancel) cancel = requestMotionFrame(tick); };
    const stop = onScrollFrame(() => { if (near) wake(); });
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => { near = entry.isIntersecting; wake(); }, { rootMargin: "12% 0px" })
      : null;
    observer?.observe(element);
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(wake) : null;
    resize?.observe(element);
    if (sticky) resize?.observe(sticky);
    wake();
    return () => {
      stop(); cancel?.(); observer?.disconnect(); resize?.disconnect();
      delete element.dataset.motionReady;
      element.style.removeProperty("--scene-progress");
    };
  }, [enabled, mode, response, update]);
  return ref;
}

/** Fixation seulement lorsqu'il existe assez de place pour lire toute la scène. */
export function useStoryCapable() {
  return useMediaQuery("(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)");
}

/** Les commandes clavier et le scroll parlent exactement la même timeline. */
export function scrollToStory(element: HTMLElement | null, progress: number, reduced = false) {
  if (!element) return;
  const sticky = element.querySelector<HTMLElement>("[data-story-sticky]");
  const offset = sticky ? parseFloat(getComputedStyle(sticky).top) || 0 : 0;
  const travel = element.offsetHeight - (sticky?.offsetHeight ?? window.innerHeight);
  window.scrollTo({
    top: window.scrollY + element.getBoundingClientRect().top - offset + Math.max(0, travel) * clamp(progress),
    behavior: reduced ? "auto" : "smooth",
  });
}

/** Progression de l’élément dans le viewport : 0 en entrant par le bas, 1 en sortant par le haut. */
export function useScrollProgress<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let lastTime = 0;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const travel = rect.height + window.innerHeight;
      if (travel <= 0) return;
      const value = (window.innerHeight - rect.top) / travel;
      setProgress(Math.min(1, Math.max(0, value)));
    };

    const stop = onScrollFrame((time) => {
      if (time === lastTime) return;
      lastTime = time;
      measure();
    });

    return stop;
  }, [enabled]);

  return { ref, progress } as const;
}

/* ------------------------------------------------------------------
   Scène épinglée : progression exacte de la phase de fixation
   ------------------------------------------------------------------ */

export function usePanProgress<T extends HTMLElement, S extends HTMLElement>(enabled = true) {
  const sectionRef = useRef<T | null>(null);
  const stickyRef = useRef<S | null>(null);
  const [pan, setPan] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !enabled) return;

    let last = 0;
    const measure = () => {
      const rect = section.getBoundingClientRect();
      const sticky = stickyRef.current?.offsetHeight ?? window.innerHeight;
      const travel = section.offsetHeight - sticky;
      const value = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      setPan(value);
    };

    const stop = onScrollFrame((time) => {
      if (time === last) return;
      last = time;
      measure();
    });

    return stop;
  }, [enabled]);

  return { sectionRef, stickyRef, pan } as const;
}

/* ------------------------------------------------------------------
   Parallax de pointeur — profondeur maîtrisée, desktop uniquement
   ------------------------------------------------------------------ */

type PointerMotionOptions = {
  /** Amplitude absolue maximum, en pixels (jamais plus de 8 sur une scène). */
  strength?: number;
  tilt?: number;
  enabled?: boolean;
  sourceRef?: RefObject<HTMLElement | null>;
};

export function usePointerMotion<T extends HTMLElement>({
  strength = 6, tilt = 0, enabled = true, sourceRef,
}: PointerMotionOptions = {}) {
  const ref = useRef<T | null>(null);
  const capable = useCursorCapable();

  useEffect(() => {
    const element = ref.current;
    const source = sourceRef?.current ?? element;
    if (!element || !source || !enabled || !capable) return;
    let cancel: (() => void) | null = null;
    let bounds: DOMRect | null = null;
    let lastTime = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const properties = ["--parallax-x", "--parallax-y", "--tilt-x", "--tilt-y"];

    const render = (time: number) => {
      cancel = null;
      const elapsed = Math.min(64, lastTime ? time - lastTime : 16);
      lastTime = time;
      current.x = damp(current.x, target.x, elapsed, 105);
      current.y = damp(current.y, target.y, elapsed, 105);
      element.style.setProperty("--parallax-x", `${(current.x * strength).toFixed(2)}px`);
      element.style.setProperty("--parallax-y", `${(current.y * strength).toFixed(2)}px`);
      element.style.setProperty("--tilt-y", `${(current.x * tilt).toFixed(2)}deg`);
      element.style.setProperty("--tilt-x", `${(-current.y * tilt).toFixed(2)}deg`);
      if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.002) {
        cancel = requestMotionFrame(render);
      }
    };
    const wake = () => { if (!cancel) cancel = requestMotionFrame(render); };
    const enter = () => { bounds = source.getBoundingClientRect(); };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      bounds ??= source.getBoundingClientRect();
      target.x = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width) * 2 - 1, -1, 1);
      target.y = clamp((event.clientY - bounds.top) / Math.max(1, bounds.height) * 2 - 1, -1, 1);
      wake();
    };
    const leave = () => { target.x = 0; target.y = 0; bounds = null; wake(); };
    source.addEventListener("pointerenter", enter);
    source.addEventListener("pointermove", move, { passive: true });
    source.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", leave, { passive: true });
    return () => {
      source.removeEventListener("pointerenter", enter);
      source.removeEventListener("pointermove", move);
      source.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", leave);
      cancel?.();
      for (const property of properties) element.style.removeProperty(property);
    };
  }, [strength, tilt, enabled, sourceRef, capable]);
  return ref;
}

/* ------------------------------------------------------------------
   Compteur animé — déclenché à l’entrée dans le viewport
   ------------------------------------------------------------------ */

type CountUpOptions = {
  active: boolean;
  duration?: number;
  reduced?: boolean;
  delay?: number;
};

export function useCountUp(value: number, { active, duration = 1500, reduced = false, delay = 0 }: CountUpOptions) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    if (!active || reduced) return;
    let start: number | null = null;
    let stop = () => {};
    stop = onAnimationFrame((time) => {
      start ??= time + delay;
      const elapsed = clamp((time - start) / duration);
      setAnimated(Math.round(value * smoothstep(elapsed)));
      if (elapsed === 1) stop();
    });
    return () => stop();
  }, [active, value, duration, reduced, delay]);
  return reduced ? value : animated;
}

/* ------------------------------------------------------------------
   Curseur personnalisé — desktop à pointeur fin uniquement
   ------------------------------------------------------------------ */

export function useCursorCapable(): boolean {
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  return fine && !reduced;
}

/* ------------------------------------------------------------------
   Navigation clavier dans une liste (dropdowns, sommaire de services)
   ------------------------------------------------------------------ */

export function useRovingFocus<T extends HTMLElement>() {
  const containerRef = useRef<T | null>(null);

  const focusItem = useCallback((index: number) => {
    const items = containerRef.current?.querySelectorAll<HTMLElement>("[data-roving-item]");
    if (!items || items.length === 0) return;
    const safe = ((index % items.length) + items.length) % items.length;
    items[safe]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      const items = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>("[data-roving-item]") ?? [],
      );
      const current = items.indexOf(event.target as HTMLElement);
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          event.preventDefault();
          focusItem(current + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          event.preventDefault();
          focusItem(current - 1);
          break;
        case "Home":
          event.preventDefault();
          focusItem(0);
          break;
        case "End":
          event.preventDefault();
          focusItem(items.length - 1);
          break;
        default:
          break;
      }
    },
    [focusItem],
  );

  return { containerRef, handleKeyDown, focusItem } as const;
}

/* ------------------------------------------------------------------
   Ancrage actif du rail de chapitres
   ------------------------------------------------------------------ */

/** Renvoie l’identifiant de la section actuellement dominante. */
export function useActiveSection(ids: readonly string[], { offset = 0.42 } = {}) {
  const key = useMemo(() => ids.join("|"), [ids]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (sections.length === 0) return;

    let lastTime = 0;
    const measure = () => {
      const line = window.innerHeight * offset;
      let current = sections[0].id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
      }
      setActive(current);
    };

    const stop = onScrollFrame((time) => {
      if (time === lastTime) return;
      lastTime = time;
      measure();
    });

    return stop;
  }, [key, offset]);

  return active;
}

/* ------------------------------------------------------------------
   Variables CSS typées (les propriétés personnalisées ne figurent pas
   dans CSSProperties : ce helper évite un cast disséminé partout).
   ------------------------------------------------------------------ */

export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}

/* ==================================================================
   HOMERA — MOTEUR DE MOUVEMENT
   ------------------------------------------------------------------
   Un seul endroit décide comment la page bouge : boucle
   requestAnimationFrame partagée, seuils communs, et surtout respect
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
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

/* ------------------------------------------------------------------
   Boucle rAF partagée — un seul listener pour toute la page
   ------------------------------------------------------------------ */

type FrameCallback = (time: number) => void;

const frameCallbacks = new Set<FrameCallback>();

function pumpFrames(time: number) {
  for (const callback of frameCallbacks) callback(time);
  if (frameCallbacks.size > 0) requestAnimationFrame(pumpFrames);
}

export function onAnimationFrame(callback: FrameCallback) {
  const wasEmpty = frameCallbacks.size === 0;
  frameCallbacks.add(callback);
  if (wasEmpty) requestAnimationFrame(pumpFrames);
  return () => {
    frameCallbacks.delete(callback);
  };
}

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
  // Navigateurs sans IntersectionObserver : le contenu reste visible d’emblée.
  const [inView, setInView] = useState(
    () => typeof window !== "undefined" && typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

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

    const stop = onAnimationFrame((time) => {
      if (time - lastTime < 60) return; // ~16 mesures/s : suffisant et très léger
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

    const stop = onAnimationFrame((time) => {
      if (time - last < 60) return;
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
  /** Amplitude maximale en pixels (déjà faible par construction). */
  strength?: number;
  /** Inclinaison légère (°) — 0 pour un simple décalage. */
  tilt?: number;
  enabled?: boolean;
};

/**
 * Écrit `--parallax-x`, `--parallax-y` et `--tilt-x`/`--tilt-y` sur
 * l’élément : le rendu reste en CSS pur, sans re-render React.
 */
export function usePointerMotion<T extends HTMLElement>({
  strength = 8,
  tilt = 0,
  enabled = true,
}: PointerMotionOptions = {}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    let frame = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const render = () => {
      frame = 0;
      // Interpolation douce : le mouvement suit la souris sans la coller.
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      element.style.setProperty("--parallax-x", `${(current.x * strength).toFixed(2)}px`);
      element.style.setProperty("--parallax-y", `${(current.y * strength).toFixed(2)}px`);
      if (tilt > 0) {
        element.style.setProperty("--tilt-y", `${(current.x * tilt).toFixed(2)}deg`);
        element.style.setProperty("--tilt-x", `${(-current.y * tilt).toFixed(2)}deg`);
      }
      if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) {
        frame = requestAnimationFrame(render);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      target.x = (event.clientX - rect.left) / rect.width - 0.5;
      target.y = (event.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onPointerLeave = () => {
      target.x = 0;
      target.y = 0;
      if (!frame) frame = requestAnimationFrame(render);
    };

    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerleave", onPointerLeave);

    return () => {
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", onPointerLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [strength, tilt, enabled]);

  return ref;
}

/* ------------------------------------------------------------------
   Compteur animé — déclenché à l’entrée dans le viewport
   ------------------------------------------------------------------ */

type CountUpOptions = {
  active: boolean;
  duration?: number;
  reduced?: boolean;
};

export function useCountUp(value: number, { active, duration = 1500, reduced = false }: CountUpOptions) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (!active || reduced) return;

    let frame = 0;
    let start = 0;

    const step = (time: number) => {
      if (!start) start = time;
      const elapsed = Math.min(1, (time - start) / duration);
      // easeOutExpo : départ franc, atterrissage net sur le chiffre final
      const eased = elapsed === 1 ? 1 : 1 - Math.pow(2, -10 * elapsed);
      setAnimated(Math.round(value * eased));
      if (elapsed < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, value, duration, reduced]);

  // Mouvement réduit ou compteur non déclenché : la valeur finale, sans animation.
  if (reduced) return value;
  return animated;
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

    const stop = onAnimationFrame((time) => {
      if (time - lastTime < 120) return;
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

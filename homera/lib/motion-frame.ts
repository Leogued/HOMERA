/* HOMERA — ordonnanceur à la demande, indépendant de React.
   Une seule frame et un seul listener scroll partagés. */

type FrameCallback = (time: number) => void;

const frameCallbacks = new Set<FrameCallback>();
let frameId: number | null = null;

function pumpFrames(time: number) {
  frameId = null;
  const pending = [...frameCallbacks];
  frameCallbacks.clear();
  for (const callback of pending) callback(time);
}

/** Une frame à la demande, mutualisée. Aucune boucle quand la page est au repos. */
export function requestMotionFrame(callback: FrameCallback) {
  frameCallbacks.add(callback);
  if (frameId === null) frameId = requestAnimationFrame(pumpFrames);
  return () => {
    frameCallbacks.delete(callback);
    if (frameCallbacks.size === 0 && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };
}

/** Boucle bornée : utilisée uniquement le temps d'un compteur ou d'une inertie. */
export function onAnimationFrame(callback: FrameCallback) {
  let active = true;
  let cancel: () => void;
  const next = (time: number) => {
    if (!active) return;
    callback(time);
    if (active) cancel = requestMotionFrame(next);
  };
  cancel = requestMotionFrame(next);
  return () => { active = false; cancel(); };
}

const scrollCallbacks = new Set<FrameCallback>();
let cancelScrollFrame: (() => void) | null = null;
const emitScrollFrame = () => {
  if (cancelScrollFrame || document.hidden) return;
  cancelScrollFrame = requestMotionFrame((time) => {
    cancelScrollFrame = null;
    for (const callback of scrollCallbacks) callback(time);
  });
};

/** Un seul abonnement scroll / resize partagé par tous les repères de la page. */
export function onScrollFrame(callback: FrameCallback) {
  if (scrollCallbacks.size === 0) {
    window.addEventListener("scroll", emitScrollFrame, { passive: true });
    window.addEventListener("resize", emitScrollFrame, { passive: true });
    window.addEventListener("pageshow", emitScrollFrame);
    document.addEventListener("visibilitychange", emitScrollFrame);
    window.visualViewport?.addEventListener("resize", emitScrollFrame);
  }
  scrollCallbacks.add(callback);
  emitScrollFrame();
  return () => {
    scrollCallbacks.delete(callback);
    if (scrollCallbacks.size !== 0) return;
    window.removeEventListener("scroll", emitScrollFrame);
    window.removeEventListener("resize", emitScrollFrame);
    window.removeEventListener("pageshow", emitScrollFrame);
    document.removeEventListener("visibilitychange", emitScrollFrame);
    window.visualViewport?.removeEventListener("resize", emitScrollFrame);
    cancelScrollFrame?.();
    cancelScrollFrame = null;
  };
}

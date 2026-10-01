/* Primitives pures du langage HOMERA — testables sans navigateur. */

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * clamp(progress);

/** Accélération puis décélération, sans rebond ni dépassement. */
export function smoothstep(progress: number) {
  const p = clamp(progress);
  return p * p * (3 - 2 * p);
}

export const phase = (progress: number, start: number, end: number) =>
  smoothstep(end > start ? (progress - start) / (end - start) : progress >= end ? 1 : 0);

/** Inertie indépendante du taux de rafraîchissement (60 / 120 Hz). */
export function damp(current: number, target: number, elapsed: number, response = 90) {
  if (response <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-Math.max(0, elapsed) / response));
}

/** La phase fixée commence quand le haut atteint le décalage sticky. */
export function stickyProgress(top: number, height: number, stickyHeight: number, offset = 0) {
  const travel = height - stickyHeight;
  return travel > 0 ? clamp((offset - top) / travel) : 0;
}

/** Sept étapes, avec un temps de lecture identique pour chaque étape. */
export function storyIndex(progress: number, count: number) {
  return Math.min(Math.max(0, count - 1), Math.floor(clamp(progress) * Math.max(1, count)));
}

export function storyPosition(index: number, count: number) {
  return count > 1 ? clamp((index + 0.25) / count) : 0;
}

/** Distance signée au foyer d’une galerie : géométrie, pas rotation décorative. */
export function galleryDepth(center: number, focus: number, width: number) {
  const distance = clamp((center - focus) / Math.max(1, width), -1, 1);
  return {
    distance,
    scale: 1 - Math.abs(distance) * 0.035,
    turn: -distance * 2.4,
    lift: Math.abs(distance) * 9,
  };
}

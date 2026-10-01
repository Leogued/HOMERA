import { clamp } from "@/lib/motion-math";

type AnchorRect = { top: number; bottom: number; left: number; width: number };
type Viewport = { width: number; height: number; top?: number; left?: number };

/** Un panneau reste dans le viewport visible, même avec le clavier mobile.
    Choisir le côté réellement disponible ; ne jamais imposer 160 px hors écran. */
export function fitDropdown(anchor: AnchorRect, viewport: Viewport, desiredHeight: number) {
  const padding = 12, gap = 10;
  const viewTop = viewport.top ?? 0, viewLeft = viewport.left ?? 0;
  const width = Math.min(Math.max(236, anchor.width), Math.max(1, viewport.width - padding * 2));
  const left = clamp(anchor.left, viewLeft + padding, Math.max(viewLeft + padding, viewLeft + viewport.width - width - padding));
  const below = Math.max(0, viewTop + viewport.height - padding - anchor.bottom - gap);
  const above = Math.max(0, anchor.top - viewTop - padding - gap);
  const opensAbove = below < desiredHeight && above > below;
  const maxHeight = Math.max(1, Math.min(desiredHeight, opensAbove ? above : below));
  const preferredTop = opensAbove ? anchor.top - gap - maxHeight : anchor.bottom + gap;
  const top = clamp(preferredTop, viewTop + padding, Math.max(viewTop + padding, viewTop + viewport.height - padding - maxHeight));
  return { top, left, width, maxHeight };
}

/** Un retour de focus programmatique ne doit pas rouvrir une suggestion. */
export function restoreFieldFocus(anchor: { focus: (options?: FocusOptions) => void } | null, guard: { current: boolean }) {
  if (!anchor) return;
  guard.current = true;
  try { anchor.focus({ preventScroll: true }); }
  finally { guard.current = false; }
}

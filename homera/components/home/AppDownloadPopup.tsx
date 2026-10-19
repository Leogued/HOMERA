"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PLAY_STORE_URL } from "@/lib/content";
import { Visual } from "@/components/ui/Visual";
import { useMounted, useMotionPreferences } from "@/lib/motion";
/* ==================================================================
   HOMERA — POP-UP DE TÉLÉCHARGEMENT
   ------------------------------------------------------------------
   Fenêtre compacte proposée au visiteur qui a commencé à explorer
   (temps passé + défilement), jamais à l'arrivée. Une fois par
   session, puis période de tranquillité de 30 jours après fermeture.
   Sans URL Play Store officielle : bouton « Bientôt », aucune
   disponibilité promise. Sans service de veille : aucune notification
   promise. Maquette de téléphone décorative (visuel HOMERA réel),
   jamais présentée comme l'interface de l'application.
   ================================================================== */
const ENGAGE_TIME_MS = 20000;
const SCROLL_FACTOR = 0.5;
const QUIET_DAYS = 30;
const SEEN_KEY = "homera:app-popup-shown";
const CLOSED_KEY = "homera:app-popup-closed-at";
const available = PLAY_STORE_URL.length > 0;
export function AppDownloadPopup() {
  const mounted = useMounted();
  const { reduced } = useMotionPreferences();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => {
    setOpen(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
      localStorage.setItem(CLOSED_KEY, String(Date.now()));
    } catch {
      /* Stockage indisponible : la fenêtre reste simplement fermée. */
    }
  }, []);
  /* Déclenchement : visiteur engagé (temps ET défilement), une seule fois. */
  useEffect(() => {
    if (open) return;
    let timeOk = false;
    let scrollOk = false;
    const quiet = () => {
      try {
        if (sessionStorage.getItem(SEEN_KEY)) return true;
        const closed = Number(localStorage.getItem(CLOSED_KEY) ?? 0);
        return Number.isFinite(closed) && Date.now() - closed < QUIET_DAYS * 86400000;
      } catch {
        return false;
      }
    };
    const maybeOpen = () => {
      if (!timeOk || !scrollOk || quiet()) return;
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* Sans stockage, la fenêtre s'ouvre mais ne reviendra pas d'elle-même. */
      }
      setOpen(true);
    };
    const onScroll = () => {
      scrollOk = window.scrollY > window.innerHeight * SCROLL_FACTOR;
      maybeOpen();
    };
    const timer = window.setTimeout(() => {
      timeOk = true;
      maybeOpen();
    }, ENGAGE_TIME_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open ]);
  /* Dialogue : focus piégé, Échap, fermeture au clic sur le voile. */
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("[data-popup-first]")?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((node) => !node.hasAttribute("disabled"));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open ]);
  if (!mounted || !open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-90 flex items-center justify-center p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {" "}
      <div aria-hidden="true" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />{" "}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-popup-titre"
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card text-foreground shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)] transition-all ease-standard ${reduced ? "duration-200" : "duration-320"}`}
      >
        {" "}
        <button
          type="button"
          data-popup-first
          onClick={close}
          aria-label="Fermer la proposition de téléchargement"
          className="homera-press absolute top-3 right-3 z-2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted transition-colors hover:text-foreground"
        >
          {" "}
          <X className="h-4 w-4" aria-hidden="true" />{" "}
        </button>{" "}
        <div className="flex flex-col items-center px-6 pt-6 pb-5 text-center">
          {" "}
          <span
            aria-hidden="true"
            className="flex h-28 w-14 items-end justify-center overflow-hidden rounded-2xl border border-border bg-homera-night"
          >
            {" "}
            <Visual
              mediaKey="intent-acheter"
              alt=""
              sizes="3.5rem"
              quality={60}
              className="h-full w-full"
              imageClassName="object-cover"
            />{" "}
          </span>{" "}
          <h2 id="app-popup-titre" className="mt-4 font-serif text-display-xs text-foreground">
            {" "}
            {available
              ? "HOMERA est disponible sur Android et tablette."
              : "HOMERA arrive bientôt sur Android et tablette."}{" "}
          </h2>{" "}
          <p className="mt-2 text-note leading-relaxed text-muted">
            {" "}
            {available
              ? "Téléchargez l’application pour suivre vos recherches où que vous soyez."
              : "L’application HOMERA arrive : suivez vos recherches où que vous soyez."}{" "}
          </p>{" "}
          {available ? (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="homera-press homera-sheen mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-btn homera-cta px-5 text-body-sm font-medium text-white"
            >
              {" "}
              Télécharger sur Google Play{" "}
            </a>
          ) : (
            <span
              aria-disabled="true"
              title="La fiche officielle n’est pas encore publiée"
              className="mt-4 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-btn border border-border bg-muted/20 px-5 text-body-sm font-medium text-muted"
            >
              {" "}
              Bientôt sur Google Play{" "}
            </span>
          )}{" "}
          <button
            type="button"
            onClick={close}
            className="homera-underline mt-3 text-note font-medium text-foreground"
          >
            {" "}
            Continuer sur le site{" "}
          </button>{" "}
          <p className="mt-3 text-caption text-muted-light"> Votre recherche continue, où que vous soyez. </p>{" "}
        </div>{" "}
      </div>{" "}
    </div>,
    document.body,
  );
}

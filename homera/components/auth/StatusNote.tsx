"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, Copy, Info, ShieldCheck, XCircle } from "lucide-react";
import { RESET_TTL_MINUTES, VERIFICATION_TTL_MINUTES } from "@/lib/auth";

/* ==================================================================
   HOMERA — MESSAGES D’ÉTAT ET AFFICHAGE DU PILOTE
   ------------------------------------------------------------------
   Les quatre états sémantiques du design system servent enfin à
   quelque chose : information, succès, avertissement, erreur. Ils sont
   assertés AA depuis la phase 2, donc lisibles dans les deux thèmes —
   ici, ils portent du texte réel.

   `PilotCode` est la pièce honnête du dispositif : aucun e-mail n’est
   envoyé (le pilote n’a pas de serveur d’envoi), donc le code s’affiche.
   Il est présenté comme tel, avec sa durée de validité réelle.
   ================================================================== */

export type StatusTone = "info" | "success" | "warning" | "error";

const STATUS = {
  info: { Icon: Info, wrap: "border-info/40 bg-info/8", ink: "text-info" },
  success: { Icon: CheckCircle2, wrap: "border-success/40 bg-success/8", ink: "text-success" },
  warning: { Icon: AlertTriangle, wrap: "border-warning/45 bg-warning/8", ink: "text-warning" },
  error: { Icon: XCircle, wrap: "border-error/45 bg-error/8", ink: "text-error" },
} as const;

export function StatusNote({
  tone = "info",
  title,
  children,
}: {
  tone?: StatusTone;
  title?: string;
  children: ReactNode;
}) {
  const { Icon, wrap, ink } = STATUS[tone];
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={`rounded-card border px-4 py-3.5 ${wrap}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ink}`} aria-hidden="true" />
        <div className="min-w-0 text-note leading-relaxed text-foreground">
          {title ? <p className={`font-semibold ${ink}`}>{title}</p> : null}
          <div className={title ? "mt-1" : ""}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Encadré répété sur chaque écran de compte : le pilote dit ce qu’il est. */
export function PilotNote({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-card/60 px-4 py-3.5">
      <p className="flex items-start gap-3 text-caption leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />
        <span>
          <span className="font-semibold text-foreground">Système pilote.</span>{" "}
          {children ?? (
            <>
              Les comptes du pilote sont conservés dans ce navigateur — aucun serveur ne les reçoit, et aucun
              e-mail n’est envoyé. Le mot de passe n’y est jamais stocké en clair : une empreinte PBKDF2-SHA-256
              est calculée localement.
            </>
          )}
        </span>
      </p>
    </div>
  );
}

/** Le code réel du pilote : affiché, copiable, avec sa durée de validité. */
export function PilotCode({
  code,
  label = "Votre code de confirmation",
  purpose = "verification",
}: {
  code: string;
  label?: string;
  purpose?: "verification" | "reset";
}) {
  const [copied, setCopied] = useState(false);
  // La durée vient des mêmes constantes que la vérification : aucun
  // décompte à l’écran, donc aucune horloge lue pendant le rendu.
  const minutes = purpose === "reset" ? RESET_TTL_MINUTES : VERIFICATION_TTL_MINUTES;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Presse-papiers refusé : le code reste lisible et sélectionnable.
      setCopied(false);
    }
  };

  return (
    <div className="rounded-card border border-homera-terracotta/35 bg-homera-terracotta/6 px-4 py-4">
      <p className="text-caption font-semibold uppercase tracking-[0.14em] homera-accent-ink">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="homera-num font-mono text-display-md font-semibold leading-none tracking-[0.35em] text-foreground">
          {code}
        </span>
        <button
          type="button"
          onClick={copy}
          className="homera-press inline-flex min-h-9 items-center gap-1.5 rounded-btn border border-border bg-card px-3 text-caption font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="mt-3 text-caption leading-relaxed text-muted">
        {purpose === "reset"
          ? `Ce code remplace le lien de l’e-mail : il est valable ${minutes} minutes après sa création. `
          : `Il est valable ${minutes} minutes après sa création. `}
        Aucun e-mail n’ayant été envoyé, il s’affiche ici et nulle part ailleurs — c’est la contrepartie assumée du
        pilote.
      </p>
    </div>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { TextRoll } from "@/components/ui/TextRoll";

/* ==================================================================
   HOMERA — BOUTON D’ENVOI
   ------------------------------------------------------------------
   Un seul couple d’états : prêt ou en cours. Pendant l’attente (le
   calcul PBKDF2 dure quelques dizaines de millisecondes), le bouton
   porte `aria-busy`, refuse un second envoi et le dit — pas de
   formulaire qui semble ne rien faire.
   ================================================================== */

export function SubmitButton({
  label,
  pending,
  pendingLabel = "Vérification…",
  icon,
  block = true,
  variant = "primary",
}: {
  label: string;
  pending?: boolean;
  pendingLabel?: string;
  icon?: React.ReactNode;
  block?: boolean;
  variant?: "primary" | "outline";
}) {
  const styles =
    variant === "primary"
      ? "homera-cta text-white"
      : "border border-border bg-card text-foreground hover:border-homera-terracotta hover:text-homera-terracotta";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`homera-press inline-flex min-h-12 items-center justify-center gap-2 rounded-btn px-5 text-body-sm font-medium transition-colors disabled:cursor-progress disabled:opacity-70 ${
        block ? "w-full" : ""
      } ${styles}`}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        <>
          {icon}
          <TextRoll>{label}</TextRoll>
        </>
      )}
    </button>
  );
}

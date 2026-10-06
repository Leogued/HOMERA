"use client";

import { AlertCircle } from "lucide-react";

/* ==================================================================
   HOMERA — CHAMP DE CODE (six chiffres)
   ------------------------------------------------------------------
   Un seul champ — pas six cases — pour que le collage, les lecteurs
   d’écran et les claviers de téléphone fonctionnent sans traitement
   particulier : `inputMode="numeric"`, `autoComplete="one-time-code"`
   et un filtrage des caractères non numériques à la saisie.
   ================================================================== */

export function CodeField({
  id,
  label,
  value,
  error,
  hint,
  onChange,
  autoFocus = false,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const hintId = hint && !error ? `${id}-aide` : undefined;
  const errorId = error ? `${id}-erreur` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-note font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`homera-num h-14 w-full rounded-input border bg-background text-center font-mono text-display-xs tracking-[0.5em] text-foreground outline-none transition-colors placeholder:tracking-[0.3em] placeholder:text-muted-light ${
          error ? "border-error/70" : "border-border hover:border-homera-terracotta/50 focus:border-homera-terracotta/70"
        }`}
        placeholder="000000"
      />
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-caption leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-caption font-medium text-error">
          <AlertCircle className="mt-[0.15rem] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

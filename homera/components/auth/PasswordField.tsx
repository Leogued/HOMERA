"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, Eye, EyeOff, Minus } from "lucide-react";
import { passwordCriteria, passwordStrength, type PasswordContext } from "@/lib/auth";
import { controlClass } from "@/components/auth/Field";

/* ==================================================================
   HOMERA — CHAMP DE MOT DE PASSE
   ------------------------------------------------------------------
   La politique annoncée est la politique appliquée : la liste des
   critères vient de lib/auth.ts, la même que celle qui valide le
   formulaire. Le curseur de robustesse ne juge pas à la place du
   contrôle — il aide à composer un mot de passe, il ne le remplace pas.

   Le bouton « afficher » est un vrai bouton (`aria-pressed`), il ne
   sort jamais du champ, et le critère non rempli reste lisible sans
   couleur (pictogramme + mot).
   ================================================================== */

const TONES = {
  error: { text: "text-error", bar: "bg-error" },
  warning: { text: "text-warning", bar: "bg-warning" },
  success: { text: "text-success", bar: "bg-success" },
} as const;

export function PasswordField({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
  autoComplete = "new-password",
  required = true,
  context = {},
  withMeter = false,
  autoFocus = false,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  required?: boolean;
  /** Prénom, nom, e-mail : servent au critère « ne reprend pas votre identité ». */
  context?: PasswordContext;
  withMeter?: boolean;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => passwordStrength(value, context), [value, context]);
  const criteria = useMemo(() => passwordCriteria(value, context), [value, context]);
  const tone = TONES[strength.tone];

  const hintId = withMeter && value !== "" ? `${id}-criteres` : undefined;
  const errorId = error ? `${id}-erreur` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="mb-1.5 block text-note font-medium text-foreground">
        {label}
        {required ? (
          <span className="ml-1 text-homera-terracotta" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClass(Boolean(error), "h-12 pr-14")}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={`${visible ? "Masquer" : "Afficher"} — ${label}`}
          className="homera-press absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:text-homera-terracotta"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Robustesse : texte + quatre segments, jamais la couleur seule */}
      {withMeter && value !== "" ? (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-muted">Robustesse</span>
            <span aria-live="polite" className={`text-caption font-semibold ${tone.text}`}>
              {strength.label}
            </span>
          </div>
          <div className="mt-1.5 flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  Math.round((strength.percent / 100) * 4) > step ? tone.bar : "bg-border"
                }`}
              />
            ))}
          </div>
          <ul id={hintId} className="mt-3 space-y-1">
            {criteria.map((criterion) => (
              <li
                key={criterion.id}
                className={`flex items-start gap-2 text-caption ${
                  criterion.met ? "text-muted" : criterion.required ? "text-foreground" : "text-muted-light"
                }`}
              >
                {criterion.met ? (
                  <Check className="mt-[0.15rem] h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Minus className="mt-[0.15rem] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {criterion.label}
                  {criterion.met ? <span className="sr-only"> — rempli</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
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

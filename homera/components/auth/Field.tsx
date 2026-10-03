"use client";

import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import type { FieldSpec } from "@/lib/auth";

/* ==================================================================
   HOMERA — CHAMPS DE FORMULAIRE
   ------------------------------------------------------------------
   Un seul jeu de champs pour les cinq écrans de compte : le libellé,
   l’aide, l’erreur et l’état ARIA sont posés de la même façon partout.

   Deux règles tenues ici :
   • `aria-describedby` ne référence que des identifiants réellement
     rendus — jamais une aide absente (l’audit du site le vérifie) ;
   • une erreur est annoncée, pas seulement colorée : `aria-invalid`
     et un texte lisible, y compris pour qui ne distingue pas le rouge.
   ================================================================== */

export function fieldGrid(span: FieldSpec["span"]): string {
  return span === "half" ? "sm:col-span-1" : "sm:col-span-2";
}

export function controlClass(hasError: boolean, extra = ""): string {
  const base =
    "w-full rounded-input border bg-background px-4 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-light";
  const tone = hasError
    ? "border-error/70 focus:border-error"
    : "border-border hover:border-homera-terracotta/50 focus:border-homera-terracotta/70";
  return `${base} ${tone} ${extra}`;
}

/** Enveloppe commune : libellé, contrôle, aide, erreur — dans cet ordre. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  className = "",
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const hintId = hint ? `${id}-aide` : undefined;
  const errorId = error ? `${id}-erreur` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-note font-medium text-foreground">
        {label}
        {required ? (
          <span className="ml-1 text-homera-terracotta" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children(describedBy)}
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

export type FieldProps = {
  id: string;
  spec: FieldSpec;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
};

export function TextField({ id, spec, value, error, onChange, onBlur, autoFocus }: FieldProps) {
  return (
    <Field
      id={id}
      label={spec.label}
      hint={spec.help}
      error={error}
      required={spec.required}
      className={fieldGrid(spec.span)}
    >
      {(describedBy) => (
        <input
          id={id}
          name={spec.name}
          type={spec.kind === "email" ? "email" : spec.kind === "tel" ? "tel" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={spec.autoComplete}
          inputMode={spec.inputMode}
          maxLength={spec.maxLength}
          placeholder={spec.placeholder}
          required={spec.required}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClass(Boolean(error), "h-12")}
        />
      )}
    </Field>
  );
}

export function SelectField({ id, spec, value, error, onChange, onBlur }: FieldProps) {
  const options = spec.options ?? [];
  return (
    <Field
      id={id}
      label={spec.label}
      hint={spec.help}
      error={error}
      required={spec.required}
      className={fieldGrid(spec.span)}
    >
      {(describedBy) => (
        <select
          id={id}
          name={spec.name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          required={spec.required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClass(Boolean(error), "h-12 appearance-none pr-10")}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b5545' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 1rem center",
          }}
        >
          {/* Un menu obligatoire affiche explicitement son état vide : sans cela,
              le navigateur montrerait la première option alors que la valeur est
              encore « rien », et l’utilisateur croirait avoir déjà choisi.
              Si la description fournit déjà une option vide, elle est seule. */}
          {options.some((option) => option.value === "")
            ? null
            : spec.required
              ? (
                  <option value="" disabled>
                    {spec.placeholder ?? "Sélectionnez…"}
                  </option>
                )
              : (
                  <option value="">{spec.placeholder ?? "Non précisé"}</option>
                )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({ id, spec, checked, error, onChange }: {
  id: string;
  spec: FieldSpec;
  checked: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
}) {
  const hintId = spec.help ? `${id}-aide` : undefined;
  const errorId = error ? `${id}-erreur` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="sm:col-span-2">
      <div
        className={`flex items-start gap-3 rounded-card border bg-card/60 px-4 py-3.5 transition-colors ${
          error ? "border-error/60" : "border-border"
        }`}
      >
        <input
          id={id}
          name={spec.name}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-border text-homera-terracotta accent-[var(--homera-terracotta-dark)]"
        />
        <div className="min-w-0">
          <label htmlFor={id} className="block text-note leading-relaxed text-foreground">
            {spec.label}
          </label>
          {spec.help && !error ? (
            <p id={hintId} className="mt-1 text-caption text-muted">
              {spec.help}
            </p>
          ) : null}
          {error ? (
            <p id={errorId} className="mt-1 flex items-start gap-1.5 text-caption font-medium text-error">
              <AlertCircle className="mt-[0.15rem] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Rend le champ correspondant à sa description — les formulaires n’arbitrent rien. */
export function FieldRenderer({
  id,
  spec,
  value,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  spec: FieldSpec;
  value: string | boolean;
  error?: string;
  onChange: (value: string | boolean) => void;
  onBlur?: () => void;
}) {
  if (spec.kind === "checkbox") {
    return (
      <CheckboxField
        id={id}
        spec={spec}
        checked={value === true}
        error={error}
        onChange={(next) => onChange(next)}
      />
    );
  }
  const text = typeof value === "string" ? value : "";
  if (spec.kind === "select") {
    return (
      <SelectField
        id={id}
        spec={spec}
        value={text}
        error={error}
        onBlur={onBlur}
        onChange={(next) => onChange(next)}
      />
    );
  }
  return (
    <TextField
      id={id}
      spec={spec}
      value={text}
      error={error}
      onBlur={onBlur}
      onChange={(next) => onChange(next)}
    />
  );
}

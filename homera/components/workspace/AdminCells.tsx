"use client";

/* Cellules d’information partagées par les écrans d’administration.
   Un seul composant, une seule mise en forme : deux variantes locales
   finiraient par diverger. */

export function AdminInfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dt className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-caption font-medium">{value}</dd>
    </div>
  );
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

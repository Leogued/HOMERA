import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { VisitStatus, RentalStage, ListingStatus, ContractStatus, VerificationDecision } from "@/lib/workflow";
import {
  VISIT_STATUS_LABELS,
  LISTING_STATUS_LABELS,
  RENTAL_STAGES,
} from "@/lib/workflow";

export function WorkspaceHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="text-caption font-semibold uppercase tracking-[0.18em] text-homera-terracotta">{eyebrow}</p>}
        <h1 className="mt-2 font-serif text-display-md sm:text-display-lg">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function WorkspacePanel({
  title,
  description,
  icon: Icon,
  children,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`workspace-panel rounded-card border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6 ${className}`}>
      {(Icon || title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-homera-terracotta/[0.09] text-homera-terracotta"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>}
            <div>
              <h2 className="text-body-md font-semibold">{title}</h2>
              {description && <p className="mt-1 text-caption leading-relaxed text-muted">{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: VisitStatus | RentalStage | ListingStatus | ContractStatus | VerificationDecision }) {
  const label = status in VISIT_STATUS_LABELS
    ? VISIT_STATUS_LABELS[status as VisitStatus]
    : status in LISTING_STATUS_LABELS
      ? LISTING_STATUS_LABELS[status as ListingStatus]
      : status === "a-signer"
        ? "À signer"
        : status === "signe"
          ? "Signé"
          : status === "brouillon"
            ? "Brouillon"
            : status === "envoye"
              ? "Envoyé"
              : status === "consulte"
                ? "Consulté"
                : status === "annule"
                  ? "Annulé"
                  : status === "a-examiner"
                    ? "À examiner"
                    : status === "valide"
                      ? "Validé"
                      : status === "modification-demandee"
                        ? "Modification demandée"
                        : status === "refuse"
                          ? "Refusé"
                          : status === "suspendu"
                            ? "Suspendu"
                            : RENTAL_STAGES.find((entry) => entry.id === status)?.label ?? String(status);
  const tone = status === "confirmee" || status === "terminee" || status === "verifie" || status === "publie" || status === "acceptee" || status === "active" || status === "signe" || status === "valide"
    ? "success"
    : status === "annulee" || status === "refusee" || status === "refuse" || status === "suspendu" || status === "indisponible"
      ? "error"
      : status === "demande-envoyee" || status === "en-attente" || status === "en-verification" || status === "etude" || status === "signature" || status === "preparation-cles" || status === "recuperation" || status === "a-examiner" || status === "modification-demandee" || status === "agent-indisponible" || status === "a-signer"
        ? "warning"
        : "neutral";
  return (
    <span className={`workspace-status workspace-status-${tone}`}>
      <span aria-hidden="true" className="workspace-status-dot" />{label}
    </span>
  );
}

export function MetricCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption font-medium text-muted">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      </div>
      <p className="homera-num mt-4 font-serif text-display-sm">{value}</p>
      {detail && <p className="mt-1 text-caption text-muted">{detail}</p>}
    </div>
  );
}

export function EmptyPanel({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-card border border-dashed border-border bg-background/60 px-5 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-homera-terracotta/[0.08] text-homera-terracotta"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <h3 className="mt-4 text-body-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-caption leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DemoNotice({ children = "Prototype HOMERA : ces données sont stockées dans ce navigateur, sans transmission à un serveur." }: { children?: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl border border-info/25 bg-info/[0.06] px-4 py-3 text-caption leading-relaxed text-muted">
      <span aria-hidden="true" className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-info" />
      <span>{children}</span>
    </p>
  );
}

export function FormField({
  label,
  name,
  children,
  hint,
  error,
  required = false,
}: {
  label: string;
  name: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-note font-semibold text-foreground">{label}{required && <span aria-hidden="true" className="ml-1 text-homera-terracotta">*</span>}</label>
      {children}
      {hint && <p id={`${name}-hint`} className="text-caption text-muted">{hint}</p>}
      {error && <p id={`${name}-error`} role="alert" className="text-caption font-medium text-error">{error}</p>}
      {describedBy && <span className="sr-only" id={`${name}-accessible-description`}>{describedBy}</span>}
    </div>
  );
}

export const INPUT_CLASS = "min-h-11 w-full rounded-input border border-border bg-background px-3.5 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-light focus:border-homera-terracotta focus:ring-2 focus:ring-homera-terracotta/20";
export const BUTTON_PRIMARY = "homera-press inline-flex min-h-11 items-center justify-center gap-2 rounded-btn homera-cta px-4 text-note font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
export const BUTTON_SECONDARY = "homera-press inline-flex min-h-11 items-center justify-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-semibold text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

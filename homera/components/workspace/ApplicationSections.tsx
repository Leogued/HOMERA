"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardList, FileText, Home, Loader2, MapPin, RefreshCw } from "lucide-react";
import { apiPost, messageOf } from "@/lib/api-client";
import { useServerResource } from "@/lib/use-server-resource";
import { formatFCFA } from "@/lib/format";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel, FormField, INPUT_CLASS, StatusBadge,
  WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";
import { formatDay, type ServerVisit } from "@/components/workspace/VisitsSections";

/* ==================================================================
   HOMERA — DEMANDES DE LOCATION (branchées sur le serveur)
   ------------------------------------------------------------------
   Une candidature n’existe qu’après une visite effectuée : c’est le
   serveur qui le vérifie, pas le formulaire. Le bien, le candidat et
   la date viennent de la visite enregistrée, jamais de l’URL — on ne
   peut donc pas déposer un dossier sur le bien d’un tiers en changeant
   un paramètre.

   Statuts : envoyée → en cours → acceptée | refusée | annulée
   ================================================================== */

export type ServerApplication = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  propertyCity: string;
  clientId: string;
  clientName: string;
  visitId: string | null;
  visitReference: string | null;
  visitDate: string | null;
  status: string;
  message: string;
  monthlyIncome: number;
  decisionNote: string;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canDecide: boolean;
  canWithdraw: boolean;
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  "envoyee": "Envoyée",
  "en-cours": "En cours d’étude",
  "acceptee": "Acceptée",
  "refusee": "Refusée",
  "annulee": "Annulée",
};

const APPLICATION_TONE: Record<string, string> = {
  "envoyee": "border-warning/30 bg-warning/[0.07] text-warning",
  "en-cours": "border-info/30 bg-info/[0.07] text-info",
  "acceptee": "border-success/30 bg-success/[0.06] text-success",
  "refusee": "border-error/30 bg-error/[0.06] text-error",
  "annulee": "border-border bg-background text-muted",
};

function ApplicationBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-caption font-semibold ${APPLICATION_TONE[status] ?? "border-border bg-background text-muted"}`}>
      {APPLICATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* ==================================================================
   DÉPÔT — CÔTÉ CANDIDAT
   ================================================================== */

export function RentalRequestForm({ initialVisitId = "" }: { initialVisitId?: string }) {
  const visits = useServerResource<{ visits: ServerVisit[] }>("/api/visits");
  const applications = useServerResource<{ applications: ServerApplication[] }>("/api/applications");
  const [visitId, setVisitId] = useState(initialVisitId);
  const [income, setIncome] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ServerApplication | null>(null);

  const used = useMemo(() => new Set((applications.data?.applications ?? []).map((entry) => entry.visitId)), [applications.data]);
  const eligible = useMemo(
    () => (visits.data?.visits ?? []).filter((visit) => visit.status === "effectuee" && !used.has(visit.id)),
    [visits.data, used],
  );
  const linked = (visits.data?.visits ?? []).find((entry) => entry.id === visitId) ?? null;
  const already = (applications.data?.applications ?? []).find((entry) => entry.visitId === visitId);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!visitId) {
      setError("Rattachez votre candidature à une visite effectuée.");
      return;
    }
    setBusy(true);
    const result = await apiPost<{ application: ServerApplication }>("/api/applications", {
      visitId,
      message,
      monthlyIncome: Number(income.replace(/\D/g, "")) || 0,
    });
    setBusy(false);
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setCreated(result.data.application);
  };

  if (created) {
    return (
      <div className="mx-auto max-w-3xl rounded-card border border-success/25 bg-card p-7 text-center shadow-[var(--shadow-card)] sm:p-10" role="status" aria-live="polite">
        <p className="text-caption font-semibold uppercase tracking-[0.16em] text-success">Dossier créé</p>
        <h1 className="mt-2 font-serif text-display-sm">Votre demande est enregistrée</h1>
        <p className="mx-auto mt-3 max-w-xl text-body-sm leading-relaxed text-muted">
          Référence <strong className="font-mono">{created.reference}</strong>. Le propriétaire ou l’agent mandaté en est notifié ; chaque changement de statut apparaîtra dans « Mes demandes ».
        </p>
        <Link href="/client/demandes" className={`${BUTTON_PRIMARY} mt-6`}>Suivre ma demande<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    );
  }

  if (already) {
    return (
      <div className="mx-auto max-w-4xl">
        <WorkspaceHeading eyebrow="Après la visite" title="Demande de location" description="Une candidature ne peut être déposée qu’une fois pour chaque visite terminée." actions={<Link href="/client/visites" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mes visites</Link>} />
        <EmptyPanel icon={ClipboardList} title="Une demande existe déjà pour cette visite" description={`Le dossier ${already.reference} est déjà enregistré pour ce bien. Retrouvez son statut dans votre espace demandes.`} action={<Link href="/client/demandes" className={BUTTON_PRIMARY}>Suivre ma demande<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <WorkspaceHeading eyebrow="Après la visite" title="Demande de location" description="Préparez votre candidature. Seules les visites marquées « effectuée » par le propriétaire ou l’agent peuvent ouvrir un dossier." actions={<Link href="/client/visites" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mes visites</Link>} />
      {visits.loading || applications.loading ? (
        <p className="flex items-center gap-2 text-note text-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Lecture de votre parcours…</p>
      ) : eligible.length === 0 && !linked ? (
        <EmptyPanel icon={ClipboardList} title="Aucune visite effectuée" description="Une demande de location devient possible après la visite du logement. Demandez une visite puis suivez son statut dans votre agenda." action={<Link href="/client/visites" className={BUTTON_PRIMARY}>Voir mes visites<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <WorkspacePanel title="Le logement visité" description="Le bien et la date viennent de la visite enregistrée : ils ne sont pas modifiables depuis cette page." icon={Home}>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Visite effectuée" name="application-visit" required>
                <select id="application-visit" value={visitId} onChange={(event) => { setVisitId(event.target.value); setError(""); }} className={INPUT_CLASS}>
                  <option value="">Choisir une visite</option>
                  {eligible.map((entry) => <option key={entry.id} value={entry.id}>{entry.propertyTitle} · {formatDay(entry.date)}</option>)}
                </select>
              </FormField>
              <FormField label="Référence du bien" name="application-property">
                <input id="application-property" value={linked?.propertyReference ?? "Sélectionnez une visite"} readOnly className={`${INPUT_CLASS} opacity-75`} />
              </FormField>
            </div>
            {visitId && !eligible.some((entry) => entry.id === visitId) && linked && (
              <p role="status" className="mt-4 rounded-xl border border-warning/25 bg-warning/[0.06] px-4 py-3 text-caption leading-relaxed text-muted">
                Cette visite ne peut plus ouvrir une candidature. Choisissez une visite effectuée dans la liste.
              </p>
            )}
          </WorkspacePanel>

          <WorkspacePanel title="Votre dossier" description="Ces éléments sont transmis au propriétaire ou à l’agent qui instruit la demande." icon={FileText}>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Revenu mensuel net (FCFA)" name="income" required>
                <input id="income" type="text" inputMode="numeric" value={income} onChange={(event) => setIncome(event.target.value.replace(/[^\d\s]/g, ""))} placeholder="Ex. 450 000" className={INPUT_CLASS} />
              </FormField>
              <FormField label="Pièces à préparer" name="application-documents" hint="Identité, justificatifs de revenus et références vous seront demandés pendant l’étude.">
                <input id="application-documents" value="À fournir après étude" readOnly className={`${INPUT_CLASS} opacity-75`} />
              </FormField>
            </div>
            <label htmlFor="application-message" className="mt-5 block text-note font-semibold">Un mot pour le propriétaire <span className="font-normal text-muted">(facultatif)</span></label>
            <textarea id="application-message" rows={4} maxLength={800} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Présentez brièvement votre projet et votre date d’entrée souhaitée…" className={`${INPUT_CLASS} mt-1 resize-y py-3`} />
          </WorkspacePanel>

          {error && <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.06] px-4 py-3 text-note text-error">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-caption leading-relaxed text-muted">Votre dossier est enregistré sur les serveurs HOMERA et notifié au propriétaire ou à l’agent mandaté du bien.</p>
            <button type="submit" disabled={!visitId || busy} className={`${BUTTON_PRIMARY} disabled:cursor-not-allowed disabled:opacity-45`}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Envoyer ma demande<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ==================================================================
   LISTE — CANDIDAT, PROPRIÉTAIRE, AGENT
   ================================================================== */

export function ApplicationsList({ viewpoint, title, description }: { viewpoint: "client" | "proprietaire" | "agent"; title: string; description: string }) {
  const applications = useServerResource<{ applications: ServerApplication[] }>("/api/applications");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  const list = applications.data?.applications ?? [];

  const act = async (application: ServerApplication, action: "accepter" | "refuser" | "etudier" | "annuler") => {
    setBusy(`${application.id}:${action}`);
    setError(null);
    setNotice(null);
    const result = await apiPost<{ application: ServerApplication }>(`/api/applications/${application.id}`, {
      action,
      reason: reason[application.id] ?? "",
    });
    setBusy("");
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setNotice(action === "accepter" ? "Candidature acceptée : le candidat est notifié." : "Décision enregistrée et notifiée au candidat.");
    setReason((current) => ({ ...current, [application.id]: "" }));
    await applications.reload();
  };

  if (applications.loading) {
    return <div className="flex items-center gap-3 py-16 text-note text-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Chargement des candidatures…</div>;
  }
  if (applications.error) {
    return <EmptyPanel icon={ClipboardList} title="Lecture impossible" description={applications.error} action={<button type="button" onClick={() => void applications.reload()} className={BUTTON_PRIMARY}><RefreshCw className="h-4 w-4" aria-hidden="true" />Réessayer</button>} />;
  }

  return (
    <>
      <WorkspaceHeading eyebrow="Location" title={title} description={description} />
      {notice && <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-caption font-semibold text-success">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.05] px-4 py-3 text-caption font-semibold text-error">{error}</p>}

      {list.length === 0 ? (
        <EmptyPanel
          icon={ClipboardList}
          title="Aucune candidature"
          description={viewpoint === "client" ? "Après une visite effectuée, vous pourrez déposer votre dossier depuis votre agenda." : "Les candidatures déposées après visite sur vos biens apparaîtront ici."}
          action={viewpoint === "client" ? <Link href="/client/visites" className={BUTTON_PRIMARY}>Voir mes visites<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link> : undefined}
        />
      ) : (
        <div className="space-y-4">
          {list.map((application) => (
            <WorkspacePanel key={application.id} title={viewpoint === "client" ? application.propertyTitle : application.clientName} description={`${application.reference} · ${viewpoint === "client" ? "" : `${application.propertyTitle} · `}${application.propertyCity}`} icon={FileText} action={<ApplicationBadge status={application.status} />}>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCell label="Bien" value={application.propertyTitle} />
                <InfoCell label="Référence bien" value={application.propertyReference} />
                <InfoCell label="Visite" value={application.visitDate ? `${formatDay(application.visitDate)}${application.visitReference ? ` · ${application.visitReference}` : ""}` : "—"} />
                <InfoCell label="Déposée le" value={formatDay(application.createdAt)} />
                {viewpoint !== "client" && <InfoCell label="Revenu mensuel déclaré" value={application.monthlyIncome > 0 ? formatFCFA(application.monthlyIncome) : "non renseigné"} />}
                {application.decidedAt && <InfoCell label="Décision" value={formatDay(application.decidedAt)} />}
              </dl>
              {application.message && <p className="mt-4 rounded-xl border border-border bg-background p-3 text-caption leading-relaxed text-muted">« {application.message} »</p>}
              {application.decisionNote && (
                <p className="mt-3 rounded-xl border border-border bg-background p-3 text-caption leading-relaxed text-muted">
                  <strong className="text-foreground">Motif :</strong> {application.decisionNote}
                </p>
              )}

              {(application.canDecide || application.canWithdraw) && (
                <div className="mt-4 rounded-xl border border-border bg-background p-4">
                  <p className="text-caption font-semibold">{application.canDecide ? "Instruire ce dossier" : "Retirer ma candidature"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {application.canDecide && (
                      <>
                        {application.status === "envoyee" && (
                          <button type="button" onClick={() => void act(application, "etudier")} disabled={busy.startsWith(application.id)} className={`${BUTTON_SECONDARY} disabled:opacity-60`}>Passer en étude</button>
                        )}
                        <button type="button" onClick={() => void act(application, "accepter")} disabled={busy.startsWith(application.id)} className={`${BUTTON_PRIMARY} disabled:opacity-60`}>
                          {busy === `${application.id}:accepter` && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}Accepter
                        </button>
                        <button type="button" onClick={() => void act(application, "refuser")} disabled={busy.startsWith(application.id)} className={`${BUTTON_SECONDARY} disabled:opacity-60`}>Refuser</button>
                      </>
                    )}
                    {application.canWithdraw && (
                      <button type="button" onClick={() => void act(application, "annuler")} disabled={busy.startsWith(application.id)} className={`${BUTTON_SECONDARY} disabled:opacity-60`}>Retirer ma demande</button>
                    )}
                  </div>
                  <label className="mt-3 block text-caption font-semibold" htmlFor={`app-reason-${application.id}`}>
                    {application.canDecide ? "Motif (obligatoire pour un refus, transmis au candidat)" : "Motif du retrait (facultatif)"}
                    <textarea id={`app-reason-${application.id}`} rows={2} value={reason[application.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [application.id]: event.target.value }))} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" placeholder="Une raison courte, conservée dans le dossier." />
                  </label>
                  <Link href={`/biens/${application.propertyId}`} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold text-homera-terracotta hover:underline">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />Fiche du bien
                  </Link>
                </div>
              )}
            </WorkspacePanel>
          ))}
        </div>
      )}
    </>
  );
}

/* ==================================================================
   UTILITAIRE
   ================================================================== */

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dt className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-caption font-medium">{value}</dd>
    </div>
  );
}

export { StatusBadge };

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Loader2, MapPin, RefreshCw, Users, XCircle } from "lucide-react";
import { apiPost, messageOf } from "@/lib/api-client";
import { useServerResource } from "@/lib/use-server-resource";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";

/* ==================================================================
   HOMERA — VISITES (branchées sur le serveur)
   ------------------------------------------------------------------
   Une visite est un objet serveur : demandée, confirmée, reprogrammée,
   effectuée, annulée ou marquée comme absence constatée. Chaque
   mouvement est horodaté, attribué à son auteur, consigné dans
   `visit_events` et notifié aux autres acteurs.

   Rien n’est décidé dans le navigateur : l’écran propose, le serveur
   dispose, et il peut refuser (créneau occupé, bien indisponible,
   mandat absent).
   ================================================================== */

export type ServerVisit = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  clientId: string;
  clientName: string;
  ownerId: string | null;
  ownerName: string | null;
  agentId: string | null;
  agentName: string | null;
  status: string;
  date: string;
  time: string;
  durationMin: number;
  message: string;
  decisionNote: string;
  createdAt: string;
  updatedAt: string;
};

export const VISIT_LABELS: Record<string, string> = {
  demandee: "Demandée",
  "en-attente": "En attente",
  confirmee: "Confirmée",
  reprogrammee: "Reprogrammée",
  effectuee: "Effectuée",
  annulee: "Annulée",
  refusee: "Refusée",
  absence: "Absence constatée",
};

const VISIT_TONE: Record<string, string> = {
  demandee: "border-warning/30 bg-warning/[0.07] text-warning",
  "en-attente": "border-warning/30 bg-warning/[0.07] text-warning",
  confirmee: "border-success/30 bg-success/[0.06] text-success",
  reprogrammee: "border-info/30 bg-info/[0.06] text-info",
  effectuee: "border-border bg-background text-muted",
  annulee: "border-border bg-background text-muted",
  refusee: "border-error/30 bg-error/[0.06] text-error",
  absence: "border-error/30 bg-error/[0.06] text-error",
};

/** Actions réellement offertes par le serveur selon le point de vue. */
const ACTIONS: Record<string, { action: string; label: string; needsReason?: boolean; needsSlot?: boolean }[]> = {
  client: [
    { action: "annuler", label: "Annuler ma demande", needsReason: true },
  ],
  proprietaire: [
    { action: "confirmer", label: "Confirmer le créneau" },
    { action: "reprogrammer", label: "Reprogrammer", needsSlot: true, needsReason: true },
    { action: "refuser", label: "Refuser", needsReason: true },
    { action: "effectuer", label: "Marquer effectuée" },
    { action: "absence", label: "Absence constatée", needsReason: true },
  ],
  agent: [
    { action: "confirmer", label: "Confirmer le créneau" },
    { action: "reprogrammer", label: "Reprogrammer", needsSlot: true, needsReason: true },
    { action: "refuser", label: "Refuser", needsReason: true },
    { action: "effectuer", label: "Marquer effectuée" },
    { action: "absence", label: "Absence constatée", needsReason: true },
  ],
};

function VisitBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-caption font-semibold ${VISIT_TONE[status] ?? "border-border bg-background text-muted"}`}>
      {VISIT_LABELS[status] ?? status}
    </span>
  );
}

/* ==================================================================
   LISTE PARTAGÉE
   ================================================================== */

export function VisitsList({ viewpoint, title, description }: { viewpoint: "client" | "proprietaire" | "agent"; title: string; description: string }) {
  const visits = useServerResource<{ visits: ServerVisit[] }>("/api/visits");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [slot, setSlot] = useState<Record<string, { date: string; time: string }>>({});

  const list = useMemo(
    () => [...(visits.data?.visits ?? [])].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [visits.data],
  );

  const act = async (visit: ServerVisit, action: string) => {
    setBusy(`${visit.id}:${action}`);
    setError(null);
    setNotice(null);
    const result = await apiPost<{ visit: ServerVisit }>(`/api/visits/${visit.id}`, {
      action,
      reason: reason[visit.id] ?? "",
      date: slot[visit.id]?.date,
      time: slot[visit.id]?.time,
    });
    setBusy("");
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setNotice("Visite mise à jour : le mouvement est consigné et les autres acteurs sont notifiés.");
    setReason((current) => ({ ...current, [visit.id]: "" }));
    await visits.reload();
  };

  if (visits.loading) return <div className="flex items-center gap-3 py-16 text-note text-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Chargement des visites…</div>;
  if (visits.error) {
    return (
      <EmptyPanel
        icon={CalendarDays}
        title="Lecture impossible"
        description={visits.error}
        action={<button type="button" onClick={() => void visits.reload()} className={BUTTON_PRIMARY}><RefreshCw className="h-4 w-4" aria-hidden="true" />Réessayer</button>}
      />
    );
  }

  return (
    <>
      <WorkspaceHeading eyebrow="Agenda" title={title} description={description} />
      {notice && <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-caption font-semibold text-success">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.05] px-4 py-3 text-caption font-semibold text-error">{error}</p>}

      {list.length === 0 ? (
        <EmptyPanel
          icon={CalendarDays}
          title="Aucune visite"
          description={viewpoint === "client" ? "Demandez une visite depuis la fiche d’un bien : elle apparaîtra ici avec son statut réel." : "Les demandes des clients apparaîtront ici dès qu’elles visent un bien qui vous est confié."}
          action={viewpoint === "client" ? <Link href="/explorer" className={BUTTON_PRIMARY}>Explorer les biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link> : undefined}
        />
      ) : (
        <div className="space-y-4">
          {list.map((visit) => (
            <WorkspacePanel key={visit.id} title={visit.propertyTitle} description={`${visit.reference} · ${visit.propertyReference}`} icon={CalendarDays} action={<VisitBadge status={visit.status} />}>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCell label="Date" value={`${formatDay(visit.date)} · ${visit.time}`} />
                <InfoCell label="Durée" value={`${visit.durationMin} min`} />
                <InfoCell label={viewpoint === "client" ? "Votre interlocuteur" : "Demandeur"} value={viewpoint === "client" ? (visit.agentName ?? visit.ownerName ?? "HOMERA") : visit.clientName} />
                <InfoCell label="Demandée le" value={formatDay(visit.createdAt)} />
              </dl>
              {visit.message && <p className="mt-4 rounded-xl border border-border bg-background p-3 text-caption leading-relaxed text-muted">« {visit.message} »</p>}
              {visit.decisionNote && (
                <p className="mt-3 rounded-xl border border-border bg-background p-3 text-caption leading-relaxed text-muted">
                  <strong className="text-foreground">Motif :</strong> {visit.decisionNote}
                </p>
              )}

              {(ACTIONS[viewpoint] ?? []).length > 0 && !["annulee", "refusee", "effectuee", "absence"].includes(visit.status) && (
                <div className="mt-4 rounded-xl border border-border bg-background p-4">
                  <p className="text-caption font-semibold">Répondre à cette demande</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(ACTIONS[viewpoint] ?? []).map((entry) => (
                      <button
                        key={entry.action}
                        type="button"
                        onClick={() => void act(visit, entry.action)}
                        disabled={busy.startsWith(visit.id)}
                        className={`${entry.action === "confirmer" || entry.action === "effectuer" ? BUTTON_PRIMARY : BUTTON_SECONDARY} disabled:opacity-60`}
                      >
                        {(busy === `${visit.id}:${entry.action}`) && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                        {entry.label}
                      </button>
                    ))}
                  </div>
                  {(ACTIONS[viewpoint] ?? []).some((entry) => entry.needsSlot) && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5 text-caption font-semibold" htmlFor={`date-${visit.id}`}>Nouvelle date
                        <input id={`date-${visit.id}`} type="date" value={slot[visit.id]?.date ?? ""} onChange={(event) => setSlot((current) => ({ ...current, [visit.id]: { ...(current[visit.id] ?? { time: visit.time }), date: event.target.value } }))} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" />
                      </label>
                      <label className="space-y-1.5 text-caption font-semibold" htmlFor={`time-${visit.id}`}>Nouvelle heure
                        <input id={`time-${visit.id}`} type="time" value={slot[visit.id]?.time ?? ""} onChange={(event) => setSlot((current) => ({ ...current, [visit.id]: { ...(current[visit.id] ?? { date: visit.date }), time: event.target.value } }))} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" />
                      </label>
                    </div>
                  )}
                  {(ACTIONS[viewpoint] ?? []).some((entry) => entry.needsReason) && (
                    <label className="mt-3 block text-caption font-semibold" htmlFor={`reason-${visit.id}`}>Motif (obligatoire pour refuser, annuler, reprogrammer ou constater une absence)
                      <textarea id={`reason-${visit.id}`} rows={2} value={reason[visit.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [visit.id]: event.target.value }))} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" placeholder="Une raison courte, conservée dans l’historique de la visite." />
                    </label>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link href={`/api/visits/${visit.id}`} className="text-caption font-semibold text-homera-terracotta hover:underline">Historique de la visite</Link>
                    <Link href={`/biens/${visit.propertyId}`} className="inline-flex items-center gap-1 text-caption font-semibold text-homera-terracotta hover:underline">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />Fiche du bien
                    </Link>
                  </div>
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
   CLIENTS DE L’AGENT
   ================================================================== */

export function AgentClients() {
  const visits = useServerResource<{ visits: ServerVisit[] }>("/api/visits");
  const list = useMemo(() => visits.data?.visits ?? [], [visits.data]);

  const byClient = useMemo(() => {
    const map = new Map<string, { name: string; visits: ServerVisit[] }>();
    for (const visit of list) {
      const entry = map.get(visit.clientId) ?? { name: visit.clientName, visits: [] };
      entry.visits.push(visit);
      map.set(visit.clientId, entry);
    }
    return [...map.entries()].map(([id, value]) => ({ id, ...value }));
  }, [list]);

  if (visits.loading) return <div className="flex items-center gap-3 py-16 text-note text-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Chargement des clients…</div>;
  if (visits.error) {
    return <EmptyPanel icon={Users} title="Lecture impossible" description={visits.error} action={<button type="button" onClick={() => void visits.reload()} className={BUTTON_PRIMARY}><RefreshCw className="h-4 w-4" aria-hidden="true" />Réessayer</button>} />;
  }

  return (
    <>
      <WorkspaceHeading eyebrow="Relation client" title="Clients & demandes" description="Les personnes qui ont demandé une visite sur un bien couvert par votre mandat, et rien d’autre." />
      {byClient.length === 0 ? (
        <EmptyPanel icon={Users} title="Aucun client rattaché" description="Les clients apparaîtront ici après une demande de visite sur un bien que votre mandat couvre." />
      ) : (
        <div className="space-y-4">
          {byClient.map((client) => (
            <WorkspacePanel key={client.id} title={client.name} description={`${client.visits.length} demande(s)`} icon={Users}>
              <ul className="space-y-2">
                {client.visits.map((visit) => (
                  <li key={visit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="min-w-0">
                      <span className="block truncate text-note font-semibold">{visit.propertyTitle}</span>
                      <span className="mt-0.5 block font-mono text-caption text-muted">{visit.propertyReference} · {formatDay(visit.date)} · {visit.time}</span>
                    </span>
                    <VisitBadge status={visit.status} />
                  </li>
                ))}
              </ul>
              <Link href="/messages" className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-caption font-semibold text-homera-terracotta hover:underline">
                Écrire au client<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </WorkspacePanel>
          ))}
        </div>
      )}
    </>
  );
}

/* ==================================================================
   DEMANDE DE VISITE (côté bien)
   ================================================================== */

export function VisitRequestForm({ propertyId, propertyTitle, slots }: { propertyId: string; propertyTitle: string; slots: { id: string; date: string; time: string }[] }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const send = async () => {
    setOutcome(null);
    if (!date) {
      setOutcome({ tone: "error", text: "Choisissez une date de visite." });
      return;
    }
    setBusy(true);
    const result = await apiPost<{ visit: ServerVisit }>("/api/visits", {
      propertyId,
      date,
      time,
      message,
      durationMin: 45,
    });
    setBusy(false);
    if (!result.ok) {
      setOutcome({ tone: "error", text: messageOf(result) });
      return;
    }
    setOutcome({
      tone: "ok",
      text: `Demande enregistrée (${result.data.visit.reference}). Le propriétaire ou l’agent mandaté doit confirmer le créneau : vous serez notifié de la réponse.`,
    });
    setMessage("");
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-note font-semibold">Demander une visite — {propertyTitle}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-caption font-semibold" htmlFor="visit-date">Date souhaitée
          <input id="visit-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" />
        </label>
        <label className="space-y-1.5 text-caption font-semibold" htmlFor="visit-time">Heure
          <input id="visit-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" />
        </label>
      </div>
      {slots.length > 0 && (
        <div className="mt-3">
          <p className="text-caption font-semibold">Créneaux proposés pour ce bien</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {slots.map((entry) => (
              <button key={entry.id} type="button" onClick={() => { setDate(entry.date); setTime(entry.time); }} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-caption font-semibold ${date === entry.date && time === entry.time ? "border-homera-terracotta text-homera-terracotta" : "border-border text-muted"}`}>
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />{formatDay(entry.date)} · {entry.time}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="mt-3 block text-caption font-semibold" htmlFor="visit-message">Message (facultatif)
        <textarea id="visit-message" rows={2} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" placeholder="Précisions utiles au rendez-vous." />
      </label>
      <button type="button" onClick={() => void send()} disabled={busy} className={`${BUTTON_PRIMARY} mt-4 disabled:opacity-60`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarDays className="h-4 w-4" aria-hidden="true" />}Envoyer la demande
      </button>
      {outcome && (
        <p role="status" className={`mt-3 rounded-xl border px-3 py-2 text-caption font-semibold ${outcome.tone === "ok" ? "border-success/20 bg-success/[0.05] text-success" : "border-error/25 bg-error/[0.05] text-error"}`}>
          {outcome.text}
        </p>
      )}
    </div>
  );
}

/* ==================================================================
   UTILITAIRES
   ================================================================== */

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dt className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-caption font-medium">{value}</dd>
    </div>
  );
}

export function formatDay(value: string): string {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export { XCircle };

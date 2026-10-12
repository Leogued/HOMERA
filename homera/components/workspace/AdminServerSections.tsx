"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowRight, BadgeCheck, Building2, CalendarDays, Check, ClipboardCheck,
  ClipboardList, FileText, Flag, House, Loader2, RefreshCw, Search, ShieldAlert,
  ShieldCheck, Undo2, UserRound, Users, XCircle,
} from "lucide-react";
import { apiPatch, apiPost, messageOf } from "@/lib/api-client";
import { useServerResource } from "@/lib/use-server-resource";
import { formatFCFA } from "@/lib/format";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel, INPUT_CLASS, MetricCard,
  WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";
import { AdminInfoCell } from "@/components/workspace/AdminCells";
import { formatDate } from "@/components/workspace/AdminCells";
import { reportReasonLabel } from "@/lib/reports";

/* ==================================================================
   HOMERA — ESPACE D’ADMINISTRATION (branché sur le serveur)
   ------------------------------------------------------------------
   Rien n’est inventé ici. Chaque chiffre vient de /api/admin/overview,
   chaque dossier de /api/admin/verifications, chaque compte de
   /api/admin/users. Là où le serveur ne sait pas encore répondre
   (statistiques financières), l’écran le dit au lieu de simuler.

   Deux niveaux de droits, tenus par le serveur :
   • admin — instruit les dossiers, suspend un compte client ;
   • superadmin — seul à pouvoir nommer ou destituer un administrateur.
   ================================================================== */

export type AdminOverview = {
  properties: { total: number; publie: number; brouillon: number; soumis: number; enVerification: number; suspendu: number; loue: number; vendu: number; archive: number; verifies: number };
  verification: { aExaminer: number; enCours: number; incomplets: number; refuses: number; enRetard: number; delaiMoyenJours: number; controlesSurPlace: number };
  accounts: { total: number; clients: number; proprietaires: number; agents: number; admins: number; nonVerifies: number };
  mandates: { enAttente: number; actifs: number; expires: number; revoques: number; contestes: number };
  visits: { demandees: number; confirmees: number; effectuees: number; annulees: number; absences: number; conflits: number };
  rentals: { demandes: number; acceptees: number; contratsSignes: number };
  signals: { ouverts: number; notificationsNonLues: number; erreursRecentes: number };
};

export type AdminUser = {
  id: string; prenom: string; nom: string; email: string; telephone: string;
  roles: string[]; emailVerified: boolean; status: string; createdAt: string;
  lastLoginAt: string | null; properties: number; mandates: number;
};

export type VerificationStep = { key: string; label: string; status: string; comment: string; internal: boolean; actor: string | null; updatedAt: string | null };
export type VerificationCase = {
  id: string; propertyId: string; propertyTitle: string; propertyReference: string;
  propertyType: string; city: string; district: string; publicationStatus: string;
  verificationStatus: string; status: string; assignedTo: string | null; assignedName: string | null;
  documentaryOnly: boolean; onsiteDone: boolean; decisionNote: string; decidedAt: string | null;
  createdAt: string; updatedAt: string; ageDays: number; steps: VerificationStep[];
};

export type AdminProperty = {
  id: string; reference: string; title: string; type: string; intent: string; city: string;
  district: string; price: number; publicationStatus: string; verificationStatus: string;
  availabilityStatus: string; ownerId: string | null; ownerName: string; ownerEmail: string;
  agentName: string | null; photos: number; documents: number; createdAt: string; updatedAt: string; ageDays: number;
};

export type AuditEntry = { id: string; actor_id: string | null; actor_label: string; action: string; entity_type: string; entity_id: string; detail: string; ip: string; created_at: string };

const VERIFICATION_LABELS: Record<string, string> = {
  "a-examiner": "À examiner",
  "en-cours": "En cours",
  incomplet: "Pièces manquantes",
  accepte: "Accepté",
  refuse: "Refusé",
  suspendu: "Suspendu",
  "a-reexaminer": "À réexaminer",
  "non-verifie": "Non vérifié",
  verifie: "Vérifié",
};

const VERIFICATION_TONE: Record<string, string> = {
  "a-examiner": "border-warning/30 bg-warning/[0.07] text-warning",
  "en-cours": "border-info/30 bg-info/[0.07] text-info",
  incomplet: "border-warning/30 bg-warning/[0.07] text-warning",
  accepte: "border-success/30 bg-success/[0.06] text-success",
  refuse: "border-error/30 bg-error/[0.06] text-error",
  suspendu: "border-error/30 bg-error/[0.06] text-error",
  "a-reexaminer": "border-warning/30 bg-warning/[0.07] text-warning",
  verifie: "border-success/30 bg-success/[0.06] text-success",
  "non-verifie": "border-border bg-background text-muted",
};

const PUBLICATION_LABELS: Record<string, string> = {
  brouillon: "Brouillon", soumis: "Soumis", "en-verification": "En vérification",
  publie: "Publié", suspendu: "Suspendu", loue: "Loué", vendu: "Vendu", archive: "Archivé",
};

const STEP_LABELS: Record<string, string> = {
  "a-faire": "À faire", "en-cours": "En cours", valide: "Validé", refuse: "Refusé", "non-applicable": "Non applicable",
};

const STEP_TONE: Record<string, string> = {
  "a-faire": "border-border bg-background text-muted",
  "en-cours": "border-info/30 bg-info/[0.07] text-info",
  valide: "border-success/30 bg-success/[0.06] text-success",
  refuse: "border-error/30 bg-error/[0.06] text-error",
  "non-applicable": "border-border bg-background text-muted",
};

function Pill({ label, tone }: { label: string; tone: string }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-caption font-semibold ${tone}`}>{label}</span>;
}

function Loading({ text }: { text: string }) {
  return <div className="flex items-center gap-3 py-16 text-note text-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{text}</div>;
}

function Failure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <EmptyPanel icon={ShieldAlert} title="Lecture impossible" description={message} action={<button type="button" onClick={onRetry} className={BUTTON_PRIMARY}><RefreshCw className="h-4 w-4" aria-hidden="true" />Réessayer</button>} />;
}

/* ==================================================================
   TABLEAU DE BORD — indicateurs réels
   ================================================================== */

export function AdminOverviewDashboard() {
  const overview = useServerResource<{ overview: AdminOverview; audit: AuditEntry[] }>("/api/admin/overview");
  if (overview.loading) return <Loading text="Lecture des indicateurs de la plateforme…" />;
  if (overview.error) return <Failure message={overview.error} onRetry={() => void overview.reload()} />;
  const d = overview.data?.overview;
  if (!d) return <EmptyPanel icon={Activity} title="Aucun indicateur" description="Le service d’administration n’a renvoyé aucune donnée." />;

  const audit = overview.data?.audit ?? [];

  return (
    <>
      <WorkspaceHeading
        eyebrow="HOMERA · supervision"
        title="Dashboard administratif"
        description="Vue de pilotage réelle : chaque chiffre est compté en base, aucun n’est une estimation."
        actions={<Link href="/admin/verifications" className={BUTTON_PRIMARY}><ClipboardCheck className="h-4 w-4" aria-hidden="true" />Traiter les vérifications</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardCheck} label="Dossiers à examiner" value={d.verification.aExaminer} detail={`${d.verification.enRetard} en retard · ${d.verification.delaiMoyenJours.toFixed(1)} j de délai moyen`} />
        <MetricCard icon={BadgeCheck} label="Biens vérifiés" value={d.properties.verifies} detail={`sur ${d.properties.total} biens déclarés`} />
        <MetricCard icon={House} label="Annonces publiées" value={d.properties.publie} detail={`${d.properties.brouillon} brouillon(s) · ${d.properties.suspendu} suspendu(s)`} />
        <MetricCard icon={Users} label="Comptes" value={d.accounts.total} detail={`${d.accounts.proprietaires} propriétaires · ${d.accounts.agents} agents · ${d.accounts.admins} admin`} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <WorkspacePanel title="File de vérification" description="État réel des contrôles, compté en base." icon={ClipboardCheck} action={<Link href="/admin/verifications" className="text-caption font-semibold text-homera-terracotta hover:underline">Ouvrir la file</Link>}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <AdminInfoCell label="À examiner" value={d.verification.aExaminer} />
            <AdminInfoCell label="En cours d’instruction" value={d.verification.enCours} />
            <AdminInfoCell label="Pièces manquantes" value={d.verification.incomplets} />
            <AdminInfoCell label="Refusés" value={d.verification.refuses} />
            <AdminInfoCell label="Contrôles sur place" value={d.verification.controlesSurPlace} />
            <AdminInfoCell label="Délai moyen (jours)" value={d.verification.delaiMoyenJours.toFixed(1)} />
          </dl>
        </WorkspacePanel>
        <WorkspacePanel title="Activité" description="Visites, locations et mandats, tels que la base les enregistre." icon={Activity}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <AdminInfoCell label="Visites demandées" value={d.visits.demandees} />
            <AdminInfoCell label="Visites effectuées" value={d.visits.effectuees} />
            <AdminInfoCell label="Annulées / absences" value={`${d.visits.annulees} / ${d.visits.absences}`} />
            <AdminInfoCell label="Conflits de créneaux détectés" value={d.visits.conflits} />
            <AdminInfoCell label="Candidatures de location" value={d.rentals.demandes} />
            <AdminInfoCell label="Contrats signés" value={d.rentals.contratsSignes} />
            <AdminInfoCell label="Mandats actifs" value={d.mandates.actifs} />
            <AdminInfoCell label="Mandats en attente" value={d.mandates.enAttente} />
          </dl>
        </WorkspacePanel>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickLink href="/admin/utilisateurs" icon={Users} title="Utilisateurs" detail={`${d.accounts.total} comptes · ${d.accounts.nonVerifies} e-mail(s) non vérifié(s)`} />
        <QuickLink href="/admin/biens" icon={Building2} title="Biens" detail={`${d.properties.total} biens · ${d.properties.archive} archivé(s)`} />
        <QuickLink href="/admin/visites" icon={CalendarDays} title="Visites" detail={`${d.visits.demandees + d.visits.confirmees} rendez-vous à suivre`} />
        <QuickLink href="/admin/signalements" icon={Flag} title="Signalements" detail={`${d.signals.ouverts} dossier(s) ouvert(s)`} />
      </div>

      <WorkspacePanel className="mt-6" title="Journal d’audit" description="Les dernières actions tracées, tous acteurs confondus." icon={FileText}>
        {audit.length === 0 ? <p className="text-caption text-muted">Aucune action tracée pour le moment.</p> : (
          <ul className="divide-y divide-border">
            {audit.slice(0, 12).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0"><span className="text-note font-semibold">{entry.action}</span><span className="ml-2 text-caption text-muted">{entry.entity_type} · {entry.entity_id}</span></span>
                <span className="text-caption text-muted">{entry.actor_label} · {formatDate(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </WorkspacePanel>
    </>
  );
}

function QuickLink({ href, icon: Icon, title, detail }: { href: string; icon: typeof Users; title: string; detail: string }) {
  return <Link href={href} className="flex items-start gap-3 rounded-card border border-border bg-card p-4 transition-colors hover:border-homera-terracotta/40"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-homera-terracotta" aria-hidden="true" /><span className="min-w-0"><span className="block text-note font-semibold">{title}</span><span className="mt-0.5 block text-caption text-muted">{detail}</span></span></Link>;
}

/* ==================================================================
   VÉRIFICATIONS — les 8 étapes, tenues par le serveur
   ================================================================== */

export function AdminVerificationQueue() {
  const cases = useServerResource<{ cases: VerificationCase[] }>("/api/admin/verifications");
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ouverts" | "clos">("ouverts");

  const list = useMemo(() => {
    const all = cases.data?.cases ?? [];
    const isOpen = (status: string) => ["a-examiner", "en-cours", "incomplet", "a-reexaminer"].includes(status);
    if (filter === "ouverts") return all.filter((entry) => isOpen(entry.status));
    if (filter === "clos") return all.filter((entry) => !isOpen(entry.status));
    return all;
  }, [cases.data, filter]);

  if (cases.loading) return <Loading text="Chargement de la file de vérification…" />;
  if (cases.error) return <Failure message={cases.error} onRetry={() => void cases.reload()} />;

  const total = cases.data?.cases ?? [];
  const openCount = total.filter((entry) => ["a-examiner", "en-cours", "incomplet", "a-reexaminer"].includes(entry.status)).length;

  return (
    <>
      <WorkspaceHeading
        eyebrow="Contrôle documentaire"
        title="Vérifications des biens"
        description="Un dossier avance étape par étape. Chaque étape cochée est horodatée, attribuée à son auteur et conservée ; le commentaire marqué « interne » n’est jamais montré au propriétaire."
        actions={<span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-warning/30 bg-warning/[0.07] px-3.5 text-caption font-semibold text-warning">{openCount} dossier(s) ouvert(s)</span>}
      />
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer la file de vérification">
        {(["ouverts", "clos", "all"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-9 rounded-full border px-3.5 text-caption font-semibold ${filter === value ? "border-homera-terracotta text-homera-terracotta" : "border-border text-muted"}`}>
            {value === "ouverts" ? "Ouverts" : value === "clos" ? "Clos" : `Tous (${total.length})`}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyPanel icon={ClipboardCheck} title="Aucun dossier dans cette vue" description="Les nouveaux dossiers apparaissent ici dès qu’un propriétaire soumet son bien." />
      ) : (
        <div className="space-y-5">
          {list.map((entry) => (
            <VerificationCaseCard key={entry.id} item={entry} expanded={open === entry.id} onToggle={() => setOpen((current) => (current === entry.id ? null : entry.id))} onDone={() => void cases.reload()} />
          ))}
        </div>
      )}
    </>
  );
}

function VerificationCaseCard({ item, expanded, onToggle, onDone }: { item: VerificationCase; expanded: boolean; onToggle: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [pieces, setPieces] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>, label: string) => {
    setBusy(label);
    setError(null);
    setNotice(null);
    const result = await apiPatch<{ verification: VerificationCase }>(`/api/admin/verifications/${item.propertyId}`, body);
    setBusy("");
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setNotice("Dossier mis à jour : le propriétaire est notifié et l’action est au journal.");
    setNote("");
    setPieces("");
    onDone();
  };

  const setStep = (stepKey: string, status: string) => void call({ stepKey, status, comment: note, internal: true }, `step:${stepKey}`);

  return (
    <WorkspacePanel
      title={item.propertyTitle}
      description={`${item.propertyReference} · ${item.district}, ${item.city} · soumis le ${formatDate(item.createdAt)} · ${item.ageDays} j`}
      icon={ShieldCheck}
      action={<Pill label={VERIFICATION_LABELS[item.status] ?? item.status} tone={VERIFICATION_TONE[item.status] ?? "border-border bg-background text-muted"} />}
    >
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminInfoCell label="Publication" value={PUBLICATION_LABELS[item.publicationStatus] ?? item.publicationStatus} />
        <AdminInfoCell label="Vérification" value={VERIFICATION_LABELS[item.verificationStatus] ?? item.verificationStatus} />
        <AdminInfoCell label="Contrôle sur place" value={item.onsiteDone ? "Réalisé" : item.documentaryOnly ? "Non requis" : "À planifier"} />
        <AdminInfoCell label="Instructeur" value={item.assignedName ?? "Non assigné"} />
      </dl>

      {item.decisionNote && (
        <p className="mt-4 rounded-xl border border-border bg-background p-3 text-caption leading-relaxed text-muted">
          <strong className="text-foreground">Motif :</strong> {item.decisionNote}
        </p>
      )}
      {item.decidedAt && <p className="mt-2 text-caption text-muted">Décision enregistrée le {formatDate(item.decidedAt)}.</p>}

      <button type="button" onClick={onToggle} aria-expanded={expanded} className="mt-4 inline-flex min-h-10 items-center gap-2 text-caption font-semibold text-homera-terracotta hover:underline">
        {expanded ? "Masquer les 8 étapes" : "Instruire les 8 étapes"}<ArrowRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-background p-4">
          {item.steps.map((step) => (
            <div key={step.key} className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-note font-semibold">{step.label}</p>
                {step.comment && <p className="mt-0.5 text-caption leading-relaxed text-muted">{step.comment}</p>}
                {step.updatedAt && <p className="mt-0.5 text-micro text-muted">Par {step.actor ?? "système"} · {formatDate(step.updatedAt)}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill label={STEP_LABELS[step.status] ?? step.status} tone={STEP_TONE[step.status] ?? "border-border bg-background text-muted"} />
                {step.key !== "decision" && (
                  <>
                    <button type="button" disabled={busy.startsWith("step")} onClick={() => setStep(step.key, "valide")} className="min-h-8 rounded-full border border-border px-2.5 text-micro font-semibold hover:border-success/50 hover:text-success disabled:opacity-50">Valider</button>
                    <button type="button" disabled={busy.startsWith("step")} onClick={() => setStep(step.key, "refuse")} className="min-h-8 rounded-full border border-border px-2.5 text-micro font-semibold hover:border-error/50 hover:text-error disabled:opacity-50">Refuser</button>
                    <button type="button" disabled={busy.startsWith("step")} onClick={() => setStep(step.key, "non-applicable")} className="min-h-8 rounded-full border border-border px-2.5 text-micro font-semibold text-muted hover:text-foreground disabled:opacity-50">N/A</button>
                  </>
                )}
              </div>
            </div>
          ))}

          <label className="block text-caption font-semibold" htmlFor={`note-${item.id}`}>Commentaire interne (jamais transmis au propriétaire)
            <textarea id={`note-${item.id}`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" placeholder="Observations, contrôles effectués, points à revoir." />
          </label>
          <label className="block text-caption font-semibold" htmlFor={`pieces-${item.id}`}>Pièces complémentaires à demander
            <textarea id={`pieces-${item.id}`} rows={2} value={pieces} onChange={(event) => setPieces(event.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" placeholder="Ex. : une copie lisible de l’attestation de détention." />
          </label>
          <button type="button" onClick={() => void call({ action: "pieces", message: pieces }, "pieces")} disabled={!pieces.trim() || Boolean(busy)} className={`${BUTTON_SECONDARY} disabled:opacity-50`}>
            {busy === "pieces" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Demander les pièces
          </button>
        </div>
      )}

      {notice && <p role="status" className="mt-3 rounded-xl border border-success/20 bg-success/[0.05] px-3 py-2 text-caption font-semibold text-success">{notice}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl border border-error/25 bg-error/[0.05] px-3 py-2 text-caption font-semibold text-error">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <button type="button" onClick={() => void call({ decision: "accepte", note }, "accepte")} disabled={Boolean(busy)} className={`${BUTTON_PRIMARY} disabled:opacity-50`}>
          {busy === "accepte" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}<Check className="h-4 w-4" aria-hidden="true" />Accepter et publier
        </button>
        <button type="button" onClick={() => void call({ decision: "incomplet", note, documentRequest: pieces }, "incomplet")} disabled={Boolean(busy)} className={`${BUTTON_SECONDARY} disabled:opacity-50`}>Pièces manquantes</button>
        <button type="button" onClick={() => void call({ decision: "en-cours", note }, "en-cours")} disabled={Boolean(busy)} className={`${BUTTON_SECONDARY} disabled:opacity-50`}>Passer en cours</button>
        <button type="button" onClick={() => void call({ decision: "refuse", note }, "refuse")} disabled={Boolean(busy)} className={`${BUTTON_SECONDARY} hover:border-error/50 hover:text-error disabled:opacity-50`}><XCircle className="h-4 w-4" aria-hidden="true" />Refuser</button>
        <button type="button" onClick={() => void call({ decision: "suspendu", note }, "suspendu")} disabled={Boolean(busy)} className={`${BUTTON_SECONDARY} hover:border-error/50 hover:text-error disabled:opacity-50`}>Suspendre</button>
        <Link href={`/admin/biens?q=${encodeURIComponent(item.propertyReference)}`} className={BUTTON_SECONDARY}>Dossier complet</Link>
      </div>
      <p className="mt-3 text-caption text-muted">Un refus ou une suspension sans motif est refusé par le serveur : le motif est notifié au propriétaire et conservé au journal.</p>
    </WorkspacePanel>
  );
}

/* ==================================================================
   UTILISATEURS — comptes, rôles, statuts
   ================================================================== */

export function AdminUsersTable({ role }: { role?: "proprietaire" | "agent" }) {
  const users = useServerResource<{ users: AdminUser[] }>("/api/admin/users");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  const list = useMemo(() => {
    const all = users.data?.users ?? [];
    const scoped = role ? all.filter((entry) => entry.roles.includes(role)) : all;
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter((entry) => `${entry.prenom} ${entry.nom} ${entry.email}`.toLowerCase().includes(q));
  }, [users.data, query, role]);

  const act = async (user: AdminUser, body: Record<string, unknown>) => {
    setBusy(user.id);
    setError(null);
    const result = await apiPatch<{ ok: boolean }>(`/api/admin/users/${user.id}`, { ...body, reason: reason[user.id] ?? "" });
    setBusy("");
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setReason((current) => ({ ...current, [user.id]: "" }));
    await users.reload();
  };

  const title = role === "agent" ? "Agents" : role === "proprietaire" ? "Propriétaires" : "Utilisateurs";

  if (users.loading) return <Loading text="Chargement des comptes…" />;
  if (users.error) return <Failure message={users.error} onRetry={() => void users.reload()} />;

  return (
    <>
      <WorkspaceHeading
        eyebrow="Comptes & accès"
        title={title}
        description={role === "agent" ? "Un agent n’a jamais d’accès général : ses droits s’ouvrent bien par bien, par mandat actif." : "Rôles, statuts et activité réels. La nomination d’un administrateur est réservée au super-administrateur."}
      />
      <SearchField value={query} onChange={setQuery} label={`Rechercher parmi les ${title.toLowerCase()}`} />
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.05] px-4 py-3 text-caption font-semibold text-error">{error}</p>}
      {list.length === 0 ? (
        <EmptyPanel icon={Users} title="Aucun compte" description="Aucun compte ne correspond à ce filtre." />
      ) : (
        <div className="space-y-4">
          {list.map((user) => (
            <WorkspacePanel key={user.id} title={`${user.prenom} ${user.nom}`} description={`${user.email} · ${user.telephone}`} icon={role === "agent" ? ShieldCheck : UserRound}
              action={<Pill label={user.status === "suspendu" ? "Suspendu" : "Actif"} tone={user.status === "suspendu" ? "border-error/30 bg-error/[0.06] text-error" : "border-success/30 bg-success/[0.06] text-success"} />}>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <AdminInfoCell label="Rôles" value={user.roles.join(", ")} />
                <AdminInfoCell label="E-mail vérifié" value={user.emailVerified ? "Oui" : "Non"} />
                <AdminInfoCell label="Biens" value={user.properties} />
                <AdminInfoCell label="Mandats" value={user.mandates} />
                <AdminInfoCell label="Inscrit le" value={formatDate(user.createdAt)} />
                <AdminInfoCell label="Dernière connexion" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "jamais"} />
              </dl>
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <label className="block text-caption font-semibold" htmlFor={`reason-${user.id}`}>Motif (obligatoire pour suspendre)
                  <textarea id={`reason-${user.id}`} rows={2} value={reason[user.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [user.id]: event.target.value }))} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" placeholder="Raison de la mesure, conservée au journal et notifiée." />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.status === "suspendu" ? (
                    <button type="button" onClick={() => void act(user, { status: "actif" })} disabled={busy === user.id} className={`${BUTTON_PRIMARY} disabled:opacity-50`}><Undo2 className="h-4 w-4" aria-hidden="true" />Réactiver le compte</button>
                  ) : (
                    <button type="button" onClick={() => void act(user, { status: "suspendu" })} disabled={busy === user.id} className={`${BUTTON_SECONDARY} hover:border-error/50 hover:text-error disabled:opacity-50`}>Suspendre le compte</button>
                  )}
                  {busy === user.id && <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden="true" />}
                </div>
              </div>
            </WorkspacePanel>
          ))}
        </div>
      )}
    </>
  );
}

/* ==================================================================
   BIENS — état de publication, tenu par le serveur
   ================================================================== */

export function AdminPropertiesTable() {
  const properties = useServerResource<{ properties: AdminProperty[] }>("/api/admin/properties");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  const list = useMemo(() => {
    const all = properties.data?.properties ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((entry) => {
      if (status && entry.publicationStatus !== status) return false;
      if (!q) return true;
      return `${entry.title} ${entry.reference} ${entry.city} ${entry.district} ${entry.ownerName}`.toLowerCase().includes(q);
    });
  }, [properties.data, query, status]);

  const act = async (property: AdminProperty, next: "publie" | "suspendu" | "archive" | "soumis") => {
    setBusy(property.id);
    setError(null);
    const result = await apiPatch<{ property: AdminProperty }>("/api/admin/properties", {
      propertyId: property.id,
      status: next,
      reason: reason[property.id] ?? "",
    });
    setBusy("");
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setReason((current) => ({ ...current, [property.id]: "" }));
    await properties.reload();
  };

  if (properties.loading) return <Loading text="Chargement du catalogue…" />;
  if (properties.error) return <Failure message={properties.error} onRetry={() => void properties.reload()} />;

  return (
    <>
      <WorkspaceHeading eyebrow="Catalogue administratif" title="Biens" description="Tous les biens déclarés, quel que soit leur statut. Une suspension ou une archive doit être motivée : le serveur refuse sinon." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchField value={query} onChange={setQuery} label="Rechercher un bien, une référence, un propriétaire" />
        <label className="block text-caption font-semibold" htmlFor="admin-publication">Statut
          <select id="admin-publication" value={status} onChange={(event) => setStatus(event.target.value)} className={`${INPUT_CLASS} mt-1 min-w-44`}>
            <option value="">Tous</option>
            {Object.entries(PUBLICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.05] px-4 py-3 text-caption font-semibold text-error">{error}</p>}
      {list.length === 0 ? (
        <EmptyPanel icon={Building2} title="Aucun bien" description="Aucun bien ne correspond à ce filtre." />
      ) : (
        <div className="space-y-4">
          {list.map((property) => (
            <WorkspacePanel key={property.id} title={property.title} description={`${property.reference} · ${property.district}, ${property.city}`} icon={House}
              action={<Pill label={PUBLICATION_LABELS[property.publicationStatus] ?? property.publicationStatus} tone={property.publicationStatus === "publie" ? "border-success/30 bg-success/[0.06] text-success" : property.publicationStatus === "suspendu" ? "border-error/30 bg-error/[0.06] text-error" : "border-border bg-background text-muted"} />}>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <AdminInfoCell label="Propriétaire" value={property.ownerName || "—"} />
                <AdminInfoCell label="Contact" value={property.ownerEmail || "—"} />
                <AdminInfoCell label="Agent mandaté" value={property.agentName ?? "Aucun"} />
                <AdminInfoCell label="Prix" value={formatFCFA(property.price)} />
                <AdminInfoCell label="Vérification" value={VERIFICATION_LABELS[property.verificationStatus] ?? property.verificationStatus} />
                <AdminInfoCell label="Disponibilité" value={property.availabilityStatus} />
                <AdminInfoCell label="Photos / pièces" value={`${property.photos} / ${property.documents}`} />
                <AdminInfoCell label="Dernière activité" value={formatDate(property.updatedAt)} />
              </dl>
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <label className="block text-caption font-semibold" htmlFor={`prop-reason-${property.id}`}>Motif (obligatoire pour suspendre ou archiver)
                  <textarea id={`prop-reason-${property.id}`} rows={2} value={reason[property.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [property.id]: event.target.value }))} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note" placeholder="Motif notifié au propriétaire et conservé au journal." />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {property.publicationStatus !== "publie" && <button type="button" onClick={() => void act(property, "publie")} disabled={busy === property.id} className={`${BUTTON_PRIMARY} disabled:opacity-50`}>Remettre en ligne</button>}
                  {property.publicationStatus !== "suspendu" && <button type="button" onClick={() => void act(property, "suspendu")} disabled={busy === property.id} className={`${BUTTON_SECONDARY} hover:border-error/50 hover:text-error disabled:opacity-50`}>Suspendre</button>}
                  {property.publicationStatus !== "soumis" && <button type="button" onClick={() => void act(property, "soumis")} disabled={busy === property.id} className={`${BUTTON_SECONDARY} disabled:opacity-50`}>Renvoyer en instruction</button>}
                  {property.publicationStatus !== "archive" && <button type="button" onClick={() => void act(property, "archive")} disabled={busy === property.id} className={`${BUTTON_SECONDARY} disabled:opacity-50`}>Archiver</button>}
                  {busy === property.id && <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden="true" />}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/biens/${property.id}`} className="text-caption font-semibold text-homera-terracotta hover:underline">Voir la fiche publique</Link>
                {property.publicationStatus === "soumis" && <Link href={`/admin/verifications?bien=${property.id}`} className="text-caption font-semibold text-homera-terracotta hover:underline">Instruire la vérification</Link>}
              </div>
            </WorkspacePanel>
          ))}
        </div>
      )}
    </>
  );
}

/* ==================================================================
   VISITES & SIGNALEMENTS (vus de l’administration)
   ================================================================== */

export function AdminVisitsTable() {
  const visits = useServerResource<{ visits: { id: string; reference: string; propertyTitle: string; propertyReference: string; clientName: string; ownerName: string | null; agentName: string | null; status: string; date: string; time: string; createdAt: string }[] }>("/api/admin/visits");
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const all = visits.data?.visits ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((entry) => `${entry.reference} ${entry.propertyTitle} ${entry.clientName} ${entry.ownerName ?? ""}`.toLowerCase().includes(q));
  }, [visits.data, query]);

  if (visits.loading) return <Loading text="Chargement des visites…" />;
  if (visits.error) return <Failure message={visits.error} onRetry={() => void visits.reload()} />;

  return (
    <>
      <WorkspaceHeading eyebrow="Supervision" title="Visites" description="Toutes les visites de la plateforme, avec leur statut réel et les acteurs concernés." />
      <SearchField value={query} onChange={setQuery} label="Rechercher une visite, un bien, un client" />
      {list.length === 0 ? <EmptyPanel icon={CalendarDays} title="Aucune visite" description="Les demandes de visite apparaîtront ici." /> : (
        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-left text-caption">
            <caption className="sr-only">Visites de la plateforme</caption>
            <thead className="bg-background text-micro uppercase tracking-[0.12em] text-muted"><tr><th scope="col" className="px-4 py-3">Référence</th><th scope="col" className="px-4 py-3">Bien</th><th scope="col" className="px-4 py-3">Client</th><th scope="col" className="px-4 py-3">Interlocuteur</th><th scope="col" className="px-4 py-3">Date</th><th scope="col" className="px-4 py-3">Statut</th></tr></thead>
            <tbody className="divide-y divide-border">
              {list.map((visit) => (
                <tr key={visit.id}>
                  <td className="px-4 py-3 font-mono">{visit.reference}</td>
                  <td className="px-4 py-3">{visit.propertyTitle}<span className="mt-0.5 block font-mono text-micro text-muted">{visit.propertyReference}</span></td>
                  <td className="px-4 py-3">{visit.clientName}</td>
                  <td className="px-4 py-3">{visit.agentName ?? visit.ownerName ?? "—"}</td>
                  <td className="px-4 py-3">{formatDate(visit.date)} · {visit.time}</td>
                  <td className="px-4 py-3"><Pill label={visit.status} tone="border-border bg-background text-muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function AdminReportsTable() {
  const reports = useServerResource<{ reports: { id: string; property_id: string; reporter_id: string | null; reason: string; detail: string; status: string; created_at: string }[] }>("/api/admin/reports");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, status: string) => {
    setBusy(id);
    setError(null);
    const result = await apiPost<{ id: string }>(`/api/admin/reports/${id}`, { status });
    setBusy("");
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    await reports.reload();
  };

  if (reports.loading) return <Loading text="Chargement des signalements…" />;
  if (reports.error) return <Failure message={reports.error} onRetry={() => void reports.reload()} />;
  const list = reports.data?.reports ?? [];

  return (
    <>
      <WorkspaceHeading eyebrow="Modération" title="Signalements" description="Annonces signalées par la communauté. Chaque signalement est traité, jamais ignoré silencieusement." />
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.05] px-4 py-3 text-caption font-semibold text-error">{error}</p>}
      {list.length === 0 ? <EmptyPanel icon={Flag} title="Aucun signalement" description="Aucune annonce n’a été signalée." /> : (
        <div className="space-y-4">
          {list.map((report) => (
            <WorkspacePanel key={report.id} title={reportReasonLabel(report.reason)} description={`Bien ${report.property_id} · signalé le ${formatDate(report.created_at)}`} icon={Flag}
              action={<Pill label={report.status} tone={report.status === "clos" ? "border-success/30 bg-success/[0.06] text-success" : report.status === "rejete" ? "border-border bg-background text-muted" : "border-warning/30 bg-warning/[0.07] text-warning"} />}>
              <p className="text-caption leading-relaxed text-muted">{report.detail || "Aucun détail fourni."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void act(report.id, "en-cours")} disabled={Boolean(busy)} className={`${BUTTON_SECONDARY} disabled:opacity-50`}>Prendre en charge</button>
                <button type="button" onClick={() => void act(report.id, "clos")} disabled={Boolean(busy)} className={`${BUTTON_PRIMARY} disabled:opacity-50`}><Check className="h-4 w-4" aria-hidden="true" />Clore</button>
                <button type="button" onClick={() => void act(report.id, "rejete")} disabled={Boolean(busy)} className={`${BUTTON_SECONDARY} disabled:opacity-50`}>Rejeter</button>
                <Link href={`/biens/${report.property_id}`} className={BUTTON_SECONDARY}>Voir l’annonce</Link>
              </div>
            </WorkspacePanel>
          ))}
        </div>
      )}
    </>
  );
}

/* ==================================================================
   STATISTIQUES — ce que la base sait réellement mesurer
   ================================================================== */

export function AdminStatistics() {
  const overview = useServerResource<{ overview: AdminOverview }>("/api/admin/overview");
  if (overview.loading) return <Loading text="Calcul des indicateurs…" />;
  if (overview.error) return <Failure message={overview.error} onRetry={() => void overview.reload()} />;
  const d = overview.data?.overview;
  if (!d) return <EmptyPanel icon={Activity} title="Aucun indicateur" description="Le service n’a renvoyé aucune donnée." />;

  const rows = [
    { label: "Visites demandées", value: d.visits.demandees },
    { label: "Visites confirmées", value: d.visits.confirmees },
    { label: "Visites effectuées", value: d.visits.effectuees },
    { label: "Annulations", value: d.visits.annulees },
    { label: "Absences constatées", value: d.visits.absences },
    { label: "Candidatures de location", value: d.rentals.demandes },
    { label: "Candidatures acceptées", value: d.rentals.acceptees },
    { label: "Contrats signés", value: d.rentals.contratsSignes },
    { label: "Mandats actifs", value: d.mandates.actifs },
    { label: "Mandats expirés", value: d.mandates.expires },
  ];
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <>
      <WorkspaceHeading eyebrow="Pilotage de l’activité" title="Statistiques" description="Volumes réels, comptés en base. HOMERA ne dispose pas encore d’un module de facturation : aucun revenu, commission ou retrait n’est affiché plutôt que d’être simulé." />
      <WorkspacePanel title="Activité réelle" description="Chaque barre est proportionnelle au volume le plus élevé." icon={Activity}>
        <div className="space-y-5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3"><p className="text-note font-semibold">{row.label}</p><p className="homera-num font-serif text-display-xs">{row.value}</p></div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-hover"><div className="h-full rounded-full bg-homera-terracotta" style={{ width: `${Math.round((row.value / max) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </WorkspacePanel>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={House} label="Biens" value={d.properties.total} detail={`${d.properties.publie} publiés · ${d.properties.loue} loués · ${d.properties.vendu} vendus`} />
        <MetricCard icon={BadgeCheck} label="Vérifications" value={d.properties.verifies} detail={`${d.verification.refuses} refusées · ${d.verification.controlesSurPlace} sur place`} />
        <MetricCard icon={Users} label="Comptes" value={d.accounts.total} detail={`${d.accounts.nonVerifies} e-mail(s) non vérifié(s)`} />
        <MetricCard icon={Flag} label="Signalements ouverts" value={d.signals.ouverts} detail={`${d.signals.notificationsNonLues} notification(s) non lue(s)`} />
      </div>
    </>
  );
}

/* ==================================================================
   DOCUMENTS — les pièces, dossier par dossier
   ================================================================== */

export function AdminDocuments() {
  const properties = useServerResource<{ properties: AdminProperty[] }>("/api/admin/properties");
  const list = useMemo(() => (properties.data?.properties ?? []).filter((entry) => entry.documents > 0), [properties.data]);
  if (properties.loading) return <Loading text="Chargement des pièces déclarées…" />;
  if (properties.error) return <Failure message={properties.error} onRetry={() => void properties.reload()} />;
  return (
    <>
      <WorkspaceHeading eyebrow="Pièces justificatives" title="Documents" description="Les pièces déclarées par bien. Leur contenu ne s’ouvre que dossier par dossier, jamais en liste." />
      {list.length === 0 ? <EmptyPanel icon={FileText} title="Aucune pièce déclarée" description="Les pièces apparaîtront ici au fur et à mesure des dépôts." /> : (
        <div className="space-y-4">
          {list.map((property) => (
            <WorkspacePanel key={property.id} title={property.title} description={`${property.reference} · ${property.documents} pièce(s) · ${property.ownerName}`} icon={FileText}>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/biens?q=${encodeURIComponent(property.reference)}`} className={BUTTON_SECONDARY}>Ouvrir le dossier</Link>
                <Link href={`/biens/${property.id}`} className={BUTTON_SECONDARY}>Voir l’annonce</Link>
              </div>
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

function SearchField({ value, onChange, label }: { value: string; onChange: (next: string) => void; label: string }) {
  return (
    <div className="mb-4 max-w-md">
      <label className="block text-caption font-semibold" htmlFor="admin-search">{label}
        <span className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <input id="admin-search" type="search" value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full bg-transparent text-note outline-none" />
        </span>
      </label>
    </div>
  );
}

export { ClipboardList };

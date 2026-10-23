"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, FileBadge, FileCheck2,
  FileText, House, Loader2, QrCode as QrCodeIcon, RefreshCw, ShieldCheck, UserRound, XCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiPost, messageOf } from "@/lib/api-client";
import { useServerResource } from "@/lib/use-server-resource";
import { QrCode } from "@/components/ui/QrCode";
import { Visual } from "@/components/ui/Visual";
import { describeProfile } from "@/lib/auth";
import { formatPropertyPrice } from "@/lib/format";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel, MetricCard, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";
import type { OwnerProperty } from "@/components/workspace/OwnerServerSections";
import { AgentClients, VisitsList } from "@/components/workspace/VisitsSections";
import { ApplicationsList } from "@/components/workspace/ApplicationSections";
import { PaymentMethodsWorkspace } from "@/components/workspace/PaymentMethodsPanel";

/* ==================================================================
   HOMERA — ESPACE AGENT, ALIMENTÉ PAR LE SERVEUR
   ------------------------------------------------------------------
   Un agent ne voit que les biens couverts par un mandat **actif et non
   expiré**. Cette règle n’est pas appliquée par l’écran : elle est
   appliquée par la base (`authorizations`), et l’écran affiche le
   résultat. Une demande de mandat n’ouvre aucun accès avant d’avoir
   été acceptée par l’agent lui-même.
   ================================================================== */

type AgentProperty = OwnerProperty & {
  mandate?: { reference: string; status: string; scope: string[]; expiresAt: string } | null;
};

type AuthorizationView = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  ownerId: string;
  ownerName: string;
  agentId: string | null;
  agentName: string | null;
  agentEmail: string | null;
  agentMatricule: string | null;
  scope: string[];
  mandateType: string;
  status: string;
  proofLabel: string;
  startsAt: string;
  expiresAt: string;
  note: string;
  decisionNote: string;
  createdAt: string;
  expired: boolean;
};

const MANDATE_LABELS: Record<string, string> = {
  "en-attente": "En attente de votre acceptation",
  invite: "Invitation à créer un compte",
  active: "Active",
  refusee: "Refusée",
  expiree: "Expirée",
  revoquee: "Révoquée par le propriétaire",
  contestee: "Contestée",
};

const MANDATE_TONE: Record<string, string> = {
  active: "border-success/30 bg-success/[0.06] text-success",
  "en-attente": "border-warning/30 bg-warning/[0.07] text-warning",
  invite: "border-info/30 bg-info/[0.06] text-info",
  refusee: "border-error/30 bg-error/[0.06] text-error",
  revoquee: "border-error/30 bg-error/[0.06] text-error",
  contestee: "border-error/30 bg-error/[0.06] text-error",
  expiree: "border-border bg-background text-muted",
};

const SCOPE_LABELS: Record<string, string> = {
  visite: "Faire visiter",
  annonce: "Gérer l’annonce",
  location: "Conclure la location",
  gestion: "Gérer le bien",
  encaissement: "Encaisser",
};

export function AgentWorkspace({ section }: { section: string }) {
  switch (section) {
    case "biens": return <AgentProperties />;
    case "visites":
      return <VisitsList viewpoint="agent" title="Visites de vos mandats" description="Seules les visites des biens couverts par un mandat actif sont présentées. Confirmez, reprogrammez ou signalez une absence." />;
    case "clients": return <AgentClients />;
    case "demandes":
      return <ApplicationsList viewpoint="agent" title="Candidatures sur vos mandats" description="Candidatures après visite et réservations directes sur les biens que votre mandat couvre. Vous ne voyez que celles-ci." />;
    case "autorisations": return <AgentAuthorizations />;
    case "documents": return <AgentDocuments />;
    case "profil": return <AgentProfile />;
    default: return <AgentDashboard />;
  }
}

function useAgentData() {
  const properties = useServerResource<{ properties: AgentProperty[]; matricule: string | null }>("/api/agent/properties");
  const authorizations = useServerResource<{ authorizations: AuthorizationView[]; pending: number }>("/api/authorizations");
  return { properties, authorizations };
}

/* ==================================================================
   TABLEAU DE BORD
   ================================================================== */

function AgentDashboard() {
  const { properties, authorizations } = useAgentData();
  const list = useMemo(() => properties.data?.properties ?? [], [properties.data]);
  const pending = useMemo(
    () => (authorizations.data?.authorizations ?? []).filter((entry) => entry.status === "en-attente"),
    [authorizations.data],
  );

  if (properties.loading) return <Loading label="Chargement de vos mandats…" />;
  if (properties.error) return <LoadError message={properties.error} onRetry={() => void properties.reload()} />;

  const active = list.length;

  return (
    <>
      <WorkspaceHeading
        eyebrow="Espace agent · mandat contrôlé"
        title="Vos mandats"
        description="Votre activité est limitée aux biens couverts par une autorisation active : la liste vient du serveur, jamais d’une déclaration."
        actions={
          <>
            <Link href="/agent/visites" className={BUTTON_SECONDARY}><CalendarDays className="h-4 w-4" aria-hidden="true" />Mon agenda</Link>
            <Link href="/agent/autorisations" className={BUTTON_SECONDARY}><FileBadge className="h-4 w-4" aria-hidden="true" />Mes autorisations</Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={House} label="Biens autorisés" value={active} detail="Mandats actifs et non expirés" />
        <MetricCard icon={FileBadge} label="Matricule" value={properties.data?.matricule ?? "—"} detail="Attribué par HOMERA" />
        <MetricCard icon={CalendarDays} label="Demandes à répondre" value={pending.length} detail="Mandats en attente de votre accord" />
        <MetricCard icon={ShieldCheck} label="Statut" value={active ? "Actif" : "Sans mandat"} detail={active ? "Accès ouvert aux biens mandatés" : "Aucun bien accessible"} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <WorkspacePanel title="Mandats en cours" description="Seuls les mandats actifs déterminent les biens accessibles." icon={ShieldCheck} action={<Link href="/agent/biens" className="text-caption font-semibold text-homera-terracotta hover:underline">Voir les biens</Link>}>
          {list.length === 0 ? (
            <p className="text-note leading-relaxed text-muted">Aucun mandat actif n’est rattaché à votre compte. Les biens d’un autre agent ne sont pas accessibles, et le serveur le refuse.</p>
          ) : (
            <ul className="space-y-3">
              {list.map((property) => (
                <li key={property.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl">
                    {property.media && <Visual mediaKey={property.media} alt={property.alt} sizes="70px" veil="none" quality={62} className="absolute inset-0 h-full w-full" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-note font-semibold">{property.title}</span>
                    <span className="mt-1 block font-mono text-caption text-muted">{property.homeraId}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-success/30 bg-success/[0.06] px-2.5 py-1 text-micro font-semibold text-success">
                    {property.mandate?.scope.map((scope) => SCOPE_LABELS[scope] ?? scope).join(" · ") || "Mandat actif"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </WorkspacePanel>

        <WorkspacePanel title="Demandes reçues" description="Un mandat n’ouvre un accès qu’après votre acceptation." icon={FileBadge}>
          {pending.length === 0 ? (
            <p className="text-note leading-relaxed text-muted">Aucune demande en attente.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-note font-semibold">{entry.propertyTitle}</p>
                  <p className="mt-1 text-caption text-muted">{entry.propertyReference} · {entry.ownerName} · jusqu’au {formatDate(entry.expiresAt)}</p>
                  <div className="mt-3">
                    <Link href="/agent/autorisations" className={BUTTON_PRIMARY}>Répondre<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </WorkspacePanel>
      </div>
    </>
  );
}

/* ==================================================================
   BIENS AUTORISÉS
   ================================================================== */

function AgentProperties() {
  const { properties } = useAgentData();
  const list = useMemo(() => properties.data?.properties ?? [], [properties.data]);

  if (properties.loading) return <Loading label="Chargement des biens autorisés…" />;
  if (properties.error) return <LoadError message={properties.error} onRetry={() => void properties.reload()} />;

  return (
    <>
      <WorkspaceHeading eyebrow="Accès par mandat" title="Mes biens autorisés" description="Aucun bien n’est visible ici par simple déclaration : chaque fiche découle d’une autorisation active en base." />
      {list.length === 0 ? (
        <EmptyPanel icon={ShieldCheck} title="Aucun mandat actif" description="Aucun mandat valide n’est rattaché à votre compte. Les biens d’un autre agent ne sont pas accessibles." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((property) => (
            <WorkspacePanel key={property.id} title={property.title} description={`${property.district}, ${property.city} · ${property.homeraId}`} icon={House}>
              <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  {property.media ? <Visual mediaKey={property.media} alt={property.alt} sizes="150px" veil="none" quality={68} className="absolute inset-0 h-full w-full" /> : null}
                </div>
                <div>
                  <p className="text-note font-semibold">{formatPropertyPrice(property as never)}</p>
                  <p className="mt-2 text-caption leading-relaxed text-muted">
                    {property.mandate?.scope.map((scope) => SCOPE_LABELS[scope] ?? scope).join(" · ") || "Périmètre non précisé"}
                  </p>
                  <p className="mt-2 text-caption text-muted">Mandat {property.mandate?.reference} valable jusqu’au {formatDate(property.mandate?.expiresAt ?? "")}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/biens/${property.id}`} className={BUTTON_SECONDARY}>Ouvrir la fiche<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                    <Link href={`/verification-agent?bien=${property.homeraId}`} className={BUTTON_SECONDARY}><QrCodeIcon className="h-4 w-4" aria-hidden="true" />Vérification publique</Link>
                  </div>
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
   AUTORISATIONS — le cœur du lot 3
   ================================================================== */

function AgentAuthorizations() {
  const { authorizations, properties } = useAgentData();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  const list = authorizations.data?.authorizations ?? [];
  const matricule = properties.data?.matricule;

  const decide = async (id: string, action: "accepter" | "refuser" | "contester") => {
    setBusy(id);
    setError(null);
    setNotice(null);
    const result = await apiPost<{ authorization: AuthorizationView }>(`/api/authorizations/${id}`, {
      action,
      reason: reason[id] ?? "",
    });
    setBusy("");
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setNotice(
      action === "accepter"
        ? "Mandat accepté : le bien est désormais accessible et le propriétaire est notifié."
        : action === "refuser"
          ? "Demande refusée : le motif est conservé dans l’historique du mandat."
          : "Contestation enregistrée : HOMERA est notifiée et la contestation apparaît dans l’historique.",
    );
    setReason((current) => ({ ...current, [id]: "" }));
    await authorizations.reload();
    await properties.reload();
  };

  if (authorizations.loading) return <Loading label="Chargement de vos autorisations…" />;
  if (authorizations.error) return <LoadError message={authorizations.error} onRetry={() => void authorizations.reload()} />;

  const pending = list.filter((entry) => entry.status === "en-attente");

  return (
    <>
      <WorkspaceHeading
        eyebrow="Identité vérifiable"
        title="Matricule & autorisations"
        description="Chaque habilitation porte une référence, une preuve déclarée, une date d’effet et une échéance. Accepter un mandat vous engage sur le bien concerné."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <InfoTile label="Matricule agent" value={matricule ?? "Non attribué"} icon={FileBadge} />
        <InfoTile label="Demandes en attente" value={String(pending.length)} icon={BadgeCheck} />
        <InfoTile label="Mandats actifs" value={String(list.filter((entry) => entry.status === "active").length)} icon={House} />
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-caption font-semibold text-success">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.05] px-4 py-3 text-caption font-semibold text-error">{error}</p>}

      {list.length === 0 ? (
        <EmptyPanel icon={ShieldCheck} title="Aucune autorisation" description="Les mandats ne s’affichent que lorsqu’un propriétaire vous a désigné pour un bien précis." />
      ) : (
        <div className="space-y-4">
          {list.map((entry) => (
            <article key={entry.id} className="rounded-card border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-note font-semibold">{entry.propertyTitle}</p>
                  <p className="mt-1 font-mono text-caption text-muted">{entry.reference} · {entry.propertyReference}</p>
                  <p className="mt-1 text-caption text-muted">Propriétaire : {entry.ownerName || "—"}</p>
                </div>
                <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-caption font-semibold ${MANDATE_TONE[entry.status] ?? "border-border bg-background text-muted"}`}>
                  {MANDATE_LABELS[entry.status] ?? entry.status}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoCell label="Preuve déclarée" value={entry.proofLabel || "—"} />
                <InfoCell label="Périmètre" value={entry.scope.map((scope) => SCOPE_LABELS[scope] ?? scope).join(" · ") || "—"} />
                <InfoCell label="Période" value={`${formatDate(entry.startsAt)} → ${formatDate(entry.expiresAt)}`} />
                <InfoCell label="Demandé le" value={formatDate(entry.createdAt)} />
              </dl>

              {entry.decisionNote && (
                <p className="mt-4 rounded-xl border border-border bg-background p-3 text-caption leading-relaxed text-muted">
                  <strong className="text-foreground">Motif :</strong> {entry.decisionNote}
                </p>
              )}

              {entry.status === "en-attente" && (
                <div className="mt-4 rounded-xl border border-warning/25 bg-warning/[0.05] p-4">
                  <label className="block text-caption font-semibold" htmlFor={`reason-${entry.id}`}>
                    Motif (obligatoire pour un refus ou une contestation)
                  </label>
                  <textarea
                    id={`reason-${entry.id}`}
                    rows={2}
                    value={reason[entry.id] ?? ""}
                    onChange={(event) => setReason((current) => ({ ...current, [entry.id]: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-note"
                    placeholder="Ex. je ne dispose pas du mandat signé pour ce bien."
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void decide(entry.id, "accepter")} disabled={busy === entry.id} className={`${BUTTON_PRIMARY} disabled:opacity-60`}>
                      {busy === entry.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}Accepter le mandat
                    </button>
                    <button type="button" onClick={() => void decide(entry.id, "refuser")} disabled={busy === entry.id} className={BUTTON_SECONDARY}>
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />Refuser
                    </button>
                    <button type="button" onClick={() => void decide(entry.id, "contester")} disabled={busy === entry.id} className={BUTTON_SECONDARY}>
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Contester
                    </button>
                  </div>
                  <p className="mt-3 text-caption leading-relaxed text-muted">
                    Accepter ouvre l’accès au bien dans la limite du périmètre ci-dessus. Chaque mouvement est
                    consigné et notifié au propriétaire comme à l’administration HOMERA.
                  </p>
                </div>
              )}

              {entry.status === "active" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/verification-agent?bien=${entry.propertyReference}`} className={BUTTON_PRIMARY}>
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />Page de vérification
                  </Link>
                  <Link href={`/api/authorizations/${entry.id}`} className={BUTTON_SECONDARY}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Historique du mandat
                  </Link>
                  <QrPanel agentId={matricule ?? entry.agentId ?? ""} propertyRef={entry.propertyReference} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="mt-8">
        <PaymentMethodsWorkspace contextRole="agent" agentId={matricule ?? undefined} embedded />
      </div>
    </>
  );
}

/* ==================================================================
   PIÈCES DES BIENS MANDATÉS
   ================================================================== */

function AgentDocuments() {
  const { properties } = useAgentData();
  const list = useMemo(() => properties.data?.properties ?? [], [properties.data]);
  const [pieces, setPieces] = useState<Record<string, { kind: string; filename: string; status: string }[]>>({});
  const [loadingId, setLoadingId] = useState("");

  const loadPieces = async (propertyId: string) => {
    if (pieces[propertyId]) return;
    setLoadingId(propertyId);
    const result = await fetch(`/api/properties/${propertyId}/documents`, { cache: "no-store" })
      .then((response) => response.json())
      .catch(() => null);
    setLoadingId("");
    if (result?.ok) setPieces((current) => ({ ...current, [propertyId]: result.data.documents }));
  };

  if (properties.loading) return <Loading label="Chargement des pièces…" />;
  if (properties.error) return <LoadError message={properties.error} onRetry={() => void properties.reload()} />;

  return (
    <>
      <WorkspaceHeading eyebrow="Pièces des biens mandatés" title="Documents" description="Les pièces déclarées sur les biens que votre mandat couvre. Le fichier lui-même n’est pas encore hébergé." />
      {list.length === 0 ? (
        <EmptyPanel icon={FileText} title="Aucun document" description="Les pièces apparaîtront avec un mandat actif attribué à votre compte." />
      ) : (
        <div className="space-y-4">
          {list.map((property) => (
            <WorkspacePanel key={property.id} title={property.title} description={`${property.homeraId} · ${property.documents} pièce(s) déclarée(s)`} icon={FileText}>
              <button type="button" onClick={() => void loadPieces(property.id)} className={BUTTON_SECONDARY}>
                {loadingId === property.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />}
                Charger les pièces
              </button>
              {pieces[property.id] && (
                <ul className="mt-3 space-y-2">
                  {pieces[property.id].map((doc, index) => (
                    <li key={`${doc.filename}-${index}`} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-caption">
                      <FileCheck2 className="h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{doc.filename}</span>
                      <span className="shrink-0 text-micro text-muted">{doc.kind} · {doc.status}</span>
                    </li>
                  ))}
                  {pieces[property.id].length === 0 && <li className="text-caption text-muted">Aucune pièce déclarée sur ce bien.</li>}
                </ul>
              )}
            </WorkspacePanel>
          ))}
        </div>
      )}
    </>
  );
}

/* ==================================================================
   PROFIL
   ================================================================== */

function AgentProfile() {
  const { account } = useAuth();
  const { properties, authorizations } = useAgentData();
  const list = properties.data?.properties ?? [];
  const matricule = properties.data?.matricule ?? "En attente d’attribution";
  const active = (authorizations.data?.authorizations ?? []).filter((entry) => entry.status === "active").length;
  const name = [account?.prenom, account?.nom].filter(Boolean).join(" ") || "Profil agent";
  const structure = account?.profile.structure || "Aucune structure renseignée";
  const profileItems = account ? describeProfile("agent", account.profile) : [];
  const first = (authorizations.data?.authorizations ?? [])[0];

  return (
    <>
      <WorkspaceHeading eyebrow="Profil agent" title="Identité professionnelle" description="Votre profil s’appuie sur un matricule HOMERA et des autorisations vérifiables bien par bien." actions={<Link href="/client/parametres" className={BUTTON_SECONDARY}>Modifier mes informations</Link>} />
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <WorkspacePanel title={name} description={structure} icon={UserRound}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <InfoCell label="Matricule" value={matricule} />
            <InfoCell label="Statut" value={list.length ? "Mandat actif" : "Aucune habilitation active"} />
            <InfoCell label="Biens accessibles" value={`${list.length} bien(s)`} />
            <InfoCell label="Mandats actifs" value={String(active)} />
            <InfoCell label="E-mail" value={account?.email || "Non renseigné"} />
            {profileItems.map((entry) => <InfoCell key={entry.label} label={entry.label} value={entry.value || "À renseigner"} />)}
          </dl>
          <Link href="/agent/autorisations" className={`${BUTTON_PRIMARY} mt-4`}>Consulter mes mandats<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </WorkspacePanel>
        <WorkspacePanel title="Vérification publique" description="Partagez une page vérifiable attachée au mandat, jamais un accès général." icon={QrCodeIcon}>
          <p className="text-note leading-relaxed text-muted">
            Une autorisation est valable pour un bien donné, un représentant identifié et une période précise. Le
            client peut scanner le code ou saisir la référence pour vérifier son état réel.
          </p>
          {first ? (
            <>
              <Link href={`/verification-agent?bien=${first.propertyReference}`} className={`${BUTTON_SECONDARY} mt-4`}>Prévisualiser la vérification<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <div className="mt-5"><QrPanel agentId={matricule} propertyRef={first.propertyReference} /></div>
            </>
          ) : (
            <p className="mt-4 text-caption text-muted">Aucune autorisation ne peut être partagée pour ce compte.</p>
          )}
        </WorkspacePanel>
      </div>
    </>
  );
}

/* ==================================================================
   ÉLÉMENTS PARTAGÉS
   ================================================================== */

const subscribeOrigin = () => () => {};
const getOrigin = () => (typeof window === "undefined" ? "https://homera.example" : window.location.origin);

function QrPanel({ agentId, propertyRef }: { agentId: string; propertyRef: string }) {
  const origin = useSyncExternalStore(subscribeOrigin, getOrigin, () => "https://homera.example");
  const value = `${origin}/verification-agent?agent=${encodeURIComponent(agentId)}&bien=${encodeURIComponent(propertyRef)}`;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background p-4 text-center">
      <QrCode value={value} size={128} title={`QR code de vérification ${agentId} · ${propertyRef}`} className="text-homera-brown" />
      <p className="mt-3 text-caption font-semibold">Vérifier cette autorisation</p>
      <p className="mt-1 max-w-40 break-all font-mono text-micro text-muted">{agentId} · {propertyRef}</p>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return <div className="flex items-center gap-3 py-16 text-note text-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{label}</div>;
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyPanel
      icon={ShieldCheck}
      title="Lecture impossible"
      description={message}
      action={<button type="button" onClick={onRetry} className={BUTTON_PRIMARY}><RefreshCw className="h-4 w-4" aria-hidden="true" />Réessayer</button>}
    />
  );
}

function InfoTile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof House }) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
      <p className="mt-3 text-caption text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dt className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-caption font-medium">{value}</dd>
    </div>
  );
}

function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

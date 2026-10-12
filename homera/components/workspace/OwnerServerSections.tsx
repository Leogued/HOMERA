"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, ClipboardList, FileText,
  House, ImageIcon, Loader2, PauseCircle, Plus, RefreshCw, ShieldCheck, Users, XCircle,
} from "lucide-react";
import { apiGet, apiPost, messageOf } from "@/lib/api-client";
import { useServerResource } from "@/lib/use-server-resource";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel, MetricCard, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";
import { Visual } from "@/components/ui/Visual";

/* ==================================================================
   HOMERA — ESPACE PROPRIÉTAIRE, ALIMENTÉ PAR LE SERVEUR
   ------------------------------------------------------------------
   Les biens, leurs statuts et les mandats viennent de la base. Aucun
   statut n’est fabriqué dans le navigateur : le serveur seul décide
   qu’un dossier est en vérification, publié ou suspendu.

   Conséquence assumée : quand l’action appartient à HOMERA (publier,
   suspendre, renvoyer en contrôle), l’écran ne propose pas de bouton —
   il affiche l’état réel et la raison. Mieux vaut pas de bouton qu’un
   bouton qui ment.
   ================================================================== */

export type OwnerProperty = {
  id: string;
  homeraId: string;
  title: string;
  type: string;
  intent: string;
  price: number;
  pricePeriod?: string;
  city: string;
  district: string;
  media: string;
  alt: string;
  verificationStatus: string;
  availabilityStatus: string;
  publicationStatus: string;
  verification: string;
  availability: string;
  photos: number;
  documents: number;
  updatedAt: string;
};

export type AuthorizationView = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle?: string;
  agentId: string | null;
  agentName: string;
  agentEmail: string | null;
  status: string;
  scope: string[];
  expiresAt: string;
  createdAt?: string;
};

const PUBLICATION_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  soumis: "Soumis au contrôle",
  "en-verification": "En vérification",
  publie: "Publié",
  suspendu: "Suspendu par HOMERA",
  loue: "Loué",
  vendu: "Vendu",
  archive: "Archivé",
};

const VERIFICATION_LABELS: Record<string, string> = {
  "non-verifie": "Non vérifié",
  "en-cours": "Contrôle en cours",
  verifie: "Vérifié",
  refuse: "Refusé",
  suspendu: "Suspendu",
};

const AUTHORIZATION_LABELS: Record<string, string> = {
  "en-attente": "En attente de l’agent",
  invite: "Invitation envoyée",
  active: "Active",
  refusee: "Refusée",
  expiree: "Expirée",
  revoquee: "Révoquée",
  contestee: "Contestée",
};

const PUBLICATION_TONE: Record<string, string> = {
  brouillon: "border-border bg-background text-muted",
  soumis: "border-info/30 bg-info/[0.06] text-info",
  "en-verification": "border-warning/30 bg-warning/[0.07] text-warning",
  publie: "border-success/30 bg-success/[0.06] text-success",
  suspendu: "border-error/30 bg-error/[0.06] text-error",
  loue: "border-border bg-background text-muted",
  vendu: "border-border bg-background text-muted",
  archive: "border-border bg-background text-muted",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-caption font-semibold ${PUBLICATION_TONE[status] ?? "border-border bg-background text-muted"}`}>
      {PUBLICATION_LABELS[status] ?? status}
    </span>
  );
}

function authorizationTone(status: string): string {
  if (status === "active") return "border-success/30 bg-success/[0.06] text-success";
  if (status === "en-attente" || status === "invite") return "border-warning/30 bg-warning/[0.07] text-warning";
  if (status === "contestee" || status === "revoquee" || status === "refusee") return "border-error/30 bg-error/[0.06] text-error";
  return "border-border bg-background text-muted";
}

/* ==================================================================
   TABLEAU DE BORD
   ================================================================== */

export function OwnerDashboard() {
  const properties = useServerResource<{ properties: OwnerProperty[] }>("/api/owner/properties");
  const authorizations = useServerResource<{ authorizations: AuthorizationView[]; pending: number }>("/api/authorizations");
  const list = useMemo(() => properties.data?.properties ?? [], [properties.data]);

  const counts = useMemo(() => {
    const by = (status: string) => list.filter((entry) => entry.publicationStatus === status).length;
    return {
      total: list.length,
      published: by("publie"),
      review: by("soumis") + by("en-verification"),
      drafts: by("brouillon"),
    };
  }, [list]);

  if (properties.loading) return <WorkspaceSkeleton label="Chargement de vos biens…" />;
  if (properties.error) return <WorkspaceError message={properties.error} onRetry={() => void properties.reload()} />;

  return (
    <>
      <WorkspaceHeading
        eyebrow="Espace propriétaire"
        title="Vos biens"
        description="Les chiffres et les statuts ci-dessous viennent du serveur HOMERA : rien n’est estimé ni simulé."
        actions={<Link href="/proprietaire/ajouter-bien" className={BUTTON_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" />Ajouter un bien</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={House} label="Biens au portefeuille" value={counts.total} detail="Dossiers enregistrés" />
        <MetricCard icon={BadgeCheck} label="Publiés" value={counts.published} detail="Visibles dans la recherche" />
        <MetricCard icon={ClipboardList} label="En cours de contrôle" value={counts.review} detail="Vérification HOMERA" />
        <MetricCard icon={CalendarDays} label="Brouillons" value={counts.drafts} detail="À reprendre et soumettre" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <WorkspacePanel
          title="Vue sur vos biens"
          description={`${counts.review} dossier${counts.review === 1 ? "" : "s"} en cours de contrôle`}
          icon={House}
          action={<Link href="/proprietaire/biens" className="text-caption font-semibold text-homera-terracotta hover:underline">Tout voir</Link>}
        >
          {list.length === 0 ? (
            <p className="text-note leading-relaxed text-muted">Aucun bien déposé pour le moment. Le premier dossier se crée en onze étapes.</p>
          ) : (
            <ul className="divide-y divide-border">
              {list.slice(0, 6).map((property) => (
                <li key={property.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-note font-semibold">{property.title}</p>
                    <p className="mt-1 font-mono text-caption text-muted">{property.homeraId} · {property.city}</p>
                  </div>
                  <StatusPill status={property.publicationStatus} />
                </li>
              ))}
            </ul>
          )}
        </WorkspacePanel>

        <WorkspacePanel title="À traiter" description="Les prochaines actions liées à votre activité." icon={ClipboardList}>
          <div className="space-y-3">
            <ActionRow href="/proprietaire/biens" icon={CheckCircle2} title="Compléter un brouillon" detail={`${counts.drafts} dossier(s) à reprendre`} />
            <ActionRow href="/proprietaire/visites" icon={CalendarDays} title="Répondre aux visites" detail="Confirmer, reprogrammer ou refuser un créneau" />
            <ActionRow href="/proprietaire/demandes" icon={ClipboardList} title="Instruire les candidatures" detail="Dossiers déposés après visite" />
            <ActionRow href="/proprietaire/agents" icon={Users} title="Suivre les mandats" detail={`${authorizations.data?.pending ?? 0} demande(s) en attente`} />
            <ActionRow href="/proprietaire/documents" icon={FileText} title="Préparer un contrat" detail="Après acceptation d’une candidature" />
          </div>
        </WorkspacePanel>
      </div>
    </>
  );
}

/* ==================================================================
   MES BIENS
   ================================================================== */

export function OwnerListings() {
  const properties = useServerResource<{ properties: OwnerProperty[] }>("/api/owner/properties");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (propertyId: string) => {
    setBusyId(propertyId);
    setError(null);
    setNotice(null);
    const result = await apiPost<{ property: OwnerProperty }>(`/api/properties/${propertyId}/submit`);
    setBusyId("");
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setNotice("Dossier envoyé au contrôle HOMERA. Le statut a été mis à jour par le serveur.");
    await properties.reload();
  };

  if (properties.loading) return <WorkspaceSkeleton label="Chargement de vos biens…" />;
  if (properties.error) return <WorkspaceError message={properties.error} onRetry={() => void properties.reload()} />;

  const list = properties.data?.properties ?? [];

  return (
    <>
      <WorkspaceHeading
        eyebrow="Votre portefeuille"
        title="Mes biens"
        description="Chaque référence porte le statut réel de publication, de contrôle et de disponibilité décidé par le serveur."
        actions={<Link href="/proprietaire/ajouter-bien" className={BUTTON_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" />Ajouter un bien</Link>}
      />

      {notice && <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-caption font-semibold text-success">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.05] px-4 py-3 text-caption font-semibold text-error">{error}</p>}

      {list.length === 0 ? (
        <EmptyPanel
          icon={House}
          title="Aucun bien déposé"
          description="Créez votre premier dossier : onze étapes, un enregistrement immédiat sur le serveur HOMERA."
          action={<Link href="/proprietaire/ajouter-bien" className={BUTTON_PRIMARY}>Déposer un bien<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((property) => (
            <OwnerPropertyCard
              key={property.id}
              property={property}
              busy={busyId === property.id}
              onSubmit={() => void submit(property.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function OwnerPropertyCard({ property, busy, onSubmit }: { property: OwnerProperty; busy: boolean; onSubmit: () => void }) {
  const canSubmit = property.publicationStatus === "brouillon";
  const canCorrect = ["brouillon", "soumis", "en-verification"].includes(property.publicationStatus);
  const isPublic = property.publicationStatus === "publie";

  return (
    <WorkspacePanel
      title={property.title}
      description={`${property.homeraId} · ${property.district}, ${property.city}`}
      icon={House}
      action={<StatusPill status={property.publicationStatus} />}
    >
      <div className="grid gap-4 sm:grid-cols-[132px_1fr]">
        {property.media ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Visual mediaKey={property.media} alt={property.alt} sizes="140px" veil="none" quality={68} className="absolute inset-0 h-full w-full" />
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border">
            <ImageIcon className="h-6 w-6 text-muted-light" aria-hidden="true" />
          </div>
        )}
        <div>
          <p className="homera-num text-note font-semibold">
            {new Intl.NumberFormat("fr-FR").format(property.price)} FCFA{property.pricePeriod ? ` ${property.pricePeriod}` : ""}
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <InfoCell label="Contrôle" value={VERIFICATION_LABELS[property.verification] ?? property.verification} />
            <InfoCell label="Disponibilité" value={property.availability === "disponible" ? "Disponible" : "Indisponible"} />
            <InfoCell label="Photos" value={String(property.photos)} />
            <InfoCell label="Pièces déclarées" value={String(property.documents)} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {isPublic && <Link href={`/biens/${property.id}`} className={BUTTON_SECONDARY}>Voir la fiche publique<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
            {canCorrect && <Link href={`/proprietaire/ajouter-bien?modifier=${property.id}`} className={BUTTON_SECONDARY}>Corriger le dossier</Link>}
            {canSubmit && (
              <button type="button" onClick={onSubmit} disabled={busy} className={`${BUTTON_PRIMARY} disabled:opacity-60`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}Soumettre au contrôle
              </button>
            )}
            {!canSubmit && !canCorrect && (
              <span role="status" className="inline-flex min-h-10 items-center gap-2 rounded-btn border border-border bg-background px-3 text-caption text-muted">
                {property.publicationStatus === "suspendu" ? <PauseCircle className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {property.publicationStatus === "suspendu"
                  ? "Suspendu par HOMERA — contactez l’équipe"
                  : "Aucune action disponible de votre côté"}
              </span>
            )}
          </div>
        </div>
      </div>
    </WorkspacePanel>
  );
}

/* ==================================================================
   AGENTS & MANDATS
   ================================================================== */

export function OwnerAgents() {
  const properties = useServerResource<{ properties: OwnerProperty[] }>("/api/owner/properties");
  const authorizations = useServerResource<{ authorizations: AuthorizationView[]; pending: number }>("/api/authorizations");
  const agents = useServerResource<{ agents: { id: string; matricule: string; name: string; agency: string }[] }>("/api/agents");

  const [form, setForm] = useState({ propertyId: "", agentId: "", scope: ["visite"] as string[], proofLabel: "", expiresAt: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useMemo(() => properties.data?.properties ?? [], [properties.data]);
  const mandates = authorizations.data?.authorizations ?? [];

  const create = async () => {
    setError(null);
    setNotice(null);
    if (!form.propertyId || !form.agentId || !form.proofLabel.trim() || !form.expiresAt) {
      setError("Choisissez le bien, l’agent, la pièce fournie et la date de fin du mandat.");
      return;
    }
    setBusy(true);
    const result = await apiPost<{ authorization: AuthorizationView }>("/api/authorizations", {
      propertyId: form.propertyId,
      agentId: form.agentId,
      scope: form.scope,
      proofLabel: form.proofLabel,
      expiresAt: form.expiresAt,
      note: form.note,
    });
    setBusy(false);
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setNotice("Demande de mandat enregistrée : l’agent et l’administration HOMERA sont notifiés.");
    setForm({ propertyId: "", agentId: "", scope: ["visite"], proofLabel: "", expiresAt: "", note: "" });
    await authorizations.reload();
  };

  const act = async (id: string, action: "revoquer" | "contester" | "renouveler", expiresAt?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await apiPost<{ authorization: AuthorizationView }>(`/api/authorizations/${id}`, {
      action,
      reason: action === "contester" ? "Contestation ouverte par le propriétaire" : "",
      expiresAt,
    });
    setBusy(false);
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setNotice("Le mandat a été mis à jour et le mouvement consigné dans son historique.");
    await authorizations.reload();
  };

  if (properties.loading || authorizations.loading) return <WorkspaceSkeleton label="Chargement des mandats…" />;
  if (authorizations.error) return <WorkspaceError message={authorizations.error} onRetry={() => void authorizations.reload()} />;

  return (
    <>
      <WorkspaceHeading
        eyebrow="Représentants mandatés"
        title="Agents autorisés"
        description="Un agent n’accède à un bien qu’avec un mandat accepté, valide et limité aux actions que vous avez cochées."
      />

      {notice && <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-caption font-semibold text-success">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.05] px-4 py-3 text-caption font-semibold text-error">{error}</p>}

      <WorkspacePanel title="Demander un mandat" description="La demande part au statut « en attente » : elle n’ouvre aucun accès avant acceptation." icon={Users}>
        {list.length === 0 || (agents.data?.agents.length ?? 0) === 0 ? (
          <p className="text-note leading-relaxed text-muted">
            {(list.length === 0 ? "Déposez d’abord un bien. " : "")}
            {(agents.data?.agents.length ?? 0) === 0 ? "Aucun agent HOMERA vérifié n’est encore enregistré." : ""}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-caption font-semibold" htmlFor="mandate-property">Bien concerné
              <select id="mandate-property" value={form.propertyId} onChange={(event) => setForm({ ...form, propertyId: event.target.value })} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-note">
                <option value="">Choisir un bien</option>
                {list.map((property) => <option key={property.id} value={property.id}>{property.homeraId} · {property.title}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-caption font-semibold" htmlFor="mandate-agent-select">Agent HOMERA
              <select id="mandate-agent-select" value={form.agentId} onChange={(event) => setForm({ ...form, agentId: event.target.value })} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-note">
                <option value="">Choisir un agent</option>
                {(agents.data?.agents ?? []).map((agent) => <option key={agent.id} value={agent.id}>{agent.matricule} · {agent.name}{agent.agency ? ` · ${agent.agency}` : ""}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-caption font-semibold" htmlFor="mandate-proof-2">Pièce fournie
              <input id="mandate-proof-2" value={form.proofLabel} onChange={(event) => setForm({ ...form, proofLabel: event.target.value })} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-note" placeholder="Mandat de gestion signé" />
            </label>
            <label className="space-y-1.5 text-caption font-semibold" htmlFor="mandate-expiry">Fin de validité
              <input id="mandate-expiry" type="date" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-note" />
            </label>
          </div>
        )}
        <fieldset className="mt-4">
          <legend className="text-note font-semibold">Actions autorisées</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: "visite", label: "Faire visiter" },
              { id: "annonce", label: "Gérer l’annonce" },
              { id: "location", label: "Conclure la location" },
              { id: "gestion", label: "Gérer le bien" },
            ].map((scope) => (
              <label key={scope.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-caption">
                <input
                  type="checkbox"
                  checked={form.scope.includes(scope.id)}
                  onChange={(event) => setForm({ ...form, scope: event.target.checked ? [...form.scope, scope.id] : form.scope.filter((entry) => entry !== scope.id) })}
                  className="h-4 w-4 accent-homera-terracotta"
                />
                {scope.label}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" onClick={() => void create()} disabled={busy} className={`${BUTTON_PRIMARY} mt-5 disabled:opacity-60`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Users className="h-4 w-4" aria-hidden="true" />}Envoyer la demande de mandat
        </button>
      </WorkspacePanel>

      <div className="mt-6 space-y-3">
        <h2 className="font-serif text-display-xs">Mandats du portefeuille</h2>
        {mandates.length === 0 ? (
          <p className="text-note leading-relaxed text-muted">Aucun mandat enregistré pour le moment.</p>
        ) : (
          mandates.map((mandate) => (
            <article key={mandate.id} className="rounded-card border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-note font-semibold">{mandate.agentName || mandate.agentEmail || "Agent invité"}</p>
                  <p className="mt-1 font-mono text-caption text-muted">{mandate.reference} · {mandate.propertyTitle ?? mandate.propertyId}</p>
                  <p className="mt-1 text-caption text-muted">
                    Échéance {mandate.expiresAt} · actions : {mandate.scope.join(", ") || "aucune"}
                  </p>
                </div>
                <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-caption font-semibold ${authorizationTone(mandate.status)}`}>
                  {AUTHORIZATION_LABELS[mandate.status] ?? mandate.status}
                </span>
              </div>
              {mandate.status === "active" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void act(mandate.id, "renouveler", nextYear())} disabled={busy} className={BUTTON_SECONDARY}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Renouveler d’un an
                  </button>
                  <button type="button" onClick={() => void act(mandate.id, "revoquer")} disabled={busy} className={BUTTON_SECONDARY}>
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />Révoquer le mandat
                  </button>
                  <Link href={`/api/authorizations/${mandate.id}`} className={BUTTON_SECONDARY}>Historique</Link>
                </div>
              )}
              {mandate.status === "en-attente" && (
                <p className="mt-4 text-caption leading-relaxed text-muted">
                  Demande transmise à l’agent : il doit l’accepter pour qu’elle devienne active. Vous pouvez la
                  contester si la pièce fournie ne correspond pas.
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </>
  );
}

/* ==================================================================
   ÉTATS PARTAGÉS
   ================================================================== */

function WorkspaceSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-note text-muted" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{label}
    </div>
  );
}

function WorkspaceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyPanel
      icon={House}
      title="Lecture impossible"
      description={message}
      action={<button type="button" onClick={onRetry} className={BUTTON_PRIMARY}><RefreshCw className="h-4 w-4" aria-hidden="true" />Réessayer</button>}
    />
  );
}

function ActionRow({ href, icon: Icon, title, detail }: { href: string; icon: typeof House; title: string; detail: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-homera-terracotta/40 hover:bg-surface-hover">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-homera-terracotta"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-note font-semibold">{title}</span>
        <span className="mt-0.5 block text-caption text-muted">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted transition-colors group-hover:text-homera-terracotta" aria-hidden="true" />
    </Link>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-micro font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 break-words text-caption font-medium">{value}</p>
    </div>
  );
}

function nextYear(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

/** Re-exporté pour les tests de cohérence côté serveur. */
export { apiGet };

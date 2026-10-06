"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, CheckCircle2,
  Download, FileBadge, FileCheck2, FileText, House, QrCode as QrCodeIcon,
  ShieldCheck, Users, UserRound, XCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import { QrCode } from "@/components/ui/QrCode";
import { Visual } from "@/components/ui/Visual";
import { describeProfile } from "@/lib/auth";
import { PROPERTIES } from "@/lib/content";
import { formatPropertyPrice } from "@/lib/format";
import { authorizationsForAgent, type AgentAuthorization } from "@/lib/portal-data";
import { makeNotification, type VisitRecord } from "@/lib/workflow";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice, EmptyPanel, MetricCard, StatusBadge, WorkspaceHeading, WorkspacePanel } from "@/components/workspace/Primitives";

const subscribeOrigin = () => () => {};
const getOrigin = () => typeof window === "undefined" ? "https://homera.example" : window.location.origin;

type AgentWorkspaceProps = {
  authorizations: AgentAuthorization[];
  authorizedPropertyIds: ReadonlySet<string>;
};

export function AgentWorkspace({ section }: { section: string }) {
  const { account } = useAuth();
  const authorizations = authorizationsForAgent(account);
  const authorizedPropertyIds = new Set(authorizations.map((entry) => entry.propertyId));

  switch (section) {
    case "dashboard": return <AgentDashboard authorizations={authorizations} authorizedPropertyIds={authorizedPropertyIds} />;
    case "biens": return <AgentProperties authorizations={authorizations} />;
    case "visites": return <AgentVisits authorizedPropertyIds={authorizedPropertyIds} />;
    case "clients": return <AgentClients authorizedPropertyIds={authorizedPropertyIds} />;
    case "documents": return <AgentDocuments authorizations={authorizations} />;
    case "autorisations": return <AgentAuthorizations authorizations={authorizations} />;
    case "profil": return <AgentProfile authorizations={authorizations} />;
    default: return <AgentDashboard authorizations={authorizations} authorizedPropertyIds={authorizedPropertyIds} />;
  }
}

function AgentDashboard({ authorizations, authorizedPropertyIds }: AgentWorkspaceProps) {
  const { account } = useAuth();
  const { data } = useWorkflow();
  const allowedVisits = data.visits.filter((visit) => authorizedPropertyIds.has(visit.propertyId));
  const pending = allowedVisits.filter((visit) => ["demande-envoyee", "en-attente"].includes(visit.status));
  const agentId = authorizations[0]?.agentId;

  return <>
    <WorkspaceHeading
      eyebrow="Espace agent · mandat contrôlé"
      title={`Bonjour ${account?.prenom || "Agent"}`}
      description="Votre activité est limitée aux biens pour lesquels une autorisation active est rattachée à votre identité."
      actions={<Link href="/agent/autorisations" className={BUTTON_SECONDARY}><FileBadge className="h-4 w-4" aria-hidden="true" />Mes autorisations</Link>}
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={House} label="Biens autorisés" value={authorizations.length} detail="Mandats actifs et attribués à ce compte" />
      <MetricCard icon={CalendarDays} label="Visites à traiter" value={pending.length} detail="Biens dont le mandat est actif" />
      <MetricCard icon={Users} label="Demandes clients" value={allowedVisits.length} detail="Références autorisées uniquement" />
      <MetricCard icon={ShieldCheck} label="Statut du profil" value={authorizations.length ? "Actif" : "À vérifier"} detail={agentId ? `Matricule ${agentId}` : "Aucun mandat rattaché"} />
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
      <WorkspacePanel
        title="Mandats en cours"
        description="Seuls les mandats actifs associés à votre identité déterminent les biens accessibles."
        icon={ShieldCheck}
        action={<Link href="/agent/biens" className="text-caption font-semibold text-homera-terracotta hover:underline">Voir les biens</Link>}
      >
        {authorizations.length ? <ul className="space-y-3">{authorizations.map((auth) => {
          const property = PROPERTIES.find((item) => item.id === auth.propertyId);
          return <li key={auth.propertyRef} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl">{property && <Visual mediaKey={property.media} alt={property.alt} sizes="70px" veil="none" quality={62} className="absolute inset-0 h-full w-full" />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-note font-semibold">{property?.title ?? auth.propertyRef}</span><span className="mt-1 block font-mono text-caption text-muted">{auth.propertyRef}</span></span>
            <StatusBadge status="valide" />
          </li>;
        })}</ul> : <p className="text-note leading-relaxed text-muted">Aucun mandat actif n’est rattaché à cette identité. Les biens déclarés ou ceux d’un autre agent restent masqués.</p>}
      </WorkspacePanel>
      <WorkspacePanel title="À traiter aujourd’hui" description="Confirmez ou réorganisez les créneaux reçus." icon={CalendarDays}>
        {pending.length ? <ul className="space-y-3">{pending.slice(0, 4).map((visit) => <li key={visit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"><div><p className="text-note font-semibold">{visit.propertyTitle}</p><p className="mt-1 text-caption text-muted">{visit.clientName} · {formatDateOnly(visit.date)} · {visit.slot}</p></div><StatusBadge status={visit.status} /></li>)}</ul> : <p className="text-note leading-relaxed text-muted">Aucune demande sur les biens autorisés.</p>}
        <Link href="/agent/visites" className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-caption font-semibold text-homera-terracotta hover:underline">Ouvrir l’agenda<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      </WorkspacePanel>
    </div>
    <div className="mt-6"><DemoNotice>Les mandats visibles sont des données de démonstration liées à l’identité agent correspondante. Une autorisation réelle doit être vérifiée côté serveur avant chaque action.</DemoNotice></div>
  </>;
}

function AgentProperties({ authorizations }: { authorizations: AgentAuthorization[] }) {
  return <>
    <WorkspaceHeading eyebrow="Accès par mandat" title="Mes biens autorisés" description="Aucun bien n’est visible ici par simple déclaration. Chaque fiche découle d’une autorisation active attribuée à votre compte." />
    {!authorizations.length ? <EmptyPanel icon={ShieldCheck} title="Aucun mandat actif" description="Aucun mandat valide n’est rattaché à cette identité. Les biens d’un autre agent ne sont pas accessibles." /> : <div className="grid gap-4 xl:grid-cols-2">{authorizations.map((auth) => {
      const property = PROPERTIES.find((entry) => entry.id === auth.propertyId);
      if (!property) return null;
      return <WorkspacePanel key={auth.propertyRef} title={property.title} description={`${property.district}, ${property.city} · ${auth.propertyRef}`} icon={House} action={<StatusBadge status="valide" />}>
        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl"><Visual mediaKey={property.media} alt={property.alt} sizes="150px" veil="none" quality={68} className="absolute inset-0 h-full w-full" /></div>
          <div><p className="text-note font-semibold">{formatPropertyPrice(property)}</p><p className="mt-2 text-caption leading-relaxed text-muted">{auth.scope}</p><p className="mt-2 text-caption text-muted">Mandat valable jusqu’au {formatDateOnly(auth.expiresAt)}</p>
            <div className="mt-4 flex flex-wrap gap-2"><Link href={`/biens/${property.id}`} className={BUTTON_SECONDARY}>Ouvrir la fiche<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link href={`/verification-agent?agent=${auth.agentId}&bien=${auth.propertyRef}`} className={BUTTON_SECONDARY}><QrCodeIcon className="h-4 w-4" aria-hidden="true" />Vérification publique</Link></div>
          </div>
        </div>
      </WorkspacePanel>;
    })}</div>}
  </>;
}

function AgentVisits({ authorizedPropertyIds }: { authorizedPropertyIds: ReadonlySet<string> }) {
  const { data, updateData } = useWorkflow();
  const visits = data.visits.filter((visit) => authorizedPropertyIds.has(visit.propertyId)).sort((a, b) => a.date.localeCompare(b.date));
  const updateStatus = (visit: VisitRecord, status: VisitRecord["status"]) => {
    if (!authorizedPropertyIds.has(visit.propertyId)) return;
    updateData((current) => ({
      ...current,
      visits: current.visits.map((entry) => entry.id === visit.id && authorizedPropertyIds.has(entry.propertyId) ? { ...entry, status } : entry),
      notifications: [makeNotification("visite", status === "confirmee" ? "Votre visite est confirmée" : status === "agent-indisponible" ? "Créneau indisponible" : "Visite terminée", `${visit.propertyTitle} · ${formatDateOnly(visit.date)}`, "/agent/visites"), ...current.notifications],
    }));
  };
  return <>
    <WorkspaceHeading eyebrow="Agenda agent" title="Visites autorisées" description="Seules les visites liées à vos autorisations actives sont présentées. Signalez une indisponibilité ou confirmez un créneau." />
    {!visits.length ? <EmptyPanel icon={CalendarDays} title="Aucune visite dans votre agenda" description="Une demande apparaîtra ici lorsqu’un client sollicitera un bien couvert par votre mandat." action={<Link href="/agent/biens" className={BUTTON_SECONDARY}>Voir mes biens autorisés<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /> : <div className="space-y-4">{visits.map((visit) => <WorkspacePanel key={visit.id} title={visit.propertyTitle} description={`${visit.clientName} · ${formatDateOnly(visit.date)} · ${visit.slot} · ${visit.propertyRef}`} icon={CalendarDays} action={<StatusBadge status={visit.status} />}><div className="flex flex-wrap gap-2">{["demande-envoyee", "en-attente"].includes(visit.status) && <><button type="button" onClick={() => updateStatus(visit, "confirmee")} className={BUTTON_PRIMARY}><Check className="h-4 w-4" aria-hidden="true" />Confirmer</button><button type="button" onClick={() => updateStatus(visit, "agent-indisponible")} className={BUTTON_SECONDARY}><XCircle className="h-4 w-4" aria-hidden="true" />Indisponible</button></>}{visit.status === "confirmee" && <button type="button" onClick={() => updateStatus(visit, "terminee")} className={BUTTON_SECONDARY}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Terminer la visite</button>}<Link href={`/biens/${visit.propertyId}`} className="inline-flex min-h-11 items-center gap-2 rounded-btn px-3 text-note font-semibold text-homera-terracotta hover:bg-surface-hover">Fiche du bien<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></WorkspacePanel>)}</div>}
    <div className="mt-6"><DemoNotice>Les réponses modifient uniquement votre espace local. Le demandeur ne recevra pas de SMS ou d’e-mail à ce stade.</DemoNotice></div>
  </>;
}

function AgentClients({ authorizedPropertyIds }: { authorizedPropertyIds: ReadonlySet<string> }) {
  const { data } = useWorkflow();
  const visits = data.visits.filter((visit) => authorizedPropertyIds.has(visit.propertyId));
  return <>
    <WorkspaceHeading eyebrow="Relation client" title="Clients & demandes" description="Retrouvez les personnes rattachées aux visites de vos biens autorisés. Les données sont limitées à ce qui est utile au rendez-vous." />
    {visits.length ? <WorkspacePanel title="Clients liés aux visites" description={`${visits.length} demande(s) sur les mandats actifs`} icon={Users}><div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left text-note"><thead><tr className="border-b border-border text-caption text-muted"><th scope="col" className="pb-3 pr-4 font-semibold">Client</th><th scope="col" className="pb-3 pr-4 font-semibold">Bien autorisé</th><th scope="col" className="pb-3 pr-4 font-semibold">Créneau</th><th scope="col" className="pb-3 pr-4 font-semibold">État</th><th scope="col" className="pb-3 font-semibold">Action</th></tr></thead><tbody>{visits.map((visit) => <tr key={visit.id} className="border-b border-border/70 last:border-0"><td className="py-3 pr-4 font-semibold">{visit.clientName}</td><td className="py-3 pr-4"><span className="block max-w-48 truncate">{visit.propertyTitle}</span><span className="font-mono text-caption text-muted">{visit.propertyRef}</span></td><td className="py-3 pr-4">{formatDateOnly(visit.date)}<span className="block text-caption text-muted">{visit.slot}</span></td><td className="py-3 pr-4"><StatusBadge status={visit.status} /></td><td className="py-3"><Link href="/messages" className="text-caption font-semibold text-homera-terracotta hover:underline">Écrire</Link></td></tr>)}</tbody></table></div></WorkspacePanel> : <EmptyPanel icon={Users} title="Aucun client rattaché" description="Les clients apparaîtront ici après une demande de visite sur un bien autorisé. Les biens non couverts ne seront jamais inclus." />}
  </>;
}

function AgentAuthorizations({ authorizations }: { authorizations: AgentAuthorization[] }) {
  return <>
    <WorkspaceHeading eyebrow="Identité vérifiable" title="Matricule & autorisations" description="Chaque habilitation est attachée à une référence précise, avec une preuve, une date d’effet et une échéance." />
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><InfoTile label="Matricule agent" value={authorizations[0]?.agentId ?? "Non attribué"} icon={FileBadge} /><InfoTile label="Statut" value={authorizations.length ? "Mandats actifs · démo" : "Aucune habilitation"} icon={BadgeCheck} /><InfoTile label="Biens autorisés" value={String(authorizations.length)} icon={House} /></div>
    {!authorizations.length ? <EmptyPanel icon={ShieldCheck} title="Aucune autorisation active" description="Les mandats ne sont affichés que lorsqu’ils sont liés au compte agent, au bien exact et à une période valide." /> : <div className="space-y-4">{authorizations.map((auth) => {
      const property = PROPERTIES.find((entry) => entry.id === auth.propertyId);
      return <WorkspacePanel key={auth.propertyRef} title={property?.title ?? auth.propertyRef} description={`${auth.propertyRef} · ${auth.agency}`} icon={ShieldCheck} action={<StatusBadge status="valide" />}><div className="grid gap-5 lg:grid-cols-[1fr_200px]"><div className="space-y-4"><dl className="grid gap-3 sm:grid-cols-2"><InfoCell label="Agent" value={`${auth.agentName} · ${auth.agentId}`} /><InfoCell label="Mandat" value={auth.proof} /><InfoCell label="Autorisé le" value={formatDateOnly(auth.authorizedAt)} /><InfoCell label="Expiration" value={formatDateOnly(auth.expiresAt)} /><InfoCell label="Périmètre" value={auth.scope} /></dl><div className="flex flex-wrap gap-2"><Link href={`/verification-agent?agent=${auth.agentId}&bien=${auth.propertyRef}`} className={BUTTON_PRIMARY}><ShieldCheck className="h-4 w-4" aria-hidden="true" />Ouvrir la page de vérification</Link><button type="button" onClick={() => downloadAuthorization(auth.propertyRef, auth.agentName, auth.agentId, auth.proof, auth.expiresAt)} className={BUTTON_SECONDARY}><Download className="h-4 w-4" aria-hidden="true" />Télécharger le récapitulatif</button></div></div><QrPanel agentId={auth.agentId} propertyRef={auth.propertyRef} /></div></WorkspacePanel>;
    })}</div>}
    <div className="mt-6"><DemoNotice>Le QR code pointe vers la page publique de vérification. Les justificatifs montrés restent des données d’exemple et ne remplacent pas l’original signé.</DemoNotice></div>
  </>;
}

function QrPanel({ agentId, propertyRef }: { agentId: string; propertyRef: string }) {
  const origin = useSyncExternalStore(subscribeOrigin, getOrigin, () => "https://homera.example");
  const value = `${origin}/verification-agent?agent=${encodeURIComponent(agentId)}&bien=${encodeURIComponent(propertyRef)}`;
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background p-4 text-center"><QrCode value={value} size={128} title={`QR code de vérification ${agentId} · ${propertyRef}`} className="text-homera-brown" /><p className="mt-3 text-caption font-semibold">Vérifier cette autorisation</p><p className="mt-1 max-w-40 break-all font-mono text-micro text-muted">{agentId} · {propertyRef}</p></div>;
}

function AgentDocuments({ authorizations }: { authorizations: AgentAuthorization[] }) {
  return <>
    <WorkspaceHeading eyebrow="Pièces professionnelles" title="Documents agent" description="Vos pièces d’identification et preuves de mandat, chacune reliée au bien concerné." />
    {authorizations.length ? <WorkspacePanel title="Pièces disponibles dans le pilote" description="Les documents visibles sont des métadonnées de démonstration, pas les fichiers signés." icon={FileText}><ul className="divide-y divide-border">{authorizations.map((auth) => <li key={auth.propertyRef} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div className="flex items-start gap-3"><FileCheck2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" /><div><p className="text-note font-semibold">{auth.proof}</p><p className="mt-1 text-caption text-muted">{auth.propertyRef} · valable jusqu’au {formatDateOnly(auth.expiresAt)}</p></div></div><button type="button" onClick={() => downloadAuthorization(auth.propertyRef, auth.agentName, auth.agentId, auth.proof, auth.expiresAt)} className="min-h-10 rounded-btn border border-border px-3 text-caption font-semibold hover:border-homera-terracotta"><Download className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />Récapitulatif</button></li>)}</ul></WorkspacePanel> : <EmptyPanel icon={FileText} title="Aucun document mandaté" description="Les pièces d’autorisation apparaîtront avec un mandat actif attribué à votre identité." />}
    <p className="mt-5 text-caption leading-relaxed text-muted">Les documents originaux doivent être déposés et signés dans un coffre-fort documentaire avant le lancement du service.</p>
  </>;
}

function AgentProfile({ authorizations }: { authorizations: AgentAuthorization[] }) {
  const { account } = useAuth();
  const verificationAuthorization = authorizations[0];
  const name = [account?.prenom, account?.nom].filter(Boolean).join(" ") || "Profil agent";
  const structure = account?.profile.structure || "Aucune structure renseignée";
  const profileItems = account ? describeProfile("agent", account.profile) : [];
  return <>
    <WorkspaceHeading eyebrow="Profil agent" title="Identité professionnelle" description="Votre profil public s’appuie sur un matricule et des autorisations qui peuvent être vérifiés bien par bien." actions={<Link href="/client/parametres" className={BUTTON_SECONDARY}>Modifier mes informations</Link>} />
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <WorkspacePanel title={name} description={structure} icon={UserRound}><dl className="grid gap-3 sm:grid-cols-2"><InfoCell label="Matricule" value={verificationAuthorization?.agentId ?? "En attente d’attribution"} /><InfoCell label="Statut du profil" value={authorizations.length ? "Mandat actif · démonstration" : "Aucune habilitation active"} /><InfoCell label="Autorisations actives" value={`${authorizations.length} bien(s)`} /><InfoCell label="E-mail" value={account?.email || "Non renseigné"} />{profileItems.map((entry) => <InfoCell key={entry.label} label={entry.label} value={entry.value || "À renseigner"} />)}</dl><Link href="/agent/autorisations" className={`${BUTTON_PRIMARY} mt-4`}>Consulter mes mandats<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></WorkspacePanel>
      <WorkspacePanel title="Vérification publique" description="Partagez une page vérifiable attachée au mandat, jamais un accès général à vos annonces." icon={QrCodeIcon}><p className="text-note leading-relaxed text-muted">Une autorisation est valide pour un bien donné, un représentant identifié et une période précise. Le client peut scanner le code ou saisir la référence pour vérifier son état.</p>{verificationAuthorization ? <Link href={`/verification-agent?agent=${verificationAuthorization.agentId}&bien=${verificationAuthorization.propertyRef}`} className={`${BUTTON_SECONDARY} mt-4`}>Prévisualiser la vérification<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link> : <p className="mt-4 text-caption text-muted">Aucune autorisation ne peut être partagée pour ce compte.</p>}</WorkspacePanel>
    </div>
  </>;
}

function InfoTile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof House }) {
  return <div className="rounded-card border border-border bg-card p-4"><Icon className="h-4 w-4 text-homera-terracotta" aria-hidden="true" /><p className="mt-3 text-caption text-muted">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background p-3"><dt className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</dt><dd className="mt-1 break-words text-caption font-medium">{value}</dd></div>;
}

function downloadAuthorization(reference: string, agentName: string, agentId: string, proof: string, expiresAt: string) {
  const text = ["HOMERA — RÉCAPITULATIF D’AUTORISATION (PILOTE)", `Agent : ${agentName} · ${agentId}`, `Bien : ${reference}`, `Preuve déclarée : ${proof}`, `Expire le : ${formatDateOnly(expiresAt)}`, "", "Récapitulatif non signé généré dans le prototype. Vérifiez le mandat original avant toute démarche."].join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `HOMERA-${reference}-autorisation-demo.txt`; anchor.click(); URL.revokeObjectURL(url);
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, (month || 1) - 1, day || 1)));
}

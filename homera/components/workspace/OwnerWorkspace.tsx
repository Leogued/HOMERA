"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, ChevronRight,
  CircleDollarSign, ClipboardList, FilePlus2, FileText, House,
  Plus, ShieldCheck, Users, WalletCards, XCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import { Visual } from "@/components/ui/Visual";
import { PROPERTIES } from "@/lib/content";
import { DEMO_AGENT_AUTHORIZATIONS, DEMO_OWNER_LISTINGS, type DemoOwnerListing } from "@/lib/portal-data";
import {
  createLocalId, LISTING_STATUS_LABELS, makeNotification, nextOwnerListingStatus, type ContractRecord,
  type ListingStatus, type RentalStage, type VisitRecord, type WorkspaceListing,
} from "@/lib/workflow";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice, EmptyPanel, INPUT_CLASS,
  MetricCard, StatusBadge, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";
import { ProfilePage, PreferencesPage } from "@/components/workspace/ProfileSettings";
import { PaymentMethodsWorkspace } from "@/components/workspace/PaymentMethodsPanel";

const OWNER_BASE_PROPERTY_IDS = DEMO_OWNER_LISTINGS.flatMap((item) => item.propertyId ? [item.propertyId] : []);

export function OwnerWorkspace({ section }: { section: string }) {
  switch (section) {
    case "dashboard": return <OwnerDashboard />;
    case "biens": return <OwnerListings />;
    case "demandes": return <OwnerRequests />;
    case "visites": return <OwnerVisits />;
    case "locations": return <OwnerRentalPipeline />;
    case "agents": return <OwnerAgents />;
    case "documents": return <OwnerDocuments />;
    case "abonnement": return <OwnerSubscription />;
    case "profil": return <ProfilePage role="proprietaire" />;
    case "parametres": return <PreferencesPage />;
    default: return <OwnerDashboard />;
  }
}

function OwnerDashboard() {
  const { account } = useAuth();
  const { data } = useWorkflow();
  const liveVisits = data.visits.filter(isOwnedVisit);
  const applications = data.applications;
  const publishedCount = DEMO_OWNER_LISTINGS.filter((item) => (data.listingStatusOverrides[item.id] ?? item.status) === "publie").length + data.listings.filter((item) => (data.listingStatusOverrides[item.id] ?? item.status) === "publie").length;
  const pendingReview = DEMO_OWNER_LISTINGS.filter((item) => ["en-verification", "modification-demandee"].includes(data.listingStatusOverrides[item.id] ?? item.status)).length + data.listings.filter((item) => ["en-verification", "modification-demandee"].includes(data.listingStatusOverrides[item.id] ?? item.status)).length;
  const firstName = account?.prenom || "Propriétaire";
  return <>
    <WorkspaceHeading eyebrow="Espace propriétaire · Cotonou" title={`Bonjour ${firstName}`} description="Un aperçu clair de vos biens, demandes et rendez-vous. Les chiffres de ce pilote sont locaux et illustratifs." actions={<Link href="/proprietaire/ajouter-bien" className={BUTTON_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" />Ajouter un bien</Link>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={House} label="Biens au portefeuille" value={DEMO_OWNER_LISTINGS.length + data.listings.length} detail="Démonstration du portefeuille" /><MetricCard icon={BadgeCheck} label="Publiés" value={publishedCount} detail="Annonces visibles" /><MetricCard icon={ClipboardList} label="Demandes à étudier" value={applications.filter((entry) => ["demande-envoyee", "etude"].includes(entry.stage)).length} detail="Dossiers locatifs" /><MetricCard icon={CalendarDays} label="Visites en cours" value={liveVisits.filter((entry) => !["annulee", "terminee"].includes(entry.status)).length} detail="Créneaux à suivre" /></div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"><WorkspacePanel title="Vue sur vos biens" description={`${pendingReview} dossier${pendingReview === 1 ? "" : "s"} en vérification`} icon={House} action={<Link href="/proprietaire/biens" className="text-caption font-semibold text-homera-terracotta hover:underline">Tout voir</Link>}><ul className="divide-y divide-border">{data.listings.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="text-note font-semibold">{item.title}</p><p className="mt-1 font-mono text-caption text-muted">{item.reference} · {item.city}</p></div><StatusBadge status={data.listingStatusOverrides[item.id] ?? item.status} /></li>)}{DEMO_OWNER_LISTINGS.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="text-note font-semibold">{item.title}</p><p className="mt-1 font-mono text-caption text-muted">{item.reference}</p></div><StatusBadge status={data.listingStatusOverrides[item.id] ?? item.status} /></li>)}</ul></WorkspacePanel><WorkspacePanel title="À traiter" description="Les prochaines actions liées à votre activité." icon={ClipboardList}><div className="space-y-3"><ActionRow href="/proprietaire/demandes" icon={ClipboardList} title="Étudier les candidatures" detail={`${applications.filter((entry) => entry.stage === "etude" || entry.stage === "demande-envoyee").length} demande(s) en attente`} /><ActionRow href="/proprietaire/visites" icon={CalendarDays} title="Confirmer les visites" detail={`${liveVisits.filter((entry) => entry.status === "demande-envoyee" || entry.status === "en-attente").length} créneau(x) à traiter`} /><ActionRow href="/proprietaire/documents" icon={FileText} title="Préparer les contrats" detail="Créer, envoyer et suivre un bail" /></div></WorkspacePanel></div>
    <div className="mt-6"><DemoNotice>Les biens HOM-CTN-000421 à 000423 illustrent les états de l’espace. Les dossiers créés dans le wizard sont conservés localement, sans publication réelle.</DemoNotice></div>
  </>;
}

function OwnerListings() {
  const { data, updateData } = useWorkflow();
  const updateStatus = (id: string, status: ListingStatus) => updateData((current) => ({
    ...current,
    listingStatusOverrides: { ...current.listingStatusOverrides, [id]: status },
    notifications: [makeNotification("propriete", `Statut du bien mis à jour`, `${id} · ${LISTING_STATUS_LABELS[status]}`, "/proprietaire/biens"), ...current.notifications],
  }));
  return <>
    <WorkspaceHeading eyebrow="Votre portefeuille" title="Mes biens" description="Chaque référence conserve son statut de publication, de vérification et de disponibilité." actions={<Link href="/proprietaire/ajouter-bien" className={BUTTON_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" />Ajouter un bien</Link>} />
    <div className="mb-5 flex flex-wrap gap-2">{Object.entries(LISTING_STATUS_LABELS).map(([key, label]) => <span key={key} className="rounded-full border border-border bg-card px-3 py-1.5 text-caption text-muted">{label}</span>)}</div>
    <div className="grid gap-4 xl:grid-cols-2">{DEMO_OWNER_LISTINGS.map((item) => <OwnerListingCard key={item.id} item={item} status={data.listingStatusOverrides[item.id] ?? item.status} onStatus={(status) => updateStatus(item.id, status)} />)}{data.listings.map((item) => <SubmittedListingCard key={item.id} item={item} status={data.listingStatusOverrides[item.id] ?? item.status} onStatus={(status) => updateStatus(item.id, status)} />)}</div>
    <p className="mt-6 text-caption leading-relaxed text-muted">Exemples de référence : <span className="font-mono">HOM-CTN-000421</span>, <span className="font-mono">HOM-CTN-000422</span>, <span className="font-mono">HOM-CTN-000423</span>. Les modifications de statut de cette maquette ne sont pas envoyées à HOMERA.</p>
  </>;
}

function OwnerListingCard({ item, status, onStatus }: { item: DemoOwnerListing; status: ListingStatus; onStatus: (status: ListingStatus) => void }) {
  const property = item.propertyId ? PROPERTIES.find((entry) => entry.id === item.propertyId) : undefined;
  const nextStatus = nextOwnerListingStatus(status);
  const nextLabel = status === "brouillon" ? "Soumettre à vérification" : status === "verifie" ? "Publier l’annonce" : status === "indisponible" ? "Remettre disponible" : "Marquer indisponible";
  return <WorkspacePanel title={item.title} description={`${item.reference} · ${item.district}, ${item.city}`} icon={House} action={<StatusBadge status={status} />}>
    <div className="grid gap-4 sm:grid-cols-[132px_1fr]">{property && <div className="relative aspect-[4/3] overflow-hidden rounded-xl"><Visual mediaKey={property.media} alt={property.alt} sizes="140px" veil="none" quality={68} className="absolute inset-0 h-full w-full" /></div>}<div><p className="text-caption text-muted">{item.note}</p><p className="mt-2 text-note font-semibold">{new Intl.NumberFormat("fr-FR").format(item.price)} FCFA{item.propertyId && property?.pricePeriod ? ` ${property.pricePeriod}` : ""}</p><div className="mt-4 flex flex-wrap gap-2"><Link href={item.propertyId ? `/biens/${item.propertyId}` : `/historique/${item.reference}`} className={BUTTON_SECONDARY}>Voir le dossier<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>{nextStatus ? <button type="button" onClick={() => onStatus(nextStatus)} className={BUTTON_SECONDARY}>{nextLabel}</button> : <span role="status" className="inline-flex min-h-10 items-center rounded-btn border border-border bg-background px-3 text-caption font-medium text-muted">{status === "en-verification" ? "En attente du contrôle HOMERA" : status === "suspendu" ? "Suspendu par HOMERA" : "Bien archivé"}</span>}</div></div></div>
  </WorkspacePanel>;
}

function SubmittedListingCard({ item, status, onStatus }: { item: WorkspaceListing; status: ListingStatus; onStatus: (status: ListingStatus) => void }) {
  const nextStatus = nextOwnerListingStatus(status);
  const nextLabel = status === "brouillon" ? "Soumettre à vérification" : status === "verifie" ? "Publier l’annonce" : status === "indisponible" ? "Remettre disponible" : "Marquer indisponible";
  return <WorkspacePanel title={item.title} description={`${item.reference} · ${item.city}${item.district ? `, ${item.district}` : ""}`} icon={House} action={<StatusBadge status={status} />}>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-note text-muted">{item.intent === "louer" ? `${new Intl.NumberFormat("fr-FR").format(item.price)} FCFA / mois` : `${new Intl.NumberFormat("fr-FR").format(item.price)} FCFA`}</p><span className="text-caption text-muted">Soumis le {formatDate(item.submittedAt)}</span></div>
    <p className="mt-3 text-caption leading-relaxed text-muted">Photos : {item.photoNames.length} · Pièces : {item.documentNames.length} · {item.status === "en-verification" ? "statut initial soumis au contrôle" : "dossier local"}</p>
    <div className="mt-4 flex flex-wrap gap-2">{status === "modification-demandee" ? <Link href={`/proprietaire/ajouter-bien?modifier=${encodeURIComponent(item.id)}`} className={BUTTON_PRIMARY}>Corriger le dossier<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link> : nextStatus ? <button type="button" onClick={() => onStatus(nextStatus)} className={BUTTON_SECONDARY}>{nextLabel}</button> : <span role="status" className="inline-flex min-h-10 items-center rounded-btn border border-border bg-background px-3 text-caption font-medium text-muted">{status === "en-verification" ? "En attente du contrôle HOMERA" : status === "suspendu" ? "Suspendu par HOMERA" : "Bien archivé"}</span>}</div>
  </WorkspacePanel>;
}

function OwnerRequests() {
  const { data, updateData } = useWorkflow();
  const updateStage = (id: string, stage: RentalStage) => updateData((current) => {
    const request = current.applications.find((entry) => entry.id === id);
    return {
      ...current,
      applications: current.applications.map((entry) => entry.id === id ? { ...entry, stage } : entry),
      notifications: request ? [makeNotification("demande", `Dossier mis à jour · ${stageLabel(stage)}`, request.propertyTitle, "/proprietaire/demandes"), ...current.notifications] : current.notifications,
    };
  });
  return <>
    <WorkspaceHeading eyebrow="Candidatures reçues" title="Demandes de location" description="Étudiez les dossiers issus d’une visite terminée, puis consignez une décision avant de préparer le contrat." />
    {data.applications.length ? <div className="space-y-4">{data.applications.map((application) => <WorkspacePanel key={application.id} title={application.propertyTitle} description={`${application.propertyRef} · déposée le ${formatDate(application.submittedAt)}`} icon={ClipboardList} action={<StatusBadge status={application.stage} />}><dl className="grid gap-3 sm:grid-cols-3"><InfoCell label="Dossier" value={application.id} /><InfoCell label="Revenu déclaré" value={application.monthlyIncome ? `${application.monthlyIncome} FCFA / mois` : "Non renseigné"} /><InfoCell label="Visite liée" value={application.visitId} /></dl>{application.message && <p className="mt-4 rounded-xl bg-background p-3 text-note leading-relaxed">« {application.message} »</p>}<div className="mt-4 flex flex-wrap gap-2">{application.stage !== "acceptee" && <button type="button" onClick={() => updateStage(application.id, "acceptee")} className={BUTTON_PRIMARY}><Check className="h-4 w-4" aria-hidden="true" />Accepter</button>}{application.stage !== "refusee" && <button type="button" onClick={() => updateStage(application.id, "refusee")} className={BUTTON_SECONDARY}><XCircle className="h-4 w-4" aria-hidden="true" />Refuser</button>}{application.stage === "acceptee" && <Link href="/proprietaire/documents" className={BUTTON_SECONDARY}><FileText className="h-4 w-4" aria-hidden="true" />Préparer le contrat</Link>}</div></WorkspacePanel>)}</div> : <EmptyPanel icon={ClipboardList} title="Aucune demande reçue" description="Les candidatures apparaîtront ici après la fin d’une visite et la soumission d’un dossier par un client." action={<Link href="/proprietaire/visites" className={BUTTON_SECONDARY}>Voir les visites<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />}
  </>;
}

function OwnerVisits() {
  const { data, updateData } = useWorkflow();
  const visits = data.visits.filter(isOwnedVisit);
  const setStatus = (visit: VisitRecord, status: VisitRecord["status"]) => updateData((current) => ({
    ...current,
    visits: current.visits.map((entry) => entry.id === visit.id ? { ...entry, status } : entry),
    notifications: [makeNotification("visite", status === "confirmee" ? "Visite confirmée" : status === "agent-indisponible" ? "Créneau indisponible" : "Visite terminée", `${visit.propertyTitle} · ${formatDateOnly(visit.date)}`, "/proprietaire/visites"), ...current.notifications],
  }));
  return <>
    <WorkspaceHeading eyebrow="Agenda propriétaire" title="Visites" description="Confirmez les créneaux proposés et consignez la fin ou l’indisponibilité d’une visite." />
    {!visits.length ? <EmptyPanel icon={CalendarDays} title="Aucune visite à traiter" description="Les demandes liées à votre portefeuille s’afficheront ici avec le créneau souhaité et le statut de réponse." action={<Link href="/proprietaire/biens" className={BUTTON_SECONDARY}>Voir mes biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /> : <div className="space-y-4">{visits.map((visit) => <WorkspacePanel key={visit.id} title={visit.propertyTitle} description={`${visit.clientName} · ${formatDateOnly(visit.date)} · ${visit.slot} · ${visit.propertyRef}`} icon={CalendarDays} action={<StatusBadge status={visit.status} />}><div className="flex flex-wrap gap-2">{["demande-envoyee", "en-attente"].includes(visit.status) && <><button type="button" onClick={() => setStatus(visit, "confirmee")} className={BUTTON_PRIMARY}><Check className="h-4 w-4" aria-hidden="true" />Confirmer le créneau</button><button type="button" onClick={() => setStatus(visit, "agent-indisponible")} className={BUTTON_SECONDARY}>Indisponible</button></>}{visit.status === "confirmee" && <button type="button" onClick={() => setStatus(visit, "terminee")} className={BUTTON_SECONDARY}>Marquer la visite terminée</button>}<Link href={`/biens/${visit.propertyId}`} className="inline-flex min-h-11 items-center gap-2 rounded-btn px-3 text-note font-semibold text-homera-terracotta hover:bg-surface-hover">Ouvrir le bien<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></WorkspacePanel>)}</div>}
  </>;
}

function OwnerRentalPipeline() {
  const { data } = useWorkflow();
  const stages: RentalStage[] = ["demande-envoyee", "etude", "acceptee", "refusee", "contrat", "signature", "preparation-cles", "recuperation", "active"];
  return <>
    <WorkspaceHeading eyebrow="Après la visite" title="Locations & baux" description="Visualisez les candidatures, contrats et étapes qui suivent l’acceptation d’un dossier." />
    <div className="grid gap-4 sm:grid-cols-3">{stages.map((stage) => <div key={stage} className="rounded-card border border-border bg-card p-4"><p className="text-caption font-semibold text-muted">{stageLabel(stage)}</p><p className="homera-num mt-2 font-serif text-display-xs">{data.applications.filter((application) => application.stage === stage).length}</p></div>)}</div>
    <WorkspacePanel title="Dossiers suivis" description="Le détail de chaque parcours reste consultable dans les demandes." icon={WalletCards} className="mt-6">{data.applications.length ? <ul className="divide-y divide-border">{data.applications.map((application) => <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="text-note font-semibold">{application.propertyTitle}</p><p className="mt-1 font-mono text-caption text-muted">{application.propertyRef} · {application.id}</p></div><div className="flex items-center gap-2"><StatusBadge status={application.stage} /><Link href="/proprietaire/demandes" aria-label={`Ouvrir la demande ${application.id}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-homera-terracotta"><ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></div></li>)}</ul> : <p className="text-note leading-relaxed text-muted">Aucun dossier actif. Une candidature apparaîtra après une visite terminée.</p>}</WorkspacePanel>
  </>;
}

function OwnerAgents() {
  const agents = DEMO_AGENT_AUTHORIZATIONS;
  const unique = Array.from(new Map(agents.map((item) => [item.agentId, item])).values());
  return <>
    <WorkspaceHeading eyebrow="Représentants mandatés" title="Agents autorisés" description="L’agent n’a accès qu’aux biens couverts par une autorisation explicite et valide." />
    <WorkspacePanel title="Agents rattachés au portefeuille" description="Les accès présentés ci-dessous sont des données de démonstration." icon={Users}>
      <ul className="space-y-3">{unique.map((agent) => <li key={agent.agentId} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-homera-cream-dark font-serif text-body-sm text-homera-brown">{agent.agentName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><p className="font-semibold">{agent.agentName}</p><p className="mt-1 text-caption text-muted">{agent.agency} · {agent.agentId}</p><p className="mt-1 text-caption text-muted">{agents.filter((item) => item.agentId === agent.agentId && item.status === "active").length} autorisations actives</p></div></div><Link href={`/verification-agent?agent=${agent.agentId}&bien=${agents.find((item) => item.agentId === agent.agentId)?.propertyRef}`} className={BUTTON_SECONDARY}>Vérifier une autorisation<ShieldCheck className="h-4 w-4" aria-hidden="true" /></Link></li>)}</ul>
    </WorkspacePanel>
    <p className="mt-5 text-caption leading-relaxed text-muted">Le retrait ou l’émission d’un mandat devra être signé, horodaté et enregistré côté serveur avant mise en production.</p>
  </>;
}

function OwnerDocuments() {
  const { data, updateData } = useWorkflow();
  const contractByApplication = new Map(data.contracts.map((contract) => [contract.applicationId, contract]));
  const accepted = data.applications.filter((application) => application.stage === "acceptee" || application.stage === "contrat" || application.stage === "signature" || application.stage === "preparation-cles" || application.stage === "recuperation" || application.stage === "active");

  const createDraft = (applicationId: string) => {
    const application = data.applications.find((entry) => entry.id === applicationId);
    if (!application) return;
    const property = PROPERTIES.find((entry) => entry.id === application.propertyId);
    const now = new Date().toISOString();
    const contract: ContractRecord = {
      id: createLocalId("contrat"), applicationId: application.id, propertyId: application.propertyId,
      propertyRef: application.propertyRef, propertyTitle: application.propertyTitle,
      status: "brouillon", rent: property?.price ?? 0, duration: "12 mois", updatedAt: now,
      clauses: "Les modalités finales doivent être relues et validées par les parties avant signature.",
    };
    updateData((current) => ({ ...current, contracts: [contract, ...current.contracts], applications: current.applications.map((entry) => entry.id === application.id ? { ...entry, stage: "contrat" } : entry) }));
  };

  const saveContract = (id: string, values: Pick<ContractRecord, "rent" | "duration" | "clauses">) => updateData((current) => ({ ...current, contracts: current.contracts.map((entry) => entry.id === id && entry.status === "brouillon" ? { ...entry, ...values, updatedAt: new Date().toISOString() } : entry) }));
  const sendContract = (contract: ContractRecord) => updateData((current) => ({
    ...current,
    contracts: current.contracts.map((entry) => entry.id === contract.id && entry.status === "brouillon" ? { ...entry, status: "envoye", sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : entry),
    applications: current.applications.map((entry) => entry.id === contract.applicationId ? { ...entry, stage: "contrat" } : entry),
    notifications: [makeNotification("contrat", "Contrat envoyé au client", contract.propertyTitle, "/proprietaire/documents"), ...current.notifications],
  }));

  return <>
    <WorkspaceHeading eyebrow="Documents & contrats" title="Préparer un contrat" description="Créez un brouillon après acceptation d’une candidature. Les champs restent modifiables avant l’envoi ; après signature, le brouillon est verrouillé." />
    <WorkspacePanel title="Dossiers acceptés" description="Une candidature acceptée peut recevoir un contrat de location." icon={FilePlus2}>
      {accepted.length ? <ul className="space-y-3">{accepted.map((application) => {
        const contract = contractByApplication.get(application.id);
        return <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"><div><p className="text-note font-semibold">{application.propertyTitle}</p><p className="mt-1 text-caption text-muted">{application.propertyRef} · dossier {application.id}</p></div>{contract ? <span className="flex items-center gap-2"><StatusBadge status={contract.status} /><Link href={`/client/contrats/${contract.id}`} className="text-caption font-semibold text-homera-terracotta hover:underline">Aperçu client</Link></span> : <button type="button" onClick={() => createDraft(application.id)} className={BUTTON_PRIMARY}>Créer le brouillon<FileText className="h-4 w-4" aria-hidden="true" /></button>}</li>;
      })}</ul> : <p className="text-note leading-relaxed text-muted">Aucun dossier accepté. Acceptez d’abord une candidature dans « Demandes » pour préparer un bail.</p>}
    </WorkspacePanel>
    {data.contracts.length > 0 && <div className="mt-6 space-y-4"><h2 className="font-serif text-display-xs">Documents en cours</h2>{data.contracts.map((contract) => <ContractEditor key={contract.id} contract={contract} onSave={saveContract} onSend={() => sendContract(contract)} />)}</div>}
    <div className="mt-6"><DemoNotice>Les modèles, contrats et statuts sont illustratifs. Aucun fichier légal n’est généré ni transmis; la signature doit être réalisée dans un service conforme avant production.</DemoNotice></div>
  </>;
}

function ContractEditor({ contract, onSave, onSend }: { contract: ContractRecord; onSave: (id: string, values: Pick<ContractRecord, "rent" | "duration" | "clauses">) => void; onSend: () => void }) {
  const [rent, setRent] = useState(String(contract.rent));
  const [duration, setDuration] = useState(contract.duration);
  const [clauses, setClauses] = useState(contract.clauses);
  const editable = contract.status === "brouillon";
  return <WorkspacePanel title={contract.propertyTitle} description={`${contract.propertyRef} · contrat ${contract.id}`} icon={FileText} action={<StatusBadge status={contract.status} />}>
    <div className="grid gap-4 sm:grid-cols-2"><label htmlFor={`rent-${contract.id}`} className="space-y-1.5 text-caption font-semibold text-foreground">Loyer mensuel (FCFA)<input id={`rent-${contract.id}`} type="text" inputMode="numeric" value={rent} disabled={!editable} onChange={(event) => setRent(event.target.value.replace(/[^\d]/g, ""))} className={`${INPUT_CLASS} disabled:opacity-60`} /></label><label htmlFor={`duration-${contract.id}`} className="space-y-1.5 text-caption font-semibold text-foreground">Durée<input id={`duration-${contract.id}`} value={duration} disabled={!editable} onChange={(event) => setDuration(event.target.value)} className={`${INPUT_CLASS} disabled:opacity-60`} /></label></div>
    <label htmlFor={`clauses-${contract.id}`} className="mt-4 block text-caption font-semibold">Clauses particulières</label><textarea id={`clauses-${contract.id}`} rows={3} disabled={!editable} value={clauses} onChange={(event) => setClauses(event.target.value)} className={`${INPUT_CLASS} mt-1 resize-y py-3 disabled:opacity-60`} />
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-caption text-muted">Dernière modification : {formatDate(contract.updatedAt)}</p><div className="flex flex-wrap gap-2">{editable && <button type="button" onClick={() => onSave(contract.id, { rent: Number(rent.replace(/\D/g, "")) || 0, duration: duration.trim() || "À définir", clauses: clauses.trim() })} className={BUTTON_SECONDARY}>Enregistrer le brouillon</button>}{editable && <button type="button" onClick={() => { onSave(contract.id, { rent: Number(rent.replace(/\D/g, "")) || 0, duration: duration.trim() || "À définir", clauses: clauses.trim() }); onSend(); }} disabled={!Number(rent)} className={`${BUTTON_PRIMARY} disabled:cursor-not-allowed disabled:opacity-45`}>Envoyer au client<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>}{!editable && <Link href={`/client/contrats/${contract.id}`} className={BUTTON_SECONDARY}>Consulter le statut<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}</div></div>
  </WorkspacePanel>;
}

function OwnerSubscription() {
  const [plan, setPlan] = useState("essentiel");
  const plans = [
    { id: "essentiel", name: "Essentiel", price: "0", description: "Publier un premier dossier et suivre les étapes du pilote." },
    { id: "gestion", name: "Gestion", price: "Sur devis", description: "Accompagnement de la gestion locative et des interventions." },
    { id: "portefeuille", name: "Portefeuille", price: "Sur devis", description: "Suivi multi-biens, équipe et reporting propriétaire." },
  ];
  const selectedPlan = plans.find((entry) => entry.id === plan) ?? plans[0];
  return <>
    <WorkspaceHeading eyebrow="Services propriétaires & encaissements" title="Abonnement & moyens de paiement" description="Choisissez votre formule d’accompagnement et configurez vos comptes Mobile Money, carte ou RIB UEMOA pour vos encaissements de loyers." />
    <div className="grid gap-4 lg:grid-cols-3">{plans.map((entry) => <article key={entry.id} className={`rounded-card border bg-card p-5 shadow-[var(--shadow-card)] ${plan === entry.id ? "border-homera-terracotta/50 ring-1 ring-homera-terracotta/30" : "border-border"}`}><p className="text-caption font-semibold uppercase tracking-[0.14em] text-homera-terracotta">{entry.name}</p><p className="mt-3 font-serif text-display-sm">{entry.price === "0" ? "Gratuit" : entry.price}</p><p className="mt-3 min-h-12 text-caption leading-relaxed text-muted">{entry.description}</p><button type="button" onClick={() => setPlan(entry.id)} aria-pressed={plan === entry.id} className={`${plan === entry.id ? BUTTON_PRIMARY : BUTTON_SECONDARY} mt-5 w-full`}>{plan === entry.id ? "Offre sélectionnée" : "Choisir cette offre"}</button></article>)}</div>
    <WorkspacePanel title={`Formule active : ${selectedPlan.name}`} description="Aucun prélèvement bancaire ni Mobile Money réel n’est exécuté dans ce pilote." icon={CircleDollarSign} className="mt-6 mb-6"><p className="text-note leading-relaxed text-muted">{plan === "essentiel" ? "L’offre Essentiel vous permet de déposer gratuitement vos dossiers de biens et de suivre leur contrôle documentaire dans ce navigateur." : `L’offre ${selectedPlan.name} fait l’objet d’un cadrage sur mesure (nombre de lots, suivi locatif, maintenance). Échangez avec l’équipe HOMERA pour définir le périmètre.`}</p><div className="mt-4 flex flex-wrap gap-3">{plan === "essentiel" ? <Link href="/proprietaire/ajouter-bien" className={BUTTON_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" />Déposer un bien</Link> : <Link href="/contact?sujet=gestion" className={BUTTON_PRIMARY}>Demander un devis {selectedPlan.name}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}<Link href="/services/gestion-immobiliere" className={BUTTON_SECONDARY}>Découvrir la gestion HOMERA</Link></div></WorkspacePanel>
    <PaymentMethodsWorkspace contextRole="proprietaire" embedded />
  </>;
}

function ActionRow({ href, icon: Icon, title, detail }: { href: string; icon: typeof House; title: string; detail: string }) {
  return <Link href={href} className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-homera-terracotta/40 hover:bg-surface-hover"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-homera-terracotta"><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-note font-semibold">{title}</span><span className="mt-0.5 block text-caption text-muted">{detail}</span></span><ChevronRight className="h-4 w-4 text-muted transition-colors group-hover:text-homera-terracotta" aria-hidden="true" /></Link>;
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background p-3"><p className="text-micro font-semibold uppercase tracking-[0.14em] text-muted">{label}</p><p className="mt-1 break-words text-caption font-medium">{value}</p></div>;
}
function isOwnedVisit(visit: VisitRecord): boolean {
  return OWNER_BASE_PROPERTY_IDS.includes(visit.propertyId) || PROPERTIES.some((property) => property.id === visit.propertyId && DEMO_OWNER_LISTINGS.some((item) => item.propertyId === property.id));
}
function stageLabel(stage: RentalStage): string {
  const labels: Record<RentalStage, string> = { "demande-envoyee": "Demande envoyée", etude: "Étude", acceptee: "Acceptée", refusee: "Refusée", contrat: "Contrat", signature: "Signature", "preparation-cles": "Préparation des clés", recuperation: "Récupération", active: "Location active" };
  return labels[stage];
}
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, (month || 1) - 1, day || 1)));
}

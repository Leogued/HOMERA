"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, CircleDollarSign, FilePlus2, FileText, Plus, WalletCards } from "lucide-react";
import { useWorkflow } from "@/components/providers/WorkflowProvider";

import {
  createLocalId, makeNotification, type ContractRecord,
  type RentalStage,
} from "@/lib/workflow";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice, INPUT_CLASS,
  StatusBadge, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";
import { ProfilePage, PreferencesPage } from "@/components/workspace/ProfileSettings";
import { PaymentMethodsWorkspace } from "@/components/workspace/PaymentMethodsPanel";
import { OwnerAgents, OwnerDashboard, OwnerListings } from "@/components/workspace/OwnerServerSections";
import { VisitsList } from "@/components/workspace/VisitsSections";
import { ApplicationsList } from "@/components/workspace/ApplicationSections";
import { PROPERTIES } from "@/lib/content";


export function OwnerWorkspace({ section }: { section: string }) {
  switch (section) {
    case "dashboard": return <OwnerDashboard />;
    case "biens": return <OwnerListings />;
    case "demandes":
      return <ApplicationsList viewpoint="proprietaire" title="Candidatures de location" description="Candidatures déposées après visite sur vos biens. Acceptez ou refusez : le motif d’un refus est transmis au candidat et conservé." />;
    case "visites":
      return <VisitsList viewpoint="proprietaire" title="Visites de vos biens" description="Confirmez, reprogrammez ou refusez les créneaux demandés. Chaque réponse est consignée et notifiée au client." />;
    case "locations": return <OwnerRentalPipeline />;
    case "agents": return <OwnerAgents />;
    case "documents": return <OwnerDocuments />;
    case "abonnement": return <OwnerSubscription />;
    case "profil": return <ProfilePage role="proprietaire" />;
    case "parametres": return <PreferencesPage />;
    default: return <OwnerDashboard />;
  }
}

function OwnerRentalPipeline() {
  const { data } = useWorkflow();
  const stages: RentalStage[] = ["demande-envoyee", "etude", "acceptee", "refusee", "contrat", "signature", "preparation-cles", "recuperation", "active"];
  return <>
    <WorkspaceHeading eyebrow="Après la visite" title="Locations, baux & revenus" description="Visualisez les candidatures, contrats, encaissements loyers/cautions et retraits qui suivent l’acceptation d’un dossier." />
    <div className="grid gap-4 sm:grid-cols-3">{stages.map((stage) => <div key={stage} className="rounded-card border border-border bg-card p-4"><p className="text-caption font-semibold text-muted">{stageLabel(stage)}</p><p className="homera-num mt-2 font-serif text-display-xs">{data.applications.filter((application) => application.stage === stage).length}</p></div>)}</div>
    <WorkspacePanel title="Dossiers suivis" description="Le détail de chaque parcours reste consultable dans les demandes." icon={WalletCards} className="mt-6">{data.applications.length ? <ul className="divide-y divide-border">{data.applications.map((application) => <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="text-note font-semibold">{application.propertyTitle}</p><p className="mt-1 font-mono text-caption text-muted">{application.propertyRef} · {application.id}</p></div><div className="flex items-center gap-2"><StatusBadge status={application.stage} /><Link href="/proprietaire/demandes" aria-label={`Ouvrir la demande ${application.id}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-homera-terracotta"><ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></div></li>)}</ul> : <p className="text-note leading-relaxed text-muted">Aucun dossier actif. Une candidature apparaîtra après une visite terminée.</p>}</WorkspacePanel>
    <div className="mt-8"><PaymentMethodsWorkspace contextRole="proprietaire" embedded /></div>
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

function stageLabel(stage: RentalStage): string {
  const labels: Record<RentalStage, string> = { "demande-envoyee": "Demande envoyée", etude: "Étude", acceptee: "Acceptée", refusee: "Refusée", contrat: "Contrat", signature: "Signature", "preparation-cles": "Préparation des clés", recuperation: "Récupération", active: "Location active" };
  return labels[stage];
}
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

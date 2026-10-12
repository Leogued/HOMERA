"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CalendarCheck2, CalendarDays, Check,
  CheckCircle2, ClipboardCheck, Clock3, Download,
  FileText, Home, Loader2, MapPin,
} from "lucide-react";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import { Visual } from "@/components/ui/Visual";
import {
  canClientPayContract,
  computeFinancialBreakdown,
  createLocalId,
  makeNotification,
  PAYMENT_PROVIDERS,
  type ContractRecord,
  type PaymentTransactionRecord,
} from "@/lib/workflow";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice, EmptyPanel, FormField,
  INPUT_CLASS, StatusBadge, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";
import { PaymentMethodsWorkspace } from "@/components/workspace/PaymentMethodsPanel";
import { apiPost, messageOf } from "@/lib/api-client";
import { useServerResource } from "@/lib/use-server-resource";
import { formatDay, VisitsList, type ServerVisit } from "@/components/workspace/VisitsSections";
import { ApplicationsList, RentalRequestForm as ServerRentalRequestForm } from "@/components/workspace/ApplicationSections";

const VISIT_SLOTS = ["09:00 – 11:00", "11:00 – 13:00", "14:00 – 16:00", "16:00 – 18:00"];
const VISIT_STEPS = ["Le bien", "Date & créneau", "Confirmation"];

export function VisitScheduler({ initialPropertyId = "" }: { initialPropertyId?: string }) {
  const properties = useServerResource<{ items: { id: string; title: string; reference: string; city: string; availabilityStatus: string }[] }>("/api/properties?disponible=1&tri=pertinence");
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ServerVisit | null>(null);

  const catalogue = properties.data?.items ?? [];
  const property = catalogue.find((entry) => entry.id === propertyId) ?? null;

  const continueStep = () => {
    if (step === 0 && !property) {
      setError("Choisissez un bien avant de continuer.");
      return;
    }
    if (step === 1 && (!date || !slot)) {
      setError("Choisissez une date et un créneau pour demander la visite.");
      return;
    }
    setError("");
    setStep((current) => Math.min(2, current + 1));
  };

  const requestVisit = async () => {
    if (!property || !date || !slot) return;
    setBusy(true);
    setError("");
    const result = await apiPost<{ visit: ServerVisit }>("/api/visits", {
      propertyId: property.id,
      date,
      time: slot.slice(0, 5),
      message,
      durationMin: 45,
    });
    setBusy(false);
    if (!result.ok) {
      setError(messageOf(result));
      return;
    }
    setCreated(result.data.visit);
  };

  if (created) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-card border border-success/25 bg-card p-6 text-center shadow-[var(--shadow-card)] sm:p-10" role="status" aria-live="polite">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success"><CheckCircle2 className="h-8 w-8" aria-hidden="true" /></span>
          <p className="mt-5 text-caption font-semibold uppercase tracking-[0.18em] text-success">Demande enregistrée</p>
          <h1 className="mt-2 font-serif text-display-sm">Votre demande de visite est envoyée</h1>
          <p className="mx-auto mt-3 max-w-xl text-body-sm leading-relaxed text-muted">Elle est enregistrée sur les serveurs HOMERA sous la référence {created.reference}. Le propriétaire ou l’agent mandaté doit confirmer le créneau : vous serez notifié de sa réponse, et le rendez-vous restera en attente d’ici là.</p>
          <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-border bg-background p-4 text-left">
            <p className="font-semibold">{created.propertyTitle}</p>
            <p className="mt-1 text-note text-muted">{formatDay(created.date)} · {created.time}</p>
            <p className="mt-2 font-mono text-caption text-muted">{created.propertyReference} · {created.reference}</p>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/client/visites" className={BUTTON_PRIMARY}>Voir mes visites</Link><Link href={`/biens/${created.propertyId}`} className={BUTTON_SECONDARY}>Retour au bien</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <WorkspaceHeading eyebrow="Parcours de visite" title="Demander une visite" description="Choisissez le bien, proposez une date et un créneau. Le rendez-vous restera en attente jusqu’à la réponse du propriétaire ou de l’agent mandaté." actions={<Link href="/client/visites" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mes visites</Link>} />
      <ol aria-label="Étapes de la demande de visite" className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
        {VISIT_STEPS.map((label, index) => <li key={label} className={`flex items-center gap-2 border-b-2 pb-3 text-caption sm:gap-3 ${index <= step ? "border-homera-terracotta text-foreground" : "border-border text-muted"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-semibold ${index < step ? "bg-success text-white" : index === step ? "bg-homera-brown text-white" : "bg-surface-hover"}`}>{index < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : `0${index + 1}`}</span><span className="font-semibold">{label}</span></li>)}
      </ol>
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.06] px-4 py-3 text-note text-error">{error}</p>}
      {properties.loading && <p className="mb-4 flex items-center gap-2 text-note text-muted" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Chargement des biens disponibles…</p>}

      {step === 0 && <WorkspacePanel title="Quel bien souhaitez-vous visiter ?" description="Seuls les biens publiés et disponibles peuvent recevoir une demande de visite." icon={Home}>
        <div className="grid gap-5 md:grid-cols-[1fr_1.15fr] md:items-start">
          <FormField label="Bien à visiter" name="visit-property" required>
            <select id="visit-property" value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setError(""); }} className={INPUT_CLASS}>
              <option value="">Sélectionner un bien</option>
              {catalogue.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {entry.city} · {entry.reference}</option>)}
            </select>
          </FormField>
          {property ? <PublicPropertyMiniCard property={property} /> : <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-border px-4 text-center text-caption text-muted">La fiche du bien sélectionné s’affichera ici.</div>}
        </div>
      </WorkspacePanel>}
      {step === 1 && <WorkspacePanel title="Proposez votre disponibilité" description="La date choisie est une préférence, pas encore un rendez-vous confirmé." icon={CalendarDays}>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Date souhaitée" name="visit-date" hint="Les créneaux sont proposés en heure locale du Bénin." required>
            <input id="visit-date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} className={INPUT_CLASS} />
          </FormField>
          <FormField label="Créneau souhaité" name="visit-slot" required>
            <select id="visit-slot" value={slot} onChange={(event) => setSlot(event.target.value)} className={INPUT_CLASS}><option value="">Choisir un créneau</option>{VISIT_SLOTS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </FormField>
        </div>
        <label className="mt-5 block text-caption font-semibold" htmlFor="visit-message">Message (facultatif)
          <textarea id="visit-message" rows={2} maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} className={`${INPUT_CLASS} mt-1`} placeholder="Précisions utiles au rendez-vous." />
        </label>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-info/[0.06] p-4 text-caption leading-relaxed text-muted"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />Le représentant confirmera ou proposera un autre créneau. N’effectuez aucun paiement avant la confirmation d’un rendez-vous par les canaux officiels HOMERA.</p>
      </WorkspacePanel>}
      {step === 2 && <WorkspacePanel title="Vérifiez votre demande" description="Prenez un instant pour vérifier que les informations sont exactes." icon={ClipboardCheck}>
        {property ? <div className="grid gap-5 md:grid-cols-[220px_1fr]"><PublicPropertyMiniCard property={property} large /><dl className="grid gap-3 sm:grid-cols-2"><SummaryItem label="Bien" value={property.title} /><SummaryItem label="Référence" value={property.reference} /><SummaryItem label="Date souhaitée" value={formatDay(date)} /><SummaryItem label="Créneau" value={slot} /><SummaryItem label="État après envoi" value="Demandée · en attente de réponse" /></dl></div> : <p className="text-note text-error">Le bien n’est plus disponible dans le catalogue. Revenez à l’étape précédente.</p>}
      </WorkspacePanel>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => { setError(""); setStep((current) => Math.max(0, current - 1)); }} disabled={step === 0} className="min-h-11 rounded-btn px-4 text-note font-semibold text-muted hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="mr-2 inline h-4 w-4" aria-hidden="true" />Précédent</button>
        {step < 2 ? <button type="button" onClick={continueStep} disabled={step === 2} className={BUTTON_PRIMARY}>Continuer<ArrowRight className="h-4 w-4" aria-hidden="true" /></button> : <button type="button" onClick={() => void requestVisit()} disabled={!property || !slot || !date || busy} className={`${BUTTON_PRIMARY} disabled:opacity-60`}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Envoyer ma demande<CalendarCheck2 className="h-4 w-4" aria-hidden="true" /></button>}
      </div>
    </div>
  );
}

export function ClientVisits() {
  return (
    <>
      <p className="mb-6 flex flex-wrap justify-end"><Link href="/client/visites/nouvelle" className={BUTTON_PRIMARY}><CalendarDays className="h-4 w-4" aria-hidden="true" />Demander une visite</Link></p>
      <VisitsList viewpoint="client" title="Mes visites" description="Vos demandes, leurs confirmations et leurs reprogrammations, telles que le serveur HOMERA les a enregistrées." />
    </>
  );
}

export function RentalRequestForm({ initialVisitId = "" }: { initialVisitId?: string }) {
  return <ServerRentalRequestForm initialVisitId={initialVisitId} />;
}

export function ClientApplications() {
  return <ApplicationsList viewpoint="client" title="Mes demandes" description="Du dépôt de votre dossier à la décision du propriétaire, chaque changement de statut est enregistré ici et notifié." />;
}

export function ClientContracts() {
  const { data } = useWorkflow();
  return <>
    <WorkspaceHeading eyebrow="Documents de location & règlements" title="Mes contrats & moyens de paiement" description="Consultez les contrats envoyés, téléchargez une copie imprimable, suivez la signature et gérez vos moyens de paiement." actions={<Link href="/client/paiements" className={BUTTON_SECONDARY}>Moyens de paiement<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
    {data.contracts.length ? <ul className="mb-8 grid gap-4 md:grid-cols-2">{data.contracts.map((contract) => <li key={contract.id}><ContractCard contract={contract} /></li>)}</ul> : <div className="mb-8"><EmptyPanel icon={FileText} title="Aucun contrat transmis" description="Lorsqu’une demande de location sera acceptée et qu’un contrat vous sera envoyé, vous pourrez le consulter et le signer ici." action={<Link href="/client/demandes" className={BUTTON_SECONDARY}>Voir mes demandes<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /></div>}
    <PaymentMethodsWorkspace contextRole="client" embedded />
  </>;
}

function ContractCard({ contract }: { contract: ContractRecord }) {
  return <WorkspacePanel title={contract.propertyTitle} description={`${contract.propertyRef} · ${contract.duration}`} icon={FileText} action={<StatusBadge status={contract.status} />}><p className="text-caption text-muted">Loyer mensuel <strong className="homera-num text-foreground">{formatMoney(contract.rent)} FCFA</strong></p><Link href={`/client/contrats/${contract.id}`} className="mt-4 inline-flex min-h-10 items-center gap-2 text-note font-semibold text-homera-terracotta hover:underline">Ouvrir le contrat<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></WorkspacePanel>;
}

export function ClientContractReader({ contractId }: { contractId: string }) {
  const { data, updateData } = useWorkflow();
  const [accepted, setAccepted] = useState(false);
  const [signed, setSigned] = useState(false);
  const [paidFeedback, setPaidFeedback] = useState("");
  const contract = data.contracts.find((entry) => entry.id === contractId);
  const application = contract ? data.applications.find((entry) => entry.id === contract.applicationId) : undefined;
  const defaultMethod = data.paymentMethods.find((entry) => entry.isDefault) ?? data.paymentMethods[0];
  if (!contract) return <div className="mx-auto max-w-3xl py-8"><WorkspaceHeading eyebrow="Contrat" title="Document introuvable" description="Aucun contrat local ne correspond à cette adresse." /><EmptyPanel icon={FileText} title="Le contrat n’est pas disponible" description="Il peut avoir été supprimé du stockage de démonstration. Revenez à votre liste de contrats." action={<Link href="/client/contrats" className={BUTTON_PRIMARY}>Mes contrats<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /></div>;

  const printContract = () => window.print();
  const downloadSummary = () => {
    const content = ["HOMERA — RÉCAPITULATIF DU CONTRAT (DOCUMENT DE DÉMONSTRATION)", "", `Bien : ${contract.propertyTitle}`, `Référence : ${contract.propertyRef}`, `Loyer : ${formatMoney(contract.rent)} FCFA par mois`, `Durée : ${contract.duration}`, `Statut : ${contract.status}`, `Clauses : ${contract.clauses}`, "", "Ce fichier est un résumé de démonstration, pas un contrat juridiquement valable."].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `HOMERA-${contract.propertyRef}-contrat-demo.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const payContractAmount = (kind: "loyer" | "caution") => {
    const effectiveContract: ContractRecord = signed ? { ...contract, status: "signe" } : contract;
    const check = canClientPayContract(effectiveContract, data.transactions, kind);
    if (!check.allowed) return;
    const amount = check.amount;
    const provider = defaultMethod?.provider ?? "mtn-momo";
    const providerSpec = PAYMENT_PROVIDERS.find((entry) => entry.id === provider) ?? PAYMENT_PROVIDERS[0];
    const reference = createLocalId("PAY-CTN").toUpperCase();
    const now = new Date().toISOString();
    const split = computeFinancialBreakdown(kind, amount);
    const txStatus = provider === "virement-uemoa" ? "en-verification" : "confirme";
    const record: PaymentTransactionRecord = {
      id: createLocalId("tx"),
      reference,
      kind,
      label: `${kind === "caution" ? "Dépôt de garantie (2 mois)" : "Loyer mensuel"} · ${contract.propertyTitle}`,
      amount,
      homeraFee: split.homeraFee,
      ownerNetAmount: split.ownerNetAmount,
      agentAmount: split.agentAmount,
      provider,
      methodSummary: defaultMethod ? `${providerSpec.shortLabel} · ${defaultMethod.maskedIdentifier}` : `${providerSpec.shortLabel} · direct`,
      propertyId: contract.propertyId,
      propertyRef: contract.propertyRef,
      contractId: contract.id,
      status: txStatus,
      fundsAvailability: txStatus === "confirme" ? "disponible" : "en-attente",
      createdAt: now,
    };
    updateData((current) => ({
      ...current,
      transactions: [record, ...current.transactions],
      notifications: [
        makeNotification("contrat", `Règlement enregistré (${reference})`, `${formatMoney(amount)} FCFA · ${contract.propertyRef}`, "/client/paiements"),
        ...current.notifications,
      ],
    }));
    setPaidFeedback(`Règlement ${reference} (${formatMoney(amount)} FCFA) enregistré via HOMERA.`);
  };
  const sign = () => {
    if (!accepted) return;
    const now = new Date().toISOString();
    updateData((current) => ({
      ...current,
      contracts: current.contracts.map((entry) => entry.id === contract.id ? { ...entry, status: "signe", signedAt: now, updatedAt: now } : entry),
      applications: current.applications.map((entry) => entry.id === contract.applicationId ? { ...entry, stage: "signature" } : entry),
      notifications: [makeNotification("contrat", "Signature enregistrée localement", `Contrat pour ${contract.propertyTitle}`, "/client/contrats"), ...current.notifications],
    }));
    setSigned(true);
  };
  const effectiveContract: ContractRecord = signed ? { ...contract, status: "signe" } : contract;
  const rentPaymentCheck = canClientPayContract(effectiveContract, data.transactions, "loyer");
  const depositPaymentCheck = canClientPayContract(effectiveContract, data.transactions, "caution");
  if (signed || contract.status === "signe") return <div className="mx-auto max-w-4xl"><WorkspaceHeading eyebrow="Contrat" title="Votre signature est enregistrée" description="Le statut du contrat est mis à jour dans ce navigateur. Le règlement via HOMERA est désormais ouvert." actions={<Link href="/client/contrats" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Tous mes contrats</Link>} /><div className="rounded-card border border-success/25 bg-success/[0.04] p-6 text-center sm:p-10"><CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" /><h2 className="mt-4 font-serif text-display-sm">Contrat signé · échéances ouvertes</h2><p className="mt-2 text-body-sm text-muted">La signature du contrat autorise le règlement de la location et du dépôt de garantie auprès de HOMERA.</p><p className="mt-4 font-mono text-caption text-muted">{contract.propertyRef}</p>{paidFeedback && <p role="status" className="mt-4 rounded-xl border border-success/30 bg-card px-4 py-2.5 text-caption font-semibold text-foreground">{paidFeedback}</p>}<div className="mt-6 flex flex-wrap justify-center gap-3">{rentPaymentCheck.allowed && <button type="button" onClick={() => payContractAmount("loyer")} className={BUTTON_PRIMARY}>{rentPaymentCheck.contextualLabel}</button>}{depositPaymentCheck.allowed && <button type="button" onClick={() => payContractAmount("caution")} className={BUTTON_SECONDARY}>{depositPaymentCheck.contextualLabel}</button>}<Link href="/client/paiements" className={BUTTON_SECONDARY}>Voir mes paiements & justificatifs<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></div></div>;
  return <div className="mx-auto max-w-5xl"><WorkspaceHeading eyebrow="Espace documentaire" title="Contrat de location" description="Document de démonstration, à relire avant signature. L’identité, l’horodatage et la valeur juridique de la signature nécessitent un service sécurisé." actions={<Link href="/client/contrats" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mes contrats</Link>} />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"><article className="contract-paper rounded-card border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6"><div><p className="homera-brand text-brand-sm text-homera-brown">Homera</p><p className="mt-1 text-caption uppercase tracking-[0.18em] text-muted">Contrat de location · aperçu</p></div><div className="text-right"><StatusBadge status={contract.status} /><p className="mt-2 font-mono text-caption text-muted">{contract.propertyRef}</p></div></div>
      <h2 className="mt-8 font-serif text-display-sm">Bail d’habitation</h2><p className="mt-2 text-body-sm text-muted">Document généré pour l’aperçu du parcours de location.</p>
      <dl className="mt-7 grid gap-4 sm:grid-cols-2"><SummaryItem label="Bien concerné" value={contract.propertyTitle} /><SummaryItem label="Référence HOMERA" value={contract.propertyRef} /><SummaryItem label="Loyer mensuel" value={`${formatMoney(contract.rent)} FCFA`} /><SummaryItem label="Durée prévue" value={contract.duration} /><SummaryItem label="Locataire" value="Titulaire du compte connecté" /><SummaryItem label="Propriétaire" value="À confirmer par les parties" /></dl>
      <div className="mt-8 space-y-5 text-body-sm leading-relaxed text-muted"><section><h3 className="font-semibold text-foreground">1. Objet du contrat</h3><p className="mt-2">Le logement référencé ci-dessus est proposé à la location. Les parties devront vérifier l’identité des signataires, le titre de propriété et les pièces annexées avant tout engagement définitif.</p></section><section><h3 className="font-semibold text-foreground">2. Conditions financières</h3><p className="mt-2">Le loyer indiqué est une donnée de démonstration. Le dépôt de garantie, les charges et les modalités de paiement devront être précisés dans un document final.</p></section><section><h3 className="font-semibold text-foreground">3. Durée et entrée dans les lieux</h3><p className="mt-2">{contract.duration}. La date d’entrée, l’état des lieux et la remise des clés devront faire l’objet d’un accord distinct entre les parties.</p></section><section><h3 className="font-semibold text-foreground">4. Clauses complémentaires</h3><p className="mt-2">{contract.clauses}</p></section><p className="border-t border-border pt-5 text-caption font-medium text-warning">Ce document ne constitue pas un contrat juridiquement valable et ne doit pas être signé en dehors du parcours sécurisé HOMERA.</p></div>
      <div className="mt-8 border-t border-border pt-5"><label className="flex cursor-pointer items-start gap-3 text-note leading-relaxed"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-homera-terracotta" /><span>J’ai lu ce document de démonstration et comprends qu’il ne s’agit pas d’une signature électronique juridiquement opposable.</span></label><button type="button" onClick={sign} disabled={!accepted || contract.status === "brouillon" || contract.status === "annule"} className={`${BUTTON_PRIMARY} mt-4 disabled:cursor-not-allowed disabled:opacity-45`}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Signer l’aperçu</button></div>
    </article><aside className="space-y-4"><WorkspacePanel title="Actions document" description="Télécharger ou enregistrer en PDF depuis votre navigateur." icon={FileText}><button type="button" onClick={downloadSummary} className={`${BUTTON_SECONDARY} w-full`}><Download className="h-4 w-4" aria-hidden="true" />Télécharger le récapitulatif</button><button type="button" onClick={printContract} className={`${BUTTON_SECONDARY} mt-2 w-full`}><FileText className="h-4 w-4" aria-hidden="true" />Imprimer / enregistrer PDF</button><p className="mt-4 text-caption leading-relaxed text-muted">Statut actuel : <StatusBadge status={contract.status} /></p>{application && <p className="mt-3 text-caption leading-relaxed text-muted">Demande rattachée : {application.id}</p>}</WorkspacePanel><WorkspacePanel title="Règlement conditionné à la signature" description="Aucun paiement n’est demandé avant la signature du contrat." icon={CheckCircle2}><p className="text-caption leading-relaxed text-muted">Conformément au parcours HOMERA (<strong className="text-foreground">Contrat → Signature → Paiement</strong>), le bouton de paiement de la location ({formatMoney(contract.rent)} FCFA) ne s’active qu’une fois le contrat signé.</p><Link href="/client/paiements" className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold text-homera-terracotta hover:underline">Gérer mes moyens de paiement<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></WorkspacePanel><DemoNotice>Le fichier téléchargé est un récapitulatif de démonstration. La génération, l’envoi et la signature contractuelle nécessitent l’API HOMERA.</DemoNotice></aside></div>
  </div>;
}

function PublicPropertyMiniCard({ property, large = false }: { property: { id: string; title: string; reference: string; city: string; district?: string; media?: string; alt?: string; price?: number | null; intent?: string }; large?: boolean }) {
  return <div className={`overflow-hidden rounded-2xl border border-border bg-card ${large ? "" : "grid grid-cols-[88px_1fr]"}`}>
    <div className={`relative ${large ? "aspect-[4/3]" : "h-full min-h-[94px]"}`}>{property.media && <Visual mediaKey={property.media} alt={property.alt ?? property.title} sizes={large ? "220px" : "100px"} veil="none" quality={68} className="absolute inset-0 h-full w-full" />}</div>
    <div className="min-w-0 p-3"><p className="line-clamp-2 text-note font-semibold">{property.title}</p><p className="mt-1 flex items-center gap-1 text-caption text-muted"><MapPin className="h-3 w-3 shrink-0 text-homera-terracotta" aria-hidden="true" />{[property.district, property.city].filter(Boolean).join(", ")}</p><p className="mt-1 font-mono text-micro text-muted">{property.reference}</p></div>
  </div>;
}


function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background/60 p-3"><dt className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</dt><dd className="mt-1 text-note font-medium text-foreground">{value}</dd></div>;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

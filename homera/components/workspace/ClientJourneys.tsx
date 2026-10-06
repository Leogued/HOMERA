"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CalendarCheck2, CalendarDays, Check,
  CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList, Clock3, Download,
  FileText, HeartHandshake, Home, MapPin, Star, XCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import { useMounted } from "@/lib/motion";
import { Visual } from "@/components/ui/Visual";
import { PROPERTIES, type Property } from "@/lib/content";
import { formatPropertyPrice } from "@/lib/format";
import {
  createLocalId,
  eligibleRentalVisits,
  makeNotification,
  RENTAL_STAGES,
  validateRentalRequest,
  VISIT_STATUS_LABELS,
  type ContractRecord,
  type RentalRequestFailure,
  type RentalStage,
  type VisitRecord,
} from "@/lib/workflow";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice, EmptyPanel, FormField,
  INPUT_CLASS, StatusBadge, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";

const VISIT_SLOTS = ["09:00 – 11:00", "11:00 – 13:00", "14:00 – 16:00", "16:00 – 18:00"];
const VISIT_STEPS = ["Le bien", "Date & créneau", "Confirmation"];

export function VisitScheduler({ initialPropertyId = "" }: { initialPropertyId?: string }) {
  const { account } = useAuth();
  const { updateData } = useWorkflow();
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const mounted = useMounted();
  const [date, setDate] = useState("");
  /* « Demain » dépend du fuseau du navigateur : la valeur n’est calculée qu’après
     hydratation, sinon le HTML du serveur et celui du client divergeraient.
     Tant que le visiteur n’a rien choisi, la date proposée reste celle de demain. */
  const tomorrow = mounted ? tomorrowISO() : "";
  const chosenDate = date || tomorrow;
  const [slot, setSlot] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [createdVisit, setCreatedVisit] = useState<VisitRecord | null>(null);
  const property = PROPERTIES.find((entry) => entry.id === propertyId);

  const continueStep = () => {
    if (step === 0 && !property) {
      setError("Choisissez un bien avant de continuer.");
      return;
    }
    if (step === 0 && property?.availabilityStatus === "indisponible") {
      setError("Ce bien est actuellement indisponible à la visite. Choisissez un autre bien ou enregistrez-le en favori.");
      return;
    }
    if (step === 1 && (!chosenDate || !slot)) {
      setError("Choisissez une date et un créneau pour demander la visite.");
      return;
    }
    setError("");
    setStep((current) => Math.min(2, current + 1));
  };

  const requestVisit = () => {
    if (!property || !account) return;
    const visit: VisitRecord = {
      id: createLocalId("visite"),
      propertyId: property.id,
      propertyRef: property.homeraId,
      propertyTitle: property.title,
      clientName: `${account.prenom} ${account.nom}`.trim(),
      date: chosenDate,
      slot,
      status: "demande-envoyee",
      createdAt: new Date().toISOString(),
    };
    updateData((current) => ({
      ...current,
      visits: [visit, ...current.visits],
      notifications: [makeNotification("visite", "Demande de visite envoyée", `${property.title} · ${formatDateOnly(chosenDate)} · ${slot}`, "/client/visites"), ...current.notifications],
    }));
    setCreatedVisit(visit);
  };

  if (createdVisit) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-card border border-success/25 bg-card p-6 text-center shadow-[var(--shadow-card)] sm:p-10" role="status" aria-live="polite">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success"><CheckCircle2 className="h-8 w-8" aria-hidden="true" /></span>
          <p className="mt-5 text-caption font-semibold uppercase tracking-[0.18em] text-success">Étape enregistrée</p>
          <h1 className="mt-2 font-serif text-display-sm">Votre demande de visite est envoyée</h1>
          <p className="mx-auto mt-3 max-w-xl text-body-sm leading-relaxed text-muted">Le rendez-vous apparaît dans votre espace avec le statut « Demande envoyée ». Dans ce prototype, il est conservé uniquement dans ce navigateur.</p>
          <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-border bg-background p-4 text-left">
            <p className="font-semibold">{createdVisit.propertyTitle}</p>
            <p className="mt-1 text-note text-muted">{formatDateOnly(createdVisit.date)} · {createdVisit.slot}</p>
            <p className="mt-2 font-mono text-caption text-muted">{createdVisit.propertyRef}</p>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/client/visites" className={BUTTON_PRIMARY}>Voir mes visites</Link><Link href={`/biens/${createdVisit.propertyId}`} className={BUTTON_SECONDARY}>Retour au bien</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <WorkspaceHeading eyebrow="Parcours de visite" title="Demander une visite" description="Choisissez le bien, proposez une date et un créneau. Le rendez-vous restera en attente jusqu’à la réponse du représentant." actions={<Link href="/client/visites" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mes visites</Link>} />
      <ol aria-label="Étapes de la demande de visite" className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
        {VISIT_STEPS.map((label, index) => <li key={label} className={`flex items-center gap-2 border-b-2 pb-3 text-caption sm:gap-3 ${index <= step ? "border-homera-terracotta text-foreground" : "border-border text-muted"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-semibold ${index < step ? "bg-success text-white" : index === step ? "bg-homera-brown text-white" : "bg-surface-hover"}`}>{index < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : `0${index + 1}`}</span><span className="font-semibold">{label}</span></li>)}
      </ol>
      {error && <p role="alert" className="mb-4 rounded-xl border border-error/25 bg-error/[0.06] px-4 py-3 text-note text-error">{error}</p>}
      {step === 0 && <WorkspacePanel title="Quel bien souhaitez-vous visiter ?" description="Vous pouvez partir d’une fiche précise ou choisir parmi les biens publiés." icon={Home}>
        <div className="grid gap-5 md:grid-cols-[1fr_1.15fr] md:items-start">
          <FormField label="Bien à visiter" name="visit-property" required>
            <select id="visit-property" value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setError(""); }} className={INPUT_CLASS}>
              <option value="">Sélectionner un bien</option>
              {PROPERTIES.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {entry.city} · {entry.homeraId}</option>)}
            </select>
          </FormField>
          {property ? <PropertyMiniCard property={property} /> : <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-border px-4 text-center text-caption text-muted">La fiche du bien sélectionné s’affichera ici.</div>}
        </div>
      </WorkspacePanel>}
      {step === 1 && <WorkspacePanel title="Proposez votre disponibilité" description="La date choisie est une préférence, pas encore un rendez-vous confirmé." icon={CalendarDays}>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Date souhaitée" name="visit-date" hint="Les créneaux sont proposés en heure locale du Bénin." required>
            <input id="visit-date" type="date" min={tomorrow || undefined} value={chosenDate} onChange={(event) => setDate(event.target.value)} className={INPUT_CLASS} />
          </FormField>
          <FormField label="Créneau souhaité" name="visit-slot" required>
            <select id="visit-slot" value={slot} onChange={(event) => setSlot(event.target.value)} className={INPUT_CLASS}><option value="">Choisir un créneau</option>{VISIT_SLOTS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </FormField>
        </div>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-info/[0.06] p-4 text-caption leading-relaxed text-muted"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />Le représentant confirmera ou proposera un autre créneau. N’effectuez aucun paiement avant la confirmation d’un rendez-vous par les canaux officiels HOMERA.</p>
      </WorkspacePanel>}
      {step === 2 && <WorkspacePanel title="Vérifiez votre demande" description="Prenez un instant pour vérifier que les informations sont exactes." icon={ClipboardCheck}>
        {property ? <div className="grid gap-5 md:grid-cols-[220px_1fr]"><PropertyMiniCard property={property} large /><dl className="grid gap-3 sm:grid-cols-2"><SummaryItem label="Bien" value={property.title} /><SummaryItem label="Référence" value={property.homeraId} /><SummaryItem label="Date souhaitée" value={formatDateOnly(chosenDate)} /><SummaryItem label="Créneau" value={slot} /><SummaryItem label="État après envoi" value="Demande envoyée · en attente de réponse" /></dl></div> : <p className="text-note text-error">Le bien n’est plus disponible dans le catalogue. Revenez à l’étape précédente.</p>}
      </WorkspacePanel>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => { setError(""); setStep((current) => Math.max(0, current - 1)); }} disabled={step === 0} className="min-h-11 rounded-btn px-4 text-note font-semibold text-muted hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="mr-2 inline h-4 w-4" aria-hidden="true" />Précédent</button>
        {step < 2 ? <button type="button" onClick={continueStep} disabled={step === 2} className={BUTTON_PRIMARY}>Continuer<ArrowRight className="h-4 w-4" aria-hidden="true" /></button> : <button type="button" onClick={requestVisit} disabled={!property || !slot || !chosenDate} className={BUTTON_PRIMARY}>Envoyer ma demande<CalendarCheck2 className="h-4 w-4" aria-hidden="true" /></button>}
      </div>
      <div className="mt-8"><DemoNotice>Les demandes de visite de cette démo sont enregistrées sur cet appareil. Aucun agent ne reçoit une notification réelle tant que l’API HOMERA n’est pas connectée.</DemoNotice></div>
    </div>
  );
}

export function ClientVisits() {
  const { data, updateData } = useWorkflow();
  const visits = useMemo(() => [...data.visits].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.visits]);
  const [feedback, setFeedback] = useState<Record<string, { rating: number; comment: string }>>({});
  const cancelVisit = (visit: VisitRecord) => updateData((current) => ({
    ...current,
    visits: current.visits.map((entry) => entry.id === visit.id ? { ...entry, status: "annulee" } : entry),
    notifications: [makeNotification("visite", "Visite annulée", `${visit.propertyTitle} · ${formatDateOnly(visit.date)}`, "/client/visites"), ...current.notifications],
  }));
  const saveFeedback = (visit: VisitRecord) => {
    const entry = feedback[visit.id];
    if (!entry?.rating) return;
    updateData((current) => ({
      ...current,
      visits: current.visits.map((item) => item.id === visit.id ? { ...item, rating: entry.rating, comment: entry.comment.trim() } : item),
      notifications: [makeNotification("visite", "Merci pour votre retour", `Votre avis sur ${visit.propertyTitle} a été enregistré localement.`, "/client/visites"), ...current.notifications],
    }));
  };

  return <>
    <WorkspaceHeading eyebrow="Votre agenda" title="Mes visites" description="Suivez vos demandes, les confirmations et les retours après visite." actions={<Link href="/client/visites/nouvelle" className={BUTTON_PRIMARY}><CalendarDays className="h-4 w-4" aria-hidden="true" />Demander une visite</Link>} />
    {visits.length === 0 ? <EmptyPanel icon={CalendarDays} title="Aucune visite pour le moment" description="Partez d’une fiche de bien pour choisir une date et un créneau. Le statut de chaque demande restera visible ici." action={<Link href="/explorer" className={BUTTON_PRIMARY}>Explorer les biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /> : <div className="space-y-4">{visits.map((visit) => <VisitCard key={visit.id} visit={visit} hasApplication={data.applications.some((application) => application.visitId === visit.id)} feedback={feedback[visit.id] ?? { rating: 0, comment: "" }} onFeedbackChange={(next) => setFeedback((current) => ({ ...current, [visit.id]: next }))} onFeedbackSave={() => saveFeedback(visit)} onCancel={() => cancelVisit(visit)} />)}</div>}
    <div className="mt-8"><DemoNotice>Les étapes sont enregistrées dans votre espace de démonstration. Le propriétaire ou l’agent ne reçoit pas encore la demande sur un serveur.</DemoNotice></div>
  </>;
}

function VisitCard({ visit, hasApplication, feedback, onFeedbackChange, onFeedbackSave, onCancel }: { visit: VisitRecord; hasApplication: boolean; feedback: { rating: number; comment: string }; onFeedbackChange: (next: { rating: number; comment: string }) => void; onFeedbackSave: () => void; onCancel: () => void }) {
  const canCancel = ["demande-envoyee", "en-attente", "confirmee"].includes(visit.status);
  const rentalListing = PROPERTIES.find((property) => property.id === visit.propertyId)?.intent === "louer";
  return <WorkspacePanel title={visit.propertyTitle} description={`${formatDateOnly(visit.date)} · ${visit.slot} · ${visit.propertyRef}`} icon={CalendarDays} action={<StatusBadge status={visit.status} />}>
    <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-homera-terracotta"><MapPin className="h-4 w-4" aria-hidden="true" /></span><div><p className="text-note font-semibold">{visit.status === "demande-envoyee" ? "Le représentant doit répondre" : visit.status === "confirmee" ? "Rendez-vous confirmé" : visit.status === "terminee" ? "Comment s’est passée la visite ?" : VISIT_STATUS_LABELS[visit.status]}</p><p className="mt-1 text-caption leading-relaxed text-muted">{visit.status === "demande-envoyee" ? "Votre créneau est une proposition. Il sera confirmé ou remplacé dans cet espace." : visit.status === "agent-indisponible" ? "Le créneau demandé ne peut pas être assuré. Choisissez-en un autre depuis la fiche du bien." : "Conservez la référence du bien pour vos échanges avec le représentant."}</p></div></div>
      <div className="flex flex-wrap gap-2">{canCancel && <button type="button" onClick={onCancel} className="inline-flex min-h-10 items-center gap-2 rounded-btn border border-border px-3 text-caption font-semibold text-muted hover:border-error/50 hover:text-error"><XCircle className="h-4 w-4" aria-hidden="true" />Annuler</button>}<Link href={`/biens/${visit.propertyId}`} className="inline-flex min-h-10 items-center gap-2 rounded-btn border border-border px-3 text-caption font-semibold text-foreground hover:border-homera-terracotta hover:text-homera-terracotta">Voir le bien<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></div>
    </div>
    {visit.status === "terminee" && (visit.rating ? <div className="mt-5 rounded-2xl border border-success/20 bg-success/[0.05] p-4"><p className="flex items-center gap-2 text-note font-semibold"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />Votre retour est enregistré · {visit.rating}/5</p>{visit.comment && <p className="mt-2 text-note text-muted">« {visit.comment} »</p>}</div> : <div className="mt-5 rounded-2xl border border-border bg-background p-4"><p className="text-note font-semibold">Votre avis nous aide</p><div className="mt-3 flex flex-wrap items-center gap-1" role="radiogroup" aria-label={`Votre note pour la visite de ${visit.propertyTitle}`}>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" role="radio" aria-checked={feedback.rating === rating} aria-label={`${rating} sur 5`} onClick={() => onFeedbackChange({ ...feedback, rating })} className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${feedback.rating >= rating ? "text-homera-terracotta" : "text-muted-light hover:text-homera-terracotta"}`}><Star className={`h-5 w-5 ${feedback.rating >= rating ? "fill-current" : ""}`} aria-hidden="true" /></button>)}</div><label className="mt-3 block text-caption font-medium" htmlFor={`feedback-${visit.id}`}>Commentaire sur le bien et l’agent</label><textarea id={`feedback-${visit.id}`} rows={3} maxLength={500} value={feedback.comment} onChange={(event) => onFeedbackChange({ ...feedback, comment: event.target.value })} placeholder="Votre expérience, en quelques mots…" className={`${INPUT_CLASS} mt-1 resize-y py-3`} /><button type="button" onClick={onFeedbackSave} disabled={!feedback.rating} className={`${BUTTON_PRIMARY} mt-3 disabled:cursor-not-allowed disabled:opacity-45`}>Envoyer mon retour<ArrowRight className="h-4 w-4" aria-hidden="true" /></button></div>)}
    {visit.status === "terminee" && rentalListing && <div className="mt-4">{hasApplication ? <Link href="/client/demandes" className="inline-flex min-h-11 items-center gap-2 rounded-btn border border-success/25 bg-success/[0.05] px-4 text-note font-semibold text-success hover:bg-success/[0.1]"><ClipboardList className="h-4 w-4" aria-hidden="true" />Suivre ma demande<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link> : <Link href={`/client/demandes/nouvelle?bien=${visit.propertyId}&visite=${visit.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-btn border border-homera-terracotta/30 bg-homera-terracotta/[0.06] px-4 text-note font-semibold text-homera-terracotta hover:bg-homera-terracotta/[0.1]"><HeartHandshake className="h-4 w-4" aria-hidden="true" />Déposer une demande de location<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}</div>}
    {visit.status === "terminee" && !rentalListing && <p className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-caption leading-relaxed text-muted">La candidature de location n’est ouverte qu’après la visite d’un bien proposé à la location.</p>}
  </WorkspacePanel>;
}

export function RentalRequestForm({ initialPropertyId = "", initialVisitId = "" }: { initialPropertyId?: string; initialVisitId?: string }) {
  const { data, updateData } = useWorkflow();
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [visitId, setVisitId] = useState(initialVisitId);
  const [income, setIncome] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const eligibleVisits = eligibleRentalVisits(data).filter((visit) => PROPERTIES.find((property) => property.id === visit.propertyId)?.intent === "louer");
  const linkedVisit = data.visits.find((entry) => entry.id === visitId);
  const selectedApplication = data.applications.find((entry) => entry.visitId === visitId);
  // Le bien vient toujours de la visite enregistrée, jamais d’un paramètre d’URL modifiable.
  const effectivePropertyId = visitId ? linkedVisit?.propertyId ?? "" : propertyId;
  const property = PROPERTIES.find((entry) => entry.id === effectivePropertyId);
  const eligibleVisit = eligibleVisits.find((entry) => entry.id === visitId);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateRentalRequest(data, visitId, property?.id, property?.intent);
    if (!validation.ok) {
      setError(rentalRequestError(validation.reason));
      return;
    }
    if (!property) {
      setError("La fiche du bien lié à cette visite n’est plus disponible.");
      return;
    }
    if (!income.trim()) {
      setError("Indiquez votre revenu mensuel net afin de préparer votre dossier.");
      return;
    }

    const applicationId = createLocalId("demande");
    const submittedAt = new Date().toISOString();
    let rejected: RentalRequestFailure | null = null;
    updateData((current) => {
      const currentValidation = validateRentalRequest(current, visitId, property.id, property.intent);
      if (!currentValidation.ok) {
        rejected = currentValidation.reason;
        return current;
      }
      return {
        ...current,
        applications: [{ id: applicationId, propertyId: property.id, propertyRef: property.homeraId, propertyTitle: property.title, visitId: currentValidation.visit.id, stage: "demande-envoyee", monthlyIncome: income.trim(), message: message.trim(), submittedAt }, ...current.applications],
        notifications: [makeNotification("demande", "Demande de location envoyée", `Votre dossier pour ${property.title} est prêt pour étude.`, "/client/demandes"), ...current.notifications],
      };
    });
    if (rejected) {
      setError(rentalRequestError(rejected));
      return;
    }
    setSubmitted(true);
  };

  if (submitted) return <div className="mx-auto max-w-3xl rounded-card border border-success/25 bg-card p-7 text-center shadow-[var(--shadow-card)] sm:p-10" role="status" aria-live="polite"><CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" /><p className="mt-4 text-caption font-semibold uppercase tracking-[0.16em] text-success">Dossier créé</p><h1 className="mt-2 font-serif text-display-sm">Votre demande est en étude</h1><p className="mx-auto mt-3 max-w-xl text-body-sm leading-relaxed text-muted">Votre dossier apparaît maintenant dans « Mes demandes ». Le statut et chaque étape y seront visibles.</p><Link href="/client/demandes" className={`${BUTTON_PRIMARY} mt-6`}>Suivre ma demande<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>;

  if (selectedApplication) return <div className="mx-auto max-w-4xl"><WorkspaceHeading eyebrow="Après la visite" title="Demande de location" description="Une candidature ne peut être déposée qu’une fois pour chaque visite terminée." actions={<Link href="/client/visites" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mes visites</Link>} /><EmptyPanel icon={ClipboardList} title="Une demande existe déjà pour cette visite" description={`Le dossier ${selectedApplication.id} est déjà enregistré pour ce bien. Retrouvez son statut et les prochaines étapes dans votre espace demandes.`} action={<Link href="/client/demandes" className={BUTTON_PRIMARY}>Suivre ma demande<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /></div>;

  return <div className="mx-auto max-w-4xl"><WorkspaceHeading eyebrow="Après la visite" title="Demande de location" description="Préparez votre candidature à la location. Seules les visites marquées comme terminées peuvent ouvrir un dossier." actions={<Link href="/client/visites" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mes visites</Link>} />
    {!eligibleVisits.length && !linkedVisit ? <EmptyPanel icon={ClipboardList} title="Aucune visite terminée" description="Une demande de location est possible après la visite du logement. Demandez une visite puis suivez son statut dans votre agenda." action={<Link href="/client/visites" className={BUTTON_PRIMARY}>Voir mes visites<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /> : <form onSubmit={submit} className="space-y-5"><WorkspacePanel title="Le logement visité" description="Rattachez votre candidature à une visite terminée." icon={Home}>
      <div className="grid gap-5 sm:grid-cols-2"><FormField label="Visite terminée" name="application-visit" required><select id="application-visit" value={eligibleVisit ? visitId : ""} onChange={(event) => { const next = event.target.value; setVisitId(next); const match = eligibleVisits.find((entry) => entry.id === next); if (match) setPropertyId(match.propertyId); else if (!next) setPropertyId(""); setError(""); }} className={INPUT_CLASS}><option value="">Choisir une visite</option>{eligibleVisits.map((entry) => <option key={entry.id} value={entry.id}>{entry.propertyTitle} · {formatDateOnly(entry.date)}</option>)}</select></FormField><FormField label="Référence du bien" name="application-property"><input id="application-property" value={property?.homeraId ?? "Sélectionnez une visite"} readOnly className={`${INPUT_CLASS} opacity-75`} /></FormField></div>
      {visitId && !eligibleVisit && linkedVisit && <p role="status" className="mt-4 rounded-xl border border-warning/25 bg-warning/[0.06] px-4 py-3 text-caption leading-relaxed text-muted">Cette visite ne peut plus ouvrir une candidature. Choisissez une visite terminée disponible dans la liste.</p>}
    </WorkspacePanel>
    <WorkspacePanel title="Votre dossier" description="Ces informations restent dans le navigateur pour le prototype." icon={FileText}>
      <div className="grid gap-5 sm:grid-cols-2"><FormField label="Revenu mensuel net (FCFA)" name="income" required><input id="income" type="text" inputMode="numeric" value={income} onChange={(event) => setIncome(event.target.value.replace(/[^\d\s]/g, ""))} placeholder="Ex. 450 000" className={INPUT_CLASS} /></FormField><FormField label="Pièces à préparer" name="application-documents" hint="Identité, justificatifs de revenus et références. L’envoi sécurisé de pièces sera connecté ultérieurement."><input id="application-documents" value="À fournir après étude" readOnly className={`${INPUT_CLASS} opacity-75`} /></FormField></div>
      <label htmlFor="application-message" className="mt-5 block text-note font-semibold">Un mot pour le propriétaire <span className="font-normal text-muted">(facultatif)</span></label><textarea id="application-message" rows={4} maxLength={800} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Présentez brièvement votre projet et votre date d’entrée souhaitée…" className={`${INPUT_CLASS} mt-1 resize-y py-3`} />
    </WorkspacePanel>
    {error && <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.06] px-4 py-3 text-note text-error">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-caption leading-relaxed text-muted">En envoyant ce formulaire, vous enregistrez une candidature de démonstration. Elle n’est pas transmise au propriétaire.</p><button type="submit" disabled={!eligibleVisit || !property} className={`${BUTTON_PRIMARY} disabled:cursor-not-allowed disabled:opacity-45`}>Envoyer ma demande<ArrowRight className="h-4 w-4" aria-hidden="true" /></button></div>
    </form>}
  </div>;
}

export function ClientApplications() {
  const { data } = useWorkflow();
  const applications = [...data.applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const completedVisits = eligibleRentalVisits(data).filter((visit) => PROPERTIES.find((property) => property.id === visit.propertyId)?.intent === "louer");
  return <>
    <WorkspaceHeading eyebrow="Votre dossier locatif" title="Mes demandes" description="Du dépôt de candidature à la récupération des clés, chaque changement de statut est regroupé ici." actions={<Link href="/client/visites" className={BUTTON_SECONDARY}><CalendarDays className="h-4 w-4" aria-hidden="true" />Mes visites</Link>} />
    {completedVisits.length > 0 && <WorkspacePanel title="Une visite terminée ? Déposez votre dossier" description="Les candidatures ne sont ouvertes qu’après une visite terminée." icon={HeartHandshake} className="mb-5"><div className="flex flex-wrap gap-2">{completedVisits.map((visit) => <Link key={visit.id} href={`/client/demandes/nouvelle?bien=${visit.propertyId}&visite=${visit.id}`} className={BUTTON_PRIMARY}>{visit.propertyTitle}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>)}</div></WorkspacePanel>}
    {applications.length === 0 ? <EmptyPanel icon={ClipboardList} title="Aucun dossier de location" description="Après une visite terminée, vous pourrez déposer votre demande et suivre son étude, son acceptation ou son refus." action={<Link href="/client/visites" className={BUTTON_PRIMARY}>Voir mes visites<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /> : <div className="space-y-5">{applications.map((application) => <RentalApplicationCard key={application.id} application={application} />)}</div>}
  </>;
}

function RentalApplicationCard({ application }: { application: { id: string; propertyId: string; propertyRef: string; propertyTitle: string; stage: RentalStage; submittedAt: string } }) {
  const contract = useWorkflow().data.contracts.find((entry) => entry.applicationId === application.id);
  const rejected = application.stage === "refusee";
  const reachedIndex = RENTAL_STAGES.findIndex((entry) => entry.id === application.stage);
  return <WorkspacePanel title={application.propertyTitle} description={`Dossier ${application.id} · ${application.propertyRef} · envoyé le ${formatDateTime(application.submittedAt)}`} icon={ClipboardList} action={<StatusBadge status={application.stage} />}>
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Étapes de la demande de location">{RENTAL_STAGES.map((stage) => {
      const visible = !rejected ? stage.id !== "refusee" : stage.id !== "acceptee";
      if (!visible) return null;
      const effectiveIndex = RENTAL_STAGES.filter((entry) => !((!rejected && entry.id === "refusee") || (rejected && entry.id === "acceptee"))).findIndex((entry) => entry.id === stage.id);
      const active = stage.id === application.stage;
      const done = !rejected && effectiveIndex <= reachedIndex;
      return <li key={stage.id} className={`rounded-xl border p-3 ${active ? "border-homera-terracotta/35 bg-homera-terracotta/[0.06]" : done ? "border-success/20 bg-success/[0.04]" : "border-border bg-background/50"}`}><p className="flex items-center gap-2 text-caption font-semibold"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${active ? "bg-homera-terracotta text-white" : done ? "bg-success text-white" : "bg-surface-hover text-muted"}`}>{done && !active ? <Check className="h-3 w-3" aria-hidden="true" /> : <span className="sr-only">{active ? "Étape actuelle" : "À venir"}</span>}</span>{stage.label}</p><p className="mt-2 text-[0.68rem] leading-relaxed text-muted">{stage.description}</p></li>;
    })}</ol>
    {contract && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"><div className="flex items-start gap-3"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" /><div><p className="text-note font-semibold">Contrat de location</p><p className="mt-1 text-caption text-muted">Statut : <StatusBadge status={contract.status} /></p></div></div><Link href={`/client/contrats/${contract.id}`} className={BUTTON_SECONDARY}>Consulter le contrat<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>}
  </WorkspacePanel>;
}

export function ClientContracts() {
  const { data } = useWorkflow();
  return <>
    <WorkspaceHeading eyebrow="Documents de location" title="Mes contrats" description="Consultez les contrats envoyés, téléchargez une copie imprimable et suivez la signature." />
    {data.contracts.length ? <ul className="grid gap-4 md:grid-cols-2">{data.contracts.map((contract) => <li key={contract.id}><ContractCard contract={contract} /></li>)}</ul> : <EmptyPanel icon={FileText} title="Aucun contrat transmis" description="Lorsqu’une demande de location sera acceptée et qu’un contrat vous sera envoyé, vous pourrez le consulter et le signer ici." action={<Link href="/client/demandes" className={BUTTON_SECONDARY}>Voir mes demandes<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />}
  </>;
}

function ContractCard({ contract }: { contract: ContractRecord }) {
  return <WorkspacePanel title={contract.propertyTitle} description={`${contract.propertyRef} · ${contract.duration}`} icon={FileText} action={<StatusBadge status={contract.status} />}><p className="text-caption text-muted">Loyer mensuel <strong className="homera-num text-foreground">{formatMoney(contract.rent)} FCFA</strong></p><Link href={`/client/contrats/${contract.id}`} className="mt-4 inline-flex min-h-10 items-center gap-2 text-note font-semibold text-homera-terracotta hover:underline">Ouvrir le contrat<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></WorkspacePanel>;
}

export function ClientContractReader({ contractId }: { contractId: string }) {
  const { data, updateData } = useWorkflow();
  const [accepted, setAccepted] = useState(false);
  const [signed, setSigned] = useState(false);
  const contract = data.contracts.find((entry) => entry.id === contractId);
  const application = contract ? data.applications.find((entry) => entry.id === contract.applicationId) : undefined;
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
  if (signed || contract.status === "signe") return <div className="mx-auto max-w-4xl"><WorkspaceHeading eyebrow="Contrat" title="Votre signature est enregistrée" description="Le statut du contrat est mis à jour dans ce navigateur." actions={<Link href="/client/contrats" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Tous mes contrats</Link>} /><div className="rounded-card border border-success/25 bg-success/[0.04] p-6 text-center sm:p-10"><CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" /><h2 className="mt-4 font-serif text-display-sm">Contrat signé · prototype</h2><p className="mt-2 text-body-sm text-muted">La signature électronique légalement opposable n’est pas connectée.</p><p className="mt-4 font-mono text-caption text-muted">{contract.propertyRef}</p></div></div>;
  return <div className="mx-auto max-w-5xl"><WorkspaceHeading eyebrow="Espace documentaire" title="Contrat de location" description="Document de démonstration, à relire avant signature. L’identité, l’horodatage et la valeur juridique de la signature nécessitent un service sécurisé." actions={<Link href="/client/contrats" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mes contrats</Link>} />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"><article className="contract-paper rounded-card border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6"><div><p className="homera-brand text-brand-sm text-homera-brown">Homera</p><p className="mt-1 text-caption uppercase tracking-[0.18em] text-muted">Contrat de location · aperçu</p></div><div className="text-right"><StatusBadge status={contract.status} /><p className="mt-2 font-mono text-caption text-muted">{contract.propertyRef}</p></div></div>
      <h2 className="mt-8 font-serif text-display-sm">Bail d’habitation</h2><p className="mt-2 text-body-sm text-muted">Document généré pour l’aperçu du parcours de location.</p>
      <dl className="mt-7 grid gap-4 sm:grid-cols-2"><SummaryItem label="Bien concerné" value={contract.propertyTitle} /><SummaryItem label="Référence HOMERA" value={contract.propertyRef} /><SummaryItem label="Loyer mensuel" value={`${formatMoney(contract.rent)} FCFA`} /><SummaryItem label="Durée prévue" value={contract.duration} /><SummaryItem label="Locataire" value="Titulaire du compte connecté" /><SummaryItem label="Propriétaire" value="À confirmer par les parties" /></dl>
      <div className="mt-8 space-y-5 text-body-sm leading-relaxed text-muted"><section><h3 className="font-semibold text-foreground">1. Objet du contrat</h3><p className="mt-2">Le logement référencé ci-dessus est proposé à la location. Les parties devront vérifier l’identité des signataires, le titre de propriété et les pièces annexées avant tout engagement définitif.</p></section><section><h3 className="font-semibold text-foreground">2. Conditions financières</h3><p className="mt-2">Le loyer indiqué est une donnée de démonstration. Le dépôt de garantie, les charges et les modalités de paiement devront être précisés dans un document final.</p></section><section><h3 className="font-semibold text-foreground">3. Durée et entrée dans les lieux</h3><p className="mt-2">{contract.duration}. La date d’entrée, l’état des lieux et la remise des clés devront faire l’objet d’un accord distinct entre les parties.</p></section><section><h3 className="font-semibold text-foreground">4. Clauses complémentaires</h3><p className="mt-2">{contract.clauses}</p></section><p className="border-t border-border pt-5 text-caption font-medium text-warning">Ce document ne constitue pas un contrat juridiquement valable et ne doit pas être signé en dehors du parcours sécurisé HOMERA.</p></div>
      <div className="mt-8 border-t border-border pt-5"><label className="flex cursor-pointer items-start gap-3 text-note leading-relaxed"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-homera-terracotta" /><span>J’ai lu ce document de démonstration et comprends qu’il ne s’agit pas d’une signature électronique juridiquement opposable.</span></label><button type="button" onClick={sign} disabled={!accepted || contract.status === "brouillon" || contract.status === "annule"} className={`${BUTTON_PRIMARY} mt-4 disabled:cursor-not-allowed disabled:opacity-45`}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Signer l’aperçu</button></div>
    </article><aside className="space-y-4"><WorkspacePanel title="Actions document" description="Télécharger ou enregistrer en PDF depuis votre navigateur." icon={FileText}><button type="button" onClick={downloadSummary} className={`${BUTTON_SECONDARY} w-full`}><Download className="h-4 w-4" aria-hidden="true" />Télécharger le récapitulatif</button><button type="button" onClick={printContract} className={`${BUTTON_SECONDARY} mt-2 w-full`}><FileText className="h-4 w-4" aria-hidden="true" />Imprimer / enregistrer PDF</button><p className="mt-4 text-caption leading-relaxed text-muted">Statut actuel : <StatusBadge status={contract.status} /></p>{application && <p className="mt-3 text-caption leading-relaxed text-muted">Demande rattachée : {application.id}</p>}</WorkspacePanel><DemoNotice>Le fichier téléchargé est un récapitulatif de démonstration. La génération, l’envoi et la signature contractuelle nécessitent l’API HOMERA.</DemoNotice></aside></div>
  </div>;
}

function PropertyMiniCard({ property, large = false }: { property: Property; large?: boolean }) {
  return <div className={`overflow-hidden rounded-2xl border border-border bg-card ${large ? "" : "grid grid-cols-[88px_1fr]"}`}>
    <div className={`relative ${large ? "aspect-[4/3]" : "h-full min-h-[94px]"}`}><Visual mediaKey={property.media} alt={property.alt} sizes={large ? "220px" : "100px"} veil="none" quality={68} className="absolute inset-0 h-full w-full" /></div>
    <div className="min-w-0 p-3"><p className="line-clamp-2 text-note font-semibold">{property.title}</p><p className="mt-1 flex items-center gap-1 text-caption text-muted"><MapPin className="h-3 w-3 shrink-0 text-homera-terracotta" aria-hidden="true" />{property.district}, {property.city}</p><p className="mt-1 font-mono text-[0.65rem] text-muted">{property.homeraId}</p>{large && <p className="mt-2 text-caption text-foreground">{formatPropertyPrice(property)}</p>}</div>
  </div>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background/60 p-3"><dt className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-muted">{label}</dt><dd className="mt-1 text-note font-medium text-foreground">{value}</dd></div>;
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
function rentalRequestError(reason: RentalRequestFailure): string {
  switch (reason) {
    case "visite-introuvable": return "Choisissez une visite de votre espace avant de déposer une demande.";
    case "demande-existante": return "Une demande est déjà liée à cette visite. Retrouvez-la dans « Mes demandes ».";
    case "visite-non-terminee": return "Une visite terminée est nécessaire avant de déposer une demande.";
    case "bien-introuvable": return "La fiche du bien lié à cette visite n’est plus disponible.";
    case "bien-incoherent": return "Le bien choisi ne correspond pas à la référence enregistrée pour cette visite.";
    case "bien-non-louable": return "Cette visite ne concerne pas un bien proposé à la location.";
  }
}
function tomorrowISO(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatMoney(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

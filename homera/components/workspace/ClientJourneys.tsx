"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CalendarCheck2, CalendarDays, Check,
  CheckCircle2, ClipboardCheck, Clock3,
  FileText, Home, KeyRound, Loader2, MapPin,
} from "lucide-react";
import { Visual } from "@/components/ui/Visual";
import { PROPERTIES } from "@/lib/content";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel, FormField,
  INPUT_CLASS, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";
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

export function RentalRequestForm({ initialVisitId = "", initialPropertyId = "", initialDesiredStart = "", initialDesiredEnd = "" }: { initialVisitId?: string; initialPropertyId?: string; initialDesiredStart?: string; initialDesiredEnd?: string }) {
  return <ServerRentalRequestForm initialVisitId={initialVisitId} initialPropertyId={initialPropertyId} initialDesiredStart={initialDesiredStart} initialDesiredEnd={initialDesiredEnd} />;
}

export function ClientApplications() {
  return <ApplicationsList viewpoint="client" title="Mes demandes" description="Du dépôt de votre dossier à la décision du propriétaire, chaque changement de statut est enregistré ici et notifié." />;
}

/* ------------------------------------------------------------------
   CONTRATS : écrits par le serveur, signés par le locataire
   ------------------------------------------------------------------
   Un contrat n’existe que s’il a été rédigé après l’acceptation d’une
   candidature : la liste ci-dessous vient de /api/contracts, elle ne
   contient donc aucun exemple fabriqué pour meubler l’écran.
   ------------------------------------------------------------------ */

type ServerContract = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  propertyCity: string;
  clientName: string;
  status: string;
  rent: number;
  deposit: number;
  startDate: string;
  endDate: string;
  duration: string;
  signedAt: string | null;
  createdAt: string;
  canSign: boolean;
  canCancel: boolean;
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  "a-signer": "À signer",
  signe: "Signé",
  annule: "Annulé",
};

function contractStatusLabel(status: string): string {
  return CONTRACT_STATUS_LABELS[status] ?? status;
}


const CONTRACT_TONE: Record<string, string> = {
  brouillon: "border-border bg-background text-muted",
  envoye: "border-info/30 bg-info/[0.07] text-info",
  "a-signer": "border-warning/30 bg-warning/[0.08] text-warning",
  signe: "border-success/30 bg-success/[0.07] text-success",
  annule: "border-border bg-background text-muted",
};

export function ClientContracts() {
  const { data, loading, error } = useServerResource<{ contracts: ServerContract[] }>("/api/contracts");
  const contracts = data?.contracts ?? [];

  return <>
    <WorkspaceHeading
      eyebrow="Documents de location"
      title="Mes contrats"
      description="Les contrats rédigés par le propriétaire ou son agent mandaté après l’acceptation de votre dossier. Vous les signez ici ; la signature est horodatée et journalisée."
    />
    {error && <p role="alert" className="mb-4 rounded-xl border border-error/20 bg-error/[0.05] px-4 py-3 text-note text-error">{error}</p>}
    {loading ? (
      <p className="mb-8 flex items-center gap-2 rounded-card border border-border bg-card p-6 text-caption text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Lecture de vos contrats…
      </p>
    ) : contracts.length ? (
      <ul className="mb-8 grid gap-4 md:grid-cols-2">
        {contracts.map((contract) => {
          const property = PROPERTIES.find((entry) => entry.id === contract.propertyId) ?? null;
          return (
          <li key={contract.id}>
            <WorkspacePanel
              title={contract.propertyTitle}
              description={`${contract.reference} · ${contract.duration}`}
              icon={contract.status === "signe" ? KeyRound : FileText}
              action={<span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-micro font-semibold uppercase tracking-[0.1em] ${CONTRACT_TONE[contract.status] ?? "border-border bg-background text-muted"}`}>{contractStatusLabel(contract.status)}</span>}
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                {property?.media && (
                  <Link href={`/client/contrats/${contract.id}`} className="relative block h-24 w-full shrink-0 overflow-hidden rounded-2xl border border-border sm:w-28" aria-label={`Ouvrir le contrat : ${contract.propertyTitle}`}>
                    <Visual mediaKey={property.media} alt={property.alt ?? contract.propertyTitle} sizes="120px" veil="none" quality={68} className="absolute inset-0 h-full w-full" />
                  </Link>
                )}
                <dl className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-2.5">
                    <dt className="text-micro font-semibold uppercase tracking-[0.1em] text-muted">Loyer</dt>
                    <dd className="homera-num mt-0.5 text-caption font-bold text-foreground">{formatMoney(contract.rent)} FCFA</dd>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-2.5">
                    <dt className="text-micro font-semibold uppercase tracking-[0.1em] text-muted">Dépôt</dt>
                    <dd className="homera-num mt-0.5 text-caption font-bold text-foreground">{formatMoney(contract.deposit)} FCFA</dd>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-2.5">
                    <dt className="text-micro font-semibold uppercase tracking-[0.1em] text-muted">Période</dt>
                    <dd className="mt-0.5 text-caption font-semibold text-foreground">Du {formatDay(contract.startDate)} au {formatDay(contract.endDate)}</dd>
                  </div>
                </dl>
              </div>
              {contract.signedAt && (
                <p className="mt-3 text-caption text-muted">Signé le {formatDay(contract.signedAt)}.</p>
              )}
              <div className="mt-4">
                <Link href={`/client/contrats/${contract.id}`} className={contract.canSign ? BUTTON_PRIMARY : BUTTON_SECONDARY}>
                  {contract.canSign ? "Signer le contrat" : "Ouvrir le contrat"}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </WorkspacePanel>
          </li>
          );
        })}
      </ul>
    ) : (
      <div className="mb-8">
        <EmptyPanel
          icon={FileText}
          title="Aucun contrat pour le moment"
          description="Un contrat est rédigé par le propriétaire après l’acceptation de votre dossier de location. Il apparaîtra ici, avec sa date d’effet et son dépôt de garantie."
          action={<Link href="/client/demandes" className={BUTTON_SECONDARY}>Voir mes demandes<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        />
      </div>
    )}
    <div className="rounded-card border border-border bg-card p-4">
      <p className="text-caption leading-relaxed text-muted">
        <strong className="text-foreground">Aucun encaissement n’est ouvert sur ce pilote.</strong> HOMERA ne
        demande ni loyer ni caution : le règlement se fait entre les parties, au moment de la remise des clés,
        sur présentation du contrat signé.
      </p>
    </div>
  </>;
}

export function ClientContractReader({ contractId }: { contractId: string }) {
  const { data, loading, error, reload } = useServerResource<{ contract: ServerContract }>(`/api/contracts/${contractId}`);
  const [fullName, setFullName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const contract = data?.contract;

  const sign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract) return;
    setBusy(true);
    setProblem("");
    const result = await apiPost<{ signedAt: string }>(`/api/contracts/${contract.id}`, { action: "signer", fullName });
    setBusy(false);
    if (!result.ok) {
      setProblem(messageOf(result) ?? "La signature n’a pas pu être enregistrée.");
      return;
    }
    setMessage("Votre signature est enregistrée : le propriétaire en est notifié et le contrat passe au statut « signé ».");
    await reload();
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 rounded-card border border-border bg-card p-6 text-caption text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Lecture du contrat…
      </p>
    );
  }
  if (!contract) {
    return <div className="mx-auto max-w-3xl py-8">
      <WorkspaceHeading eyebrow="Contrat" title="Contrat introuvable" description="Aucun contrat ne correspond à cette adresse, ou il ne vous concerne pas." />
      <EmptyPanel icon={FileText} title="Le contrat n’est pas accessible" description="Il peut avoir été annulé, ou appartenir à un autre compte. Revenez à votre liste de contrats." action={<Link href="/client/contrats" className={BUTTON_PRIMARY}>Mes contrats<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
      {error && <p role="alert" className="mt-4 text-note text-error">{error}</p>}
    </div>;
  }

  const signed = contract.status === "signe";

  return <div className="mx-auto max-w-5xl">
    <WorkspaceHeading
      eyebrow="Espace documentaire"
      title={signed ? "Contrat signé" : "Contrat de location"}
      description={
        signed
          ? "Votre signature est enregistrée avec la date et l’heure. Le propriétaire en a été notifié."
          : "Relisez le contrat, puis signez-le. La signature est enregistrée côté serveur, horodatée et journalisée."
      }
      actions={<Link href="/client/contrats" className={BUTTON_SECONDARY}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mes contrats</Link>}
    />
    {message && <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-note text-success">{message}</p>}
    {problem && <p role="alert" className="mb-4 rounded-xl border border-error/20 bg-error/[0.05] px-4 py-3 text-note text-error">{problem}</p>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <article className="contract-paper rounded-card border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="homera-brand text-brand-sm text-homera-brown">Homera</p>
            <p className="mt-1 text-caption uppercase tracking-[0.18em] text-muted">Contrat de location</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-caption font-semibold">{contractStatusLabel(contract.status)}</span>
            <p className="mt-2 font-mono text-caption text-muted">{contract.reference}</p>
          </div>
        </div>
        <h2 className="mt-8 font-serif text-display-sm">Bail d’habitation</h2>
        <p className="mt-2 text-body-sm text-muted">{contract.propertyTitle} · {contract.propertyCity}</p>
        <dl className="mt-7 grid gap-4 sm:grid-cols-2">
          <SummaryItem label="Bien concerné" value={contract.propertyTitle} />
          <SummaryItem label="Référence du bien" value={contract.propertyReference || "—"} />
          <SummaryItem label="Loyer mensuel" value={`${formatMoney(contract.rent)} FCFA`} />
          <SummaryItem label="Dépôt de garantie" value={`${formatMoney(contract.deposit)} FCFA`} />
          <SummaryItem label="Locataire" value={contract.clientName} />
          <SummaryItem label="Durée" value={`${contract.duration} · du ${formatDay(contract.startDate)} au ${formatDay(contract.endDate)}`} />
        </dl>
        <div className="mt-8 space-y-5 text-body-sm leading-relaxed text-muted">
          <section>
            <h3 className="font-semibold text-foreground">1. Objet du contrat</h3>
            <p className="mt-2">Le logement référencé ci-dessus est donné à location pour la durée indiquée. Les pièces du dossier (identité, titre de propriété, mandat éventuel) ont été déposées sur HOMERA et peuvent être demandées aux parties.</p>
          </section>
          <section>
            <h3 className="font-semibold text-foreground">2. Conditions financières</h3>
            <p className="mt-2">Le loyer mensuel et le dépôt de garantie figurent ci-dessus. Aucun règlement n’est encaissé par HOMERA : il intervient entre les parties, contre reçu, au plus tard à la remise des clés.</p>
          </section>
          <section>
            <h3 className="font-semibold text-foreground">3. Durée et entrée dans les lieux</h3>
            <p className="mt-2">Le bail court du {formatDay(contract.startDate)} au {formatDay(contract.endDate)}. L’état des lieux et la remise des clés font l’objet d’un document signé par les deux parties.</p>
          </section>
          <section>
            <h3 className="font-semibold text-foreground">4. Portée de la signature HOMERA</h3>
            <p className="mt-2">La signature apposée ici est une signature électronique simple : le nom déclaré, la date, l’heure et l’adresse IP sont conservés dans le journal HOMERA. Elle ne remplace pas une signature électronique qualifiée ni un acte notarié.</p>
          </section>
        </div>
        {signed ? (
          <p className="mt-8 rounded-xl border border-success/25 bg-success/[0.05] p-4 text-note text-success">
            Signé le {contract.signedAt ? formatDay(contract.signedAt) : "—"} par {contract.clientName}.
          </p>
        ) : (
          <form onSubmit={sign} className="mt-8 border-t border-border pt-5">
            <FormField label="Nom complet porté au contrat" name="contract-signature" required>
              <input
                id="contract-signature"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                placeholder="Prénom et nom"
                className={INPUT_CLASS}
              />
            </FormField>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-note leading-relaxed">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-homera-terracotta" />
              <span>J’ai lu le contrat et j’accepte que ma signature soit enregistrée avec la date, l’heure et l’adresse IP de cette connexion.</span>
            </label>
            <button type="submit" disabled={!accepted || fullName.trim().length < 3 || busy} className={`${BUTTON_PRIMARY} mt-4 disabled:cursor-not-allowed disabled:opacity-45`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              Signer le contrat
            </button>
          </form>
        )}
      </article>
      <aside className="space-y-4">
        <WorkspacePanel title="Suivi" description="Où en est ce contrat." icon={ClipboardCheck}>
          <ul className="space-y-2 text-caption text-muted">
            <li>Rédigé le {formatDay(contract.createdAt)}</li>
            <li>Statut : <strong className="text-foreground">{contractStatusLabel(contract.status)}</strong></li>
            <li>{signed ? "Signé par les deux parties côté locataire." : "En attente de votre signature."}</li>
          </ul>
        </WorkspacePanel>
        <WorkspacePanel title="Règlement" description="Aucun encaissement sur le pilote." icon={Clock3}>
          <p className="text-caption leading-relaxed text-muted">
            HOMERA n’encaisse ni loyer ni caution. Le règlement se fait entre vous et le propriétaire, contre reçu,
            après la signature et la remise des clés.
          </p>
        </WorkspacePanel>
      </aside>
    </div>
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

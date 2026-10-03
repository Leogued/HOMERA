"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, FileCheck2,
  FileText, House, ImagePlus, MapPin, Save, ShieldCheck, UploadCloud, X,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import { DEMO_AGENT_ID } from "@/lib/portal-data";
import { EMPTY_PROPERTY_DRAFT, createLocalId, recordVerificationDecision, type PropertyDraft, type WorkspaceListing } from "@/lib/workflow";
import type { PropertyIntent, PropertyType } from "@/lib/content";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice, EmptyPanel, FormField, INPUT_CLASS, WorkspaceHeading, WorkspacePanel } from "@/components/workspace/Primitives";

const STEPS = [
  "Informations générales", "Localisation", "Caractéristiques", "Photos", "Prix",
  "Conditions", "Documents", "Agent", "Vérification", "Prévisualisation", "Soumettre",
];
const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
  { id: "villa", label: "Maison / villa" }, { id: "appartement", label: "Appartement" },
  { id: "studio", label: "Studio" }, { id: "terrain", label: "Terrain / parcelle" }, { id: "local", label: "Local commercial" },
];
const INTENTS: { id: PropertyIntent; label: string }[] = [
  { id: "louer", label: "Louer" }, { id: "acheter", label: "Vendre" }, { id: "sejour", label: "Séjour courte durée" },
];
const FEATURES = ["Climatisation", "Parking", "Cuisine équipée", "Meublé", "Jardin", "Terrasse", "Piscine", "Gardiennage", "Eau courante"];

export function PropertyWizard({ initialListingId = "" }: { initialListingId?: string }) {
  const { data, updateData } = useWorkflow();
  const { account } = useAuth();
  const editingListing = data.listings.find((listing) => listing.id === initialListingId);
  const [draft, setDraft] = useState<PropertyDraft>(() => editingListing?.draftSnapshot ?? data.draftProperty ?? EMPTY_PROPERTY_DRAFT);
  const editingListingId = editingListing?.id ?? initialListingId;
  const [step, setStep] = useState(editingListing?.draftSnapshot?.step ?? data.draftProperty?.step ?? 0);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState<WorkspaceListing | null>(null);

  const change = <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const persistDraft = (nextStep = step) => {
    const next = { ...draft, step: nextStep, updatedAt: new Date().toISOString() };
    setDraft(next);
    updateData((current) => ({ ...current, draftProperty: next }));
    setSaved(true);
    setErrors([]);
  };

  const validateStep = (index: number): string[] => {
    const issues: string[] = [];
    if (index === 0) {
      if (draft.title.trim().length < 5) issues.push("Le titre doit contenir au moins 5 caractères.");
      if (!draft.intent) issues.push("Choisissez le projet du bien.");
      if (!draft.type) issues.push("Choisissez le type de bien.");
    }
    if (index === 1) {
      if (!draft.city.trim()) issues.push("Indiquez la commune.");
      if (!draft.district.trim()) issues.push("Indiquez le quartier.");
    }
    if (index === 2 && (!draft.surface || Number(draft.surface) <= 0)) issues.push("La surface doit être supérieure à zéro.");
    if (index === 3 && draft.photoNames.length === 0) issues.push("Ajoutez au moins une photo au dossier.");
    if (index === 4 && (!draft.price || Number(draft.price) <= 0)) issues.push("Indiquez un prix supérieur à zéro.");
    if (index === 6 && draft.documentNames.length === 0) issues.push("Ajoutez au moins une pièce justificative (nom du fichier dans le pilote).");
    if (index === 7 && draft.agentId && !draft.verifiedMandate) issues.push("Confirmez que l’agent dispose d’un mandat pour ce bien.");
    if (index === 8 && (!draft.verifiedOwner || (draft.agentId && !draft.verifiedMandate))) issues.push("Confirmez les déclarations de propriété et de mandat.");
    return issues;
  };
  const goNext = () => {
    const issues = validateStep(step);
    if (issues.length) { setErrors(issues); setSaved(false); return; }
    const nextStep = Math.min(STEPS.length - 1, step + 1);
    setStep(nextStep);
    persistDraft(nextStep);
  };
  const goBack = () => {
    const previous = Math.max(0, step - 1);
    setStep(previous);
    persistDraft(previous);
  };
  const goToStep = (target: number) => {
    if (target >= step) return;
    setStep(target);
    persistDraft(target);
  };
  const updateFiles = (kind: "photoNames" | "documentNames", fileList: FileList | null) => {
    const names = fileList ? Array.from(fileList).map((file) => file.name).slice(0, kind === "photoNames" ? 12 : 10) : [];
    change(kind, [...new Set([...draft[kind], ...names])]);
  };
  const removeFile = (kind: "photoNames" | "documentNames", name: string) => change(kind, draft[kind].filter((entry) => entry !== name));

  const submitListing = () => {
    const allIssues = STEPS.flatMap((_, index) => validateStep(index).map((message) => `Étape ${String(index + 1).padStart(2, "0")} · ${message}`));
    if (allIssues.length) { setErrors(allIssues); setStep(Math.max(0, STEPS.findIndex((_, index) => validateStep(index).length > 0))); return; }
    if (editingListingId && !editingListing) {
      setErrors(["Le dossier à corriger n’existe plus dans votre espace. Retournez à la liste de vos biens."]);
      return;
    }
    const cityCode = draft.city.toLowerCase().includes("calavi") ? "CAL" : draft.city.toLowerCase().includes("porto") ? "PRN" : draft.city.toLowerCase().includes("ouidah") ? "OUH" : "CTN";
    const submittedAt = new Date().toISOString();
    let committedListing: WorkspaceListing | null = null;
    updateData((current) => {
      const currentListing = editingListingId ? current.listings.find((entry) => entry.id === editingListingId) : undefined;
      if (editingListingId && !currentListing) return current;
      const listing: WorkspaceListing = {
        id: currentListing?.id ?? createLocalId("bien"),
        reference: currentListing?.reference ?? `HOM-${cityCode}-${String(424 + current.listings.length).padStart(6, "0")}`,
        title: draft.title.trim(), intent: draft.intent as PropertyIntent, type: draft.type as PropertyType,
        city: draft.city.trim(), district: draft.district.trim(), price: Number(draft.price.replace(/\D/g, "")),
        status: "en-verification", submittedAt, photoNames: draft.photoNames,
        documentNames: draft.documentNames, ownerAccountId: account?.id,
        ownerName: account ? `${account.prenom} ${account.nom}`.trim() : undefined,
        ownerEmail: account?.email, agentId: draft.agentId || undefined,
        ownerDeclared: draft.verifiedOwner, mandateDeclared: draft.verifiedMandate,
        draftSnapshot: { ...draft, step: 0, updatedAt: submittedAt },
      };
      committedListing = listing;
      const next = {
        ...current,
        listings: currentListing
          ? current.listings.map((entry) => entry.id === currentListing.id ? listing : entry)
          : [listing, ...current.listings],
        draftProperty: null,
      };
      return recordVerificationDecision(next, listing.id, "a-examiner", currentListing ? "Dossier resoumis à vérification" : "Dossier soumis à vérification");
    });
    if (!committedListing) {
      setErrors(["Le dossier n’a pas pu être mis à jour. Actualisez la page et réessayez."]);
      return;
    }
    setSubmitted(committedListing);
    setErrors([]);
  };

  if (initialListingId && !editingListing) return <div className="mx-auto max-w-4xl"><WorkspaceHeading eyebrow="Dossier propriétaire" title="Dossier introuvable" description="Le lien de correction ne correspond à aucun bien de votre espace." /><EmptyPanel icon={House} title="Ce dossier n’est plus disponible" description="Retournez à vos biens pour consulter les références et leurs statuts actuels." action={<Link href="/proprietaire/biens" className={BUTTON_PRIMARY}>Mes biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /></div>;

  if (submitted) return <div className="mx-auto max-w-3xl rounded-card border border-success/25 bg-card p-7 text-center shadow-[var(--shadow-card)] sm:p-10"><CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden="true" /><p className="mt-4 text-caption font-semibold uppercase tracking-[0.16em] text-success">Dossier soumis</p><h1 className="mt-2 font-serif text-display-sm">{editingListingId ? "Le bien est de nouveau en vérification" : "Le bien est en vérification"}</h1><p className="mx-auto mt-3 max-w-xl text-body-sm leading-relaxed text-muted">La mise à jour a été conservée dans le prototype. L’annonce n’est pas publiée et les documents ne sont pas transmis à une équipe réelle.</p><p className="mt-5 font-mono text-body-sm font-semibold">{submitted.reference}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/proprietaire/biens" className={BUTTON_PRIMARY}>Voir mes biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link href="/proprietaire" className={BUTTON_SECONDARY}>Retour au dashboard</Link></div></div>;

  return <div className="mx-auto max-w-5xl">
    <WorkspaceHeading eyebrow={editingListingId ? "Mise à jour d’un dossier" : "Nouveau dossier immobilier"} title={editingListingId ? "Corriger le dossier" : "Ajouter un bien"} description={editingListingId ? "Complétez les éléments demandés, puis renvoyez le dossier dans la file de vérification." : "Un parcours guidé en onze étapes. Vous pouvez enregistrer un brouillon et revenir le compléter plus tard."} actions={<button type="button" onClick={() => persistDraft()} className={BUTTON_SECONDARY}><Save className="h-4 w-4" aria-hidden="true" />Sauvegarder le brouillon</button>} />
    {saved && <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-caption font-semibold text-success">Brouillon sauvegardé dans ce navigateur · {draft.updatedAt ? formatDate(draft.updatedAt) : "à l’instant"}</p>}
    {errors.length > 0 && <div role="alert" className="mb-5 rounded-2xl border border-error/25 bg-error/[0.05] p-4"><p className="font-semibold text-error">Corrigez les points suivants :</p><ul className="mt-2 list-disc space-y-1 pl-5 text-caption text-error">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
    <div className="mb-6 rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><p className="text-caption font-semibold uppercase tracking-[0.16em] text-muted">Étape {String(step + 1).padStart(2, "0")} <span className="px-1 text-muted-light">/</span> {STEPS.length}</p><p className="text-caption font-semibold">{STEPS[step]}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-hover"><div className="h-full rounded-full bg-homera-terracotta transition-[width] duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div><ol className="mt-4 flex gap-1 overflow-x-auto pb-1" aria-label="Progression du formulaire">{STEPS.map((label, index) => <li key={label} className="shrink-0"><button type="button" aria-current={index === step ? "step" : undefined} onClick={() => goToStep(index)} disabled={index >= step} title={label} className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.68rem] font-semibold ${index === step ? "bg-homera-brown text-white" : index < step ? "bg-success/10 text-success" : "bg-surface-hover text-muted-light"} disabled:cursor-default`}>{index < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : String(index + 1).padStart(2, "0")}</button></li>)}</ol></div>

    <WizardStep step={step} draft={draft} change={change} updateFiles={updateFiles} removeFile={removeFile} />

    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={goBack} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-btn px-3 text-note font-semibold text-muted hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Étape précédente</button>{step < 9 ? <button type="button" onClick={goNext} className={BUTTON_PRIMARY}>Étape suivante<ArrowRight className="h-4 w-4" aria-hidden="true" /></button> : step === 9 ? <button type="button" onClick={goNext} className={BUTTON_PRIMARY}>Valider la prévisualisation<ArrowRight className="h-4 w-4" aria-hidden="true" /></button> : <button type="button" onClick={submitListing} className={BUTTON_PRIMARY}><UploadCloud className="h-4 w-4" aria-hidden="true" />Soumettre à vérification</button>}</div>
    <div className="mt-6"><DemoNotice>La sauvegarde, les noms de fichiers et les décisions sont conservés dans le navigateur. Les fichiers eux-mêmes ne sont ni téléversés ni transmis à HOMERA.</DemoNotice></div>
  </div>;
}

function WizardStep({ step, draft, change, updateFiles, removeFile }: {
  step: number;
  draft: PropertyDraft;
  change: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void;
  updateFiles: (kind: "photoNames" | "documentNames", list: FileList | null) => void;
  removeFile: (kind: "photoNames" | "documentNames", name: string) => void;
}) {
  switch (step) {
    case 0: return <WorkspacePanel title="Informations générales" description="Posez les repères principaux de l’annonce." icon={House}><div className="grid gap-5 sm:grid-cols-2"><FormField label="Titre de l’annonce" name="listing-title" hint="Ex. Villa familiale avec jardin à Fidjrossè" required><input id="listing-title" value={draft.title} onChange={(event) => change("title", event.target.value)} maxLength={90} className={INPUT_CLASS} placeholder="Titre clair et fidèle au bien" /></FormField><FormField label="Projet" name="listing-intent" required><select id="listing-intent" value={draft.intent} onChange={(event) => change("intent", event.target.value as PropertyIntent | "")} className={INPUT_CLASS}><option value="">Choisir le projet</option>{INTENTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></FormField><FormField label="Type de bien" name="listing-type" required><select id="listing-type" value={draft.type} onChange={(event) => change("type", event.target.value as PropertyType | "")} className={INPUT_CLASS}><option value="">Choisir le type</option>{PROPERTY_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></FormField><FormField label="Description" name="listing-notes" hint="La description détaillée pourra être complétée plus tard."><textarea id="listing-notes" rows={3} value={draft.notes} onChange={(event) => change("notes", event.target.value)} maxLength={600} className={`${INPUT_CLASS} resize-y py-3`} placeholder="Atouts, état général, contexte…" /></FormField></div></WorkspacePanel>;
    case 1: return <WorkspacePanel title="Localisation" description="La localisation exacte reste visible selon le niveau de confidentialité défini à la publication." icon={MapPin}><div className="grid gap-5 sm:grid-cols-2"><FormField label="Commune" name="listing-city" required><select id="listing-city" value={draft.city} onChange={(event) => change("city", event.target.value)} className={INPUT_CLASS}><option value="">Sélectionner</option>{["Cotonou", "Abomey-Calavi", "Porto-Novo", "Ouidah"].map((city) => <option key={city}>{city}</option>)}</select></FormField><FormField label="Quartier" name="listing-district" required><input id="listing-district" value={draft.district} onChange={(event) => change("district", event.target.value)} maxLength={70} className={INPUT_CLASS} placeholder="Ex. Fidjrossè Calvaire" /></FormField><FormField label="Adresse / repère" name="listing-address" hint="Visible uniquement après validation de l’autorisation de visite."><input id="listing-address" value={draft.address} onChange={(event) => change("address", event.target.value)} maxLength={140} className={INPUT_CLASS} placeholder="Repère connu, voie principale…" /></FormField></div></WorkspacePanel>;
    case 2: return <WorkspacePanel title="Caractéristiques" description="Des caractéristiques précises aident le client à comparer les biens." icon={House}><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><FormField label="Surface (m²)" name="listing-surface" required><input id="listing-surface" type="number" min="1" value={draft.surface} onChange={(event) => change("surface", event.target.value)} className={INPUT_CLASS} /></FormField><FormField label="Chambres" name="listing-bedrooms"><input id="listing-bedrooms" type="number" min="0" value={draft.bedrooms} onChange={(event) => change("bedrooms", event.target.value)} className={INPUT_CLASS} /></FormField><FormField label="Pièces" name="listing-rooms"><input id="listing-rooms" type="number" min="0" value={draft.rooms} onChange={(event) => change("rooms", event.target.value)} className={INPUT_CLASS} /></FormField><FormField label="Salles d’eau" name="listing-bathrooms"><input id="listing-bathrooms" type="number" min="0" value={draft.bathrooms} onChange={(event) => change("bathrooms", event.target.value)} className={INPUT_CLASS} /></FormField></div><fieldset className="mt-5"><legend className="text-note font-semibold">Équipements</legend><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map((feature) => <label key={feature} className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-caption"><input type="checkbox" checked={draft.features.includes(feature)} onChange={(event) => change("features", event.target.checked ? [...draft.features, feature] : draft.features.filter((item) => item !== feature))} className="h-4 w-4 accent-homera-terracotta" />{feature}</label>)}</div></fieldset></WorkspacePanel>;
    case 3: return <WorkspacePanel title="Photos du bien" description="Une première galerie donne au client une représentation fidèle du logement." icon={ImagePlus}><label htmlFor="listing-photos" className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background p-6 text-center transition-colors hover:border-homera-terracotta"><ImagePlus className="h-8 w-8 text-homera-terracotta" aria-hidden="true" /><span className="mt-3 text-note font-semibold">Ajouter des photos</span><span className="mt-1 text-caption text-muted">JPG, PNG ou WebP · jusqu’à 12 noms de fichier</span><input id="listing-photos" type="file" accept="image/*" multiple onChange={(event) => updateFiles("photoNames", event.target.files)} className="sr-only" /></label><p className="mt-3 text-caption leading-relaxed text-muted">Pour des raisons de sécurité, le prototype n’enregistre que les noms affichés ci-dessous; les images ne quittent pas votre appareil.</p><FileList items={draft.photoNames} onRemove={(item) => removeFile("photoNames", item)} /></WorkspacePanel>;
    case 4: return <WorkspacePanel title="Prix & loyer" description="Le montant affiché dépend du projet choisi." icon={BadgeCheck}><div className="grid gap-5 sm:grid-cols-2"><FormField label={draft.intent === "acheter" ? "Prix de vente (FCFA)" : draft.intent === "sejour" ? "Prix par nuitée (FCFA)" : "Loyer mensuel (FCFA)"} name="listing-price" required><input id="listing-price" type="text" inputMode="numeric" value={draft.price} onChange={(event) => change("price", event.target.value.replace(/[^\d]/g, ""))} className={INPUT_CLASS} placeholder="Ex. 450000" /></FormField><FormField label="Unité de prix" name="listing-period"><select id="listing-period" value={draft.pricePeriod} onChange={(event) => change("pricePeriod", event.target.value)} className={INPUT_CLASS}><option value="">Déduite du projet</option><option value="mensuel">Par mois</option><option value="nuitée">Par nuitée</option><option value="forfait">Forfait</option></select></FormField></div></WorkspacePanel>;
    case 5: return <WorkspacePanel title="Conditions de location / vente" description="Clarifiez les conditions attendues avant la visite." icon={FileText}><div className="grid gap-5 sm:grid-cols-2"><FormField label="Dépôt / garantie (FCFA)" name="listing-deposit"><input id="listing-deposit" type="text" inputMode="numeric" value={draft.deposit} onChange={(event) => change("deposit", event.target.value.replace(/[^\d]/g, ""))} className={INPUT_CLASS} placeholder="Facultatif" /></FormField><FormField label="Durée minimale" name="listing-duration"><input id="listing-duration" value={draft.duration} onChange={(event) => change("duration", event.target.value)} className={INPUT_CLASS} placeholder="Ex. 12 mois ou 3 nuits" /></FormField><FormField label="Disponible à partir du" name="listing-available"><input id="listing-available" type="date" value={draft.availableFrom} onChange={(event) => change("availableFrom", event.target.value)} className={INPUT_CLASS} /></FormField></div><label htmlFor="listing-conditions" className="mt-5 block text-note font-semibold">Conditions particulières</label><textarea id="listing-conditions" rows={4} value={draft.conditions} onChange={(event) => change("conditions", event.target.value)} maxLength={800} className={`${INPUT_CLASS} mt-1 resize-y py-3`} placeholder="Charges, durée minimale, règlement intérieur…" /></WorkspacePanel>;
    case 6: return <WorkspacePanel title="Documents de propriété" description="Déclarez les pièces nécessaires au contrôle du dossier." icon={FileCheck2}><label htmlFor="listing-documents" className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background p-6 text-center hover:border-homera-terracotta"><UploadCloud className="h-7 w-7 text-homera-terracotta" aria-hidden="true" /><span className="mt-3 text-note font-semibold">Joindre un titre, une convention ou un mandat</span><span className="mt-1 text-caption text-muted">PDF, JPG ou PNG · noms uniquement dans le pilote</span><input id="listing-documents" type="file" accept=".pdf,image/*" multiple onChange={(event) => updateFiles("documentNames", event.target.files)} className="sr-only" /></label><FileList items={draft.documentNames} onRemove={(item) => removeFile("documentNames", item)} /><p className="mt-3 text-caption leading-relaxed text-muted">Les documents ne sont pas téléversés dans cette maquette. Ne sélectionnez pas de pièce personnelle sensible pour la démo.</p></WorkspacePanel>;
    case 7: return <WorkspacePanel title="Représentant / agent" description="Un agent n’accède au dossier que si le propriétaire lui accorde un mandat pour ce bien." icon={ShieldCheck}><FormField label="Représentant" name="listing-agent"><select id="listing-agent" value={draft.agentId} onChange={(event) => change("agentId", event.target.value)} className={INPUT_CLASS}><option value="">Aucun agent pour le moment</option><option value={DEMO_AGENT_ID}>{DEMO_AGENT_ID} · Koffi Ahouansou (démo)</option></select></FormField>{draft.agentId && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-note"><input type="checkbox" checked={draft.verifiedMandate} onChange={(event) => change("verifiedMandate", event.target.checked)} className="mt-1 h-4 w-4 accent-homera-terracotta" /><span>Je déclare détenir un mandat écrit valide couvrant ce bien et les actions confiées à l’agent.</span></label>}<p className="mt-4 text-caption leading-relaxed text-muted">Pour le pilote, l’agent proposé est un profil de démonstration. Cette sélection ne donne aucun accès réel.</p></WorkspacePanel>;
    case 8: return <WorkspacePanel title="Vérification & consentements" description="Confirmez l’exactitude des informations avant de générer l’aperçu." icon={ShieldCheck}><div className="space-y-3"><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-note"><input type="checkbox" checked={draft.verifiedOwner} onChange={(event) => change("verifiedOwner", event.target.checked)} className="mt-1 h-4 w-4 accent-homera-terracotta" /><span>Je déclare être propriétaire ou mandataire dûment habilité et pouvoir soumettre ce bien au contrôle.</span></label>{draft.agentId && <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-note"><input type="checkbox" checked={draft.verifiedMandate} onChange={(event) => change("verifiedMandate", event.target.checked)} className="mt-1 h-4 w-4 accent-homera-terracotta" /><span>Je certifie qu’un mandat écrit du propriétaire autorise l’agent sélectionné à représenter ce bien.</span></label>}</div><p className="mt-4 text-caption leading-relaxed text-muted">La soumission ne rend pas le bien « vérifié ». Une personne habilitée doit contrôler chaque pièce et consigner sa décision.</p></WorkspacePanel>;
    case 9: return <PropertyPreview draft={draft} />;
    default: return <WorkspacePanel title="Soumettre le bien" description="Confirmez la soumission du dossier à la file de vérification." icon={UploadCloud}><p className="text-note leading-relaxed text-muted">Le bien passera au statut « En vérification ». Il ne sera pas visible dans la recherche publique tant que les contrôles n’auront pas été effectués.</p><div className="mt-4 rounded-xl border border-warning/25 bg-warning/[0.06] p-4 text-caption leading-relaxed text-muted"><strong className="text-foreground">Avant de poursuivre :</strong> vérifiez le titre, l’adresse, le prix, les photos et l’autorisation du représentant. Les changements de statut du pilote ne valent pas validation juridique.</div></WorkspacePanel>;
  }
}

function PropertyPreview({ draft }: { draft: PropertyDraft }) {
  return <WorkspacePanel title="Prévisualisation de l’annonce" description="Voici le résumé que le client consultera après vérification et publication." icon={BadgeCheck}><div className="rounded-2xl border border-border bg-background p-5"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-homera-brown px-3 py-1.5 text-caption font-semibold text-white">{draft.intent || "Projet à choisir"} · {draft.type || "Type à choisir"}</span><span className="inline-flex items-center gap-1.5 text-caption font-semibold text-warning"><ShieldCheck className="h-4 w-4" aria-hidden="true" />En attente de vérification</span></div><h2 className="mt-5 font-serif text-display-sm">{draft.title || "Titre du bien"}</h2><p className="mt-2 flex items-center gap-2 text-note text-muted"><MapPin className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />{draft.district || "Quartier"}, {draft.city || "Commune"}</p><p className="homera-num mt-4 font-serif text-display-xs">{draft.price ? `${new Intl.NumberFormat("fr-FR").format(Number(draft.price))} FCFA` : "Prix à définir"}{draft.pricePeriod === "mensuel" ? " / mois" : draft.pricePeriod === "nuitée" ? " / nuitée" : ""}</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><PreviewItem label="Surface" value={draft.surface ? `${draft.surface} m²` : "À renseigner"} /><PreviewItem label="Pièces" value={draft.rooms || "—"} /><PreviewItem label="Chambres" value={draft.bedrooms || "—"} /></div><p className="mt-5 text-note leading-relaxed text-muted">{draft.notes || "La description détaillée n’a pas encore été ajoutée."}</p><div className="mt-5 border-t border-border pt-4"><p className="text-caption font-semibold">Photos déclarées</p><p className="mt-1 text-caption text-muted">{draft.photoNames.length ? draft.photoNames.join(" · ") : "Aucune photo"}</p><p className="mt-4 text-caption font-semibold">Documents déclarés</p><p className="mt-1 text-caption text-muted">{draft.documentNames.length ? draft.documentNames.join(" · ") : "Aucun document"}</p></div></div></WorkspacePanel>;
}
function FileList({ items, onRemove }: { items: string[]; onRemove: (name: string) => void }) {
  return <ul className="mt-4 space-y-2">{items.map((item) => <li key={item} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-caption"><FileText className="h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{item}</span><button type="button" onClick={() => onRemove(item)} aria-label={`Retirer ${item}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-error/[0.06] hover:text-error"><X className="h-3.5 w-3.5" aria-hidden="true" /></button></li>)}</ul>;
}
function PreviewItem({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-card p-3"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-muted">{label}</p><p className="mt-1 text-note font-semibold">{value}</p></div>; }
function formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date); }

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, FileCheck2,
  FileText, GripVertical, House, ImagePlus, Loader2, MapPin, Save, ShieldCheck,
  Star, UploadCloud, X,
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { EMPTY_PROPERTY_DRAFT, type PropertyDraft } from "@/lib/workflow";
import type { PropertyIntent, PropertyType } from "@/lib/content";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel, FormField, INPUT_CLASS, WorkspaceHeading, WorkspacePanel } from "@/components/workspace/Primitives";
import { Visual } from "@/components/ui/Visual";

/* ==================================================================
   HOMERA — DÉPÔT D’UN BIEN (branché sur le serveur)
   ------------------------------------------------------------------
   Onze étapes, une seule source : la base HOMERA. Dès que le titre, le
   projet, le type et la commune sont connus, le dossier est **créé côté
   serveur** ; chaque étape suivante le met à jour (`PATCH`), les photos
   et les pièces sont enregistrées à part entière, et la soumission
   ouvre un vrai dossier de vérification contrôlé par HOMERA.

   Ce que l’interface ne fait plus : inventer un statut. Le statut
   affiché est celui que renvoie le serveur, et la publication
   n’appartient pas au propriétaire.
   ================================================================== */

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

/** Libellé d’écran → clé d’équipement comprise par la base. */
const FEATURE_LABEL_TO_KEY: Record<string, string> = {
  Meublé: "meuble",
  Climatisation: "climatisation",
  "Cuisine équipée": "cuisine-equipee",
  Piscine: "piscine",
  Jardin: "jardin",
  Terrasse: "terrasse",
  Parking: "parking",
  Gardiennage: "gardien",
  "Eau courante": "eau-courante",
};
const FEATURES = Object.keys(FEATURE_LABEL_TO_KEY);

/** Visuels réellement présents dans la médiathèque HOMERA. */
const MEDIA_KEYS = [
  "prop-villa", "prop-villa-piscine", "prop-villa-cour", "prop-appartement",
  "prop-appartement-sejour", "prop-studio-meuble", "prop-duplex", "prop-duplex-terrasse",
  "prop-terrain", "prop-terrain-borne", "prop-local-commerce", "prop-immeuble-bureaux",
] as const;

const DOCUMENT_KINDS = [
  { id: "titre-foncier", label: "Titre foncier" },
  { id: "acd", label: "ACD / convention" },
  { id: "piece-identite", label: "Pièce d’identité" },
  { id: "mandat", label: "Mandat / procuration" },
  { id: "plan", label: "Plan ou croquis" },
  { id: "autre", label: "Autre pièce" },
] as const;

const MANDATE_SCOPES = [
  { id: "visite", label: "Faire visiter" },
  { id: "annonce", label: "Gérer l’annonce" },
  { id: "location", label: "Conclure la location" },
  { id: "gestion", label: "Gérer le bien" },
] as const;

type ServerProperty = {
  id: string;
  reference?: string;
  homeraId?: string;
  title: string;
  status: string;
  [key: string]: unknown;
};

type ServerPhoto = {
  id: string;
  media_key: string;
  alt: string;
  position: number;
  is_main: number;
  filename?: string | null;
  bytes?: number | null;
};
type ServerDocument = { id: string; kind: string; filename: string; status?: string; created_at?: string };
type AgentOption = { id: string; matricule: string; name: string; agency: string; zone: string; verification: string };

/** Traduction du formulaire vers le contrat serveur (`propertyDraftSchema`). */
function draftToPayload(draft: PropertyDraft) {
  return {
    title: draft.title.trim(),
    intent: (draft.intent || "louer") as PropertyIntent,
    type: (draft.type || "villa") as PropertyType,
    price: Number(draft.price) || 0,
    pricePeriod: draft.pricePeriod || "",
    city: draft.city.trim(),
    district: draft.district.trim(),
    address: draft.address.trim(),
    bedrooms: Number(draft.bedrooms) || 0,
    bathrooms: Number(draft.bathrooms) || 0,
    surface: Number(draft.surface) || 0,
    rooms: draft.rooms ? Number(draft.rooms) : null,
    description: draft.notes.trim(),
    conditions: [
      draft.conditions.trim(),
      draft.deposit ? `Dépôt / garantie : ${draft.deposit} FCFA` : "",
      draft.duration ? `Durée : ${draft.duration}` : "",
      draft.availableFrom ? `Disponible à partir du ${draft.availableFrom}` : "",
    ].filter(Boolean).join(" · "),
    furnished: draft.features.includes("Meublé"),
    features: draft.features.map((label) => FEATURE_LABEL_TO_KEY[label]).filter(Boolean),
  };
}

export function PropertyWizard({ initialListingId = "" }: { initialListingId?: string }) {
  const [draft, setDraft] = useState<PropertyDraft>(EMPTY_PROPERTY_DRAFT);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<{ tone: "ok" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  /** Le dossier côté serveur : `null` tant que le minimum n’est pas rempli. */
  const [property, setProperty] = useState<ServerProperty | null>(null);
  const [photos, setPhotos] = useState<ServerPhoto[]>([]);
  const [documents, setDocuments] = useState<ServerDocument[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(Boolean(initialListingId));
  const [notFound, setNotFound] = useState(false);

  // Pièces déclarées localement avant que le bien existe côté serveur.
  const [docDraft, setDocDraft] = useState<{ kind: string; filename: string }[]>([]);
  const [photoDraft, setPhotoDraft] = useState<string[]>([]);
  const [mainPhotoKey, setMainPhotoKey] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mandate, setMandate] = useState({
    agentId: "",
    agentEmail: "",
    agentName: "",
    scopes: ["visite"] as string[],
    proofLabel: "",
    expiresAt: "",
    note: "",
  });
  const [submitted, setSubmitted] = useState<ServerProperty | null>(null);

  const change = <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus(null);
  };

  /* ------------------------------------------------------------------
     CHARGEMENT D’UN DOSSIER EXISTANT (correction demandée par HOMERA)
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!initialListingId) return;
    let cancelled = false;
    void (async () => {
      const result = await apiGet<{ property: ServerProperty }>(`/api/properties/${initialListingId}`);
      if (cancelled) return;
      if (!result.ok) {
        setNotFound(true);
        setLoadingExisting(false);
        return;
      }
      const loaded = result.data.property;
      setProperty(loaded);
      const toLabel = (key: string) =>
        Object.entries(FEATURE_LABEL_TO_KEY).find(([, value]) => value === key)?.[0] ?? "";
      setDraft({
        ...EMPTY_PROPERTY_DRAFT,
        title: String(loaded.title ?? ""),
        intent: (loaded.intent as PropertyIntent) ?? "",
        type: (loaded.type as PropertyType) ?? "",
        city: String(loaded.city ?? ""),
        district: String(loaded.district ?? ""),
        address: String(loaded.address ?? ""),
        surface: loaded.surface ? String(loaded.surface) : "",
        bedrooms: loaded.bedrooms ? String(loaded.bedrooms) : "",
        rooms: loaded.rooms ? String(loaded.rooms) : "",
        bathrooms: loaded.bathrooms ? String(loaded.bathrooms) : "",
        price: loaded.price ? String(loaded.price) : "",
        pricePeriod: String(loaded.pricePeriod ?? ""),
        notes: String(loaded.description ?? ""),
        features: Array.isArray(loaded.features) ? (loaded.features as string[]).map(toLabel).filter(Boolean) : [],
      });
      const [photoResult, docResult] = await Promise.all([
        apiGet<{ photos: ServerPhoto[] }>(`/api/properties/${loaded.id}/photos`),
        apiGet<{ documents: ServerDocument[] }>(`/api/properties/${loaded.id}/documents`),
      ]);
      if (cancelled) return;
      if (photoResult.ok) {
        setPhotos(photoResult.data.photos);
        setMainPhotoKey(photoResult.data.photos.find((entry) => entry.is_main)?.media_key ?? photoResult.data.photos[0]?.media_key ?? "");
      }
      if (docResult.ok) setDocuments(docResult.data.documents);
      setLoadingExisting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialListingId]);

  /* Agents joignables pour un mandat. */
  useEffect(() => {
    void apiGet<{ agents: AgentOption[] }>("/api/agents").then((result) => {
      if (result.ok) setAgents(result.data.agents);
    });
  }, []);

  /* ------------------------------------------------------------------
     VALIDATION PAR ÉTAPE
     ------------------------------------------------------------------ */
  const validateStep = (index: number): string[] => {
    const issues: string[] = [];
    if (index === 0) {
      if (draft.title.trim().length < 6) issues.push("Le titre doit contenir au moins 6 caractères.");
      if (!draft.intent) issues.push("Choisissez le projet du bien.");
      if (!draft.type) issues.push("Choisissez le type de bien.");
    }
    if (index === 1) {
      if (!draft.city.trim()) issues.push("Indiquez la commune.");
      if (!draft.district.trim()) issues.push("Indiquez le quartier.");
    }
    if (index === 2 && (!draft.surface || Number(draft.surface) <= 0)) issues.push("La surface doit être supérieure à zéro.");
    if (index === 3 && photos.length === 0 && photoDraft.length === 0) issues.push("Choisissez au moins une photo du bien.");
    if (index === 4 && (!draft.price || Number(draft.price) <= 0)) issues.push("Indiquez un prix supérieur à zéro.");
    if (index === 6 && documents.length === 0 && docDraft.length === 0) issues.push("Déclarez au moins une pièce justificative.");
    if (index === 8 && !draft.verifiedOwner) issues.push("Confirmez être propriétaire ou mandataire habilité.");
    return issues;
  };

  /* ------------------------------------------------------------------
     ENREGISTREMENT SERVEUR
     ------------------------------------------------------------------ */
  const ensureProperty = useCallback(async (): Promise<ServerProperty | null> => {
    if (property) return property;
    const payload = draftToPayload(draft);
    const result = await apiPost<{ property: ServerProperty }>("/api/properties", payload);
    if (!result.ok) {
      const detail = Object.values(result.fields ?? {}).filter(Boolean);
      setErrors([result.message, ...detail]);
      return null;
    }
    setProperty(result.data.property);
    return result.data.property;
  }, [draft, property]);

  /** Pousse les pièces déclarées localement vers le serveur. */
  const flushDocuments = useCallback(async (target: ServerProperty) => {
    if (docDraft.length === 0) return true;
    for (const entry of docDraft) {
      const result = await apiPost<{ document: ServerDocument }>(`/api/properties/${target.id}/documents`, entry);
      if (!result.ok) {
        setErrors([result.message]);
        return false;
      }
      setDocuments((current) => [...current, result.data.document]);
    }
    setDocDraft([]);
    return true;
  }, [docDraft]);

  const flushPhotos = useCallback(async (target: ServerProperty) => {
    if (photoDraft.length === 0) return true;
    for (const mediaKey of photoDraft) {
      const result = await apiPost<{ photos: ServerPhoto[] }>(`/api/properties/${target.id}/photos`, {
        mediaKey,
        alt: draft.title || "Bien HOMERA",
      });
      if (!result.ok) {
        setErrors([result.message]);
        return false;
      }
      setPhotos(result.data.photos);
    }
    setPhotoDraft([]);
    const main = photoDraft.find((key) => key === mainPhotoKey) ?? photoDraft[0];
    if (main) {
      const current = await apiGet<{ photos: ServerPhoto[] }>(`/api/properties/${target.id}/photos`);
      if (current.ok) {
        const targetPhoto = current.data.photos.find((entry) => entry.media_key === main);
        if (targetPhoto) {
          const promoted = await apiPatch<{ photos: ServerPhoto[] }>(`/api/properties/${target.id}/photos`, { main: targetPhoto.id });
          if (promoted.ok) setPhotos(promoted.data.photos);
        }
      }
    }
    return true;
  }, [draft.title, photoDraft, mainPhotoKey]);

  /* Les photos du médiathèque attendent la validation du dossier ; un
     fichier envoyé, lui, est écrit tout de suite (le bien existe déjà
     côté serveur). On enregistre donc d’abord ce qui était en attente,
     puis on envoie : la galerie reste dans l’ordre réel du serveur. */
  const onUpload = useCallback(
    async (files: File[]) => {
      if (!property?.id || files.length === 0) return;
      setUploading(true);
      setUploadError(null);
      try {
        if (photoDraft.length > 0) {
          const flushed = await flushPhotos(property);
          if (!flushed) return;
        }
        const form = new FormData();
        for (const file of files) form.append("photos", file);
        const response = await fetch(`/api/properties/${property.id}/photos/upload`, { method: "POST", body: form });
        const body = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string; data?: { photos: ServerPhoto[]; rejected: { name: string; reason: string }[] } }
          | null;
        if (!response.ok || !body?.ok || !body.data) {
          setUploadError(body?.message ?? `Envoi refusé (HTTP ${response.status}).`);
          return;
        }
        setPhotos(body.data.photos);
        setPhotoDraft([]);
        const main = body.data.photos.find((entry) => entry.is_main) ?? body.data.photos[0];
        if (main) setMainPhotoKey(main.media_key);
        const refused = body.data.rejected ?? [];
        if (refused.length > 0) {
          setUploadError(refused.map((entry) => `${entry.name} — ${entry.reason}`).join(" · "));
        }
      } catch {
        setUploadError("L’envoi n’a pas abouti : vérifiez votre connexion et réessayez.");
      } finally {
        setUploading(false);
      }
    },
    [flushPhotos, photoDraft.length, property],
  );

  const persist = useCallback(async () => {
    if (!property) return;
    const result = await apiPatch<{ property: ServerProperty }>(`/api/properties/${property.id}`, draftToPayload(draft));
    if (!result.ok) {
      const detail = Object.values(result.fields ?? {}).filter(Boolean);
      setErrors([result.message, ...detail]);
      return false;
    }
    setProperty(result.data.property);
    return true;
  }, [draft, property]);

  const goNext = async () => {
    const issues = validateStep(step);
    if (issues.length) {
      setErrors(issues);
      setStatus(null);
      return;
    }
    setErrors([]);
    setBusy(true);
    // Le dossier naît côté serveur dès que localisation et titre sont connus.
    if (!property && step >= 1) {
      const created = await ensureProperty();
      setBusy(false);
      if (!created) return;
    }
    if (step === 3) {
      const target = property ?? (await ensureProperty());
      if (target && !(await flushPhotos(target))) {
        setBusy(false);
        return;
      }
    }
    if (step === 6) {
      const target = property ?? (await ensureProperty());
      if (target && !(await flushDocuments(target))) {
        setBusy(false);
        return;
      }
    }
    const saved = property ? await persist() : true;
    setBusy(false);
    if (!saved) return;
    setStatus({ tone: "ok", text: property ? "Étape enregistrée sur votre dossier HOMERA." : "Dossier créé sur le serveur HOMERA." });
    setStep(Math.min(STEPS.length - 1, step + 1));
  };

  const goBack = () => {
    setErrors([]);
    setStatus(null);
    setStep(Math.max(0, step - 1));
  };

  const goToStep = (target: number) => {
    if (target >= step) return;
    setErrors([]);
    setStatus(null);
    setStep(target);
  };

  const submitListing = async () => {
    const allIssues = STEPS.flatMap((_, index) =>
      validateStep(index).map((message) => `Étape ${String(index + 1).padStart(2, "0")} · ${message}`),
    );
    if (allIssues.length) {
      setErrors(allIssues);
      setStep(Math.max(0, STEPS.findIndex((_, index) => validateStep(index).length > 0)));
      return;
    }
    setErrors([]);
    setBusy(true);
    const target = property ?? (await ensureProperty());
    if (!target) {
      setBusy(false);
      return;
    }
    if (!(await flushPhotos(target)) || !(await flushDocuments(target))) {
      setBusy(false);
      return;
    }
    await persist();

    // Un mandat demandé devient une vraie demande d’autorisation.
    if (mandate.agentId || mandate.agentEmail) {
      const authResult = await apiPost<{ authorization: { id: string } }>("/api/authorizations", {
        propertyId: target.id,
        agentId: mandate.agentId || null,
        agentEmail: mandate.agentEmail,
        agentName: mandate.agentName,
        scope: mandate.scopes,
        proofLabel: mandate.proofLabel || "Mandat déclaré par le propriétaire",
        expiresAt: mandate.expiresAt,
        note: mandate.note,
      });
      if (!authResult.ok) {
        // Le bien reste soumis : l’absence de mandat ne bloque pas le dépôt.
        setErrors([`Mandat non enregistré : ${authResult.message}`]);
      }
    }

    const result = await apiPost<{ property: ServerProperty }>(`/api/properties/${target.id}/submit`);
    setBusy(false);
    if (!result.ok) {
      setErrors([result.message]);
      return;
    }
    setProperty(result.data.property);
    setSubmitted(result.data.property);
  };

  /* ------------------------------------------------------------------
     GALERIE
     ------------------------------------------------------------------ */
  const chosenKeys = useMemo(
    () => [...photos.map((entry) => entry.media_key), ...photoDraft],
    [photos, photoDraft],
  );

  const addPhoto = async (mediaKey: string) => {
    setStatus(null);
    if (chosenKeys.includes(mediaKey)) return;
    if (!mainPhotoKey) setMainPhotoKey(mediaKey);
    if (!property) {
      setPhotoDraft((current) => [...current, mediaKey]);
      return;
    }
    setBusy(true);
    const result = await apiPost<{ photos: ServerPhoto[] }>(`/api/properties/${property.id}/photos`, {
      mediaKey,
      alt: draft.title || "Bien HOMERA",
    });
    setBusy(false);
    if (!result.ok) {
      setErrors([result.message]);
      return;
    }
    setPhotos(result.data.photos);
    if (!photos.length || mainPhotoKey === mediaKey) await setMain(mediaKey, result.data.photos);
  };

  const removePhoto = async (mediaKey: string) => {
    if (!property) {
      setPhotoDraft((current) => current.filter((entry) => entry !== mediaKey));
      return;
    }
    const row = photos.find((entry) => entry.media_key === mediaKey);
    if (!row) return;
    setBusy(true);
    const result = await apiDelete<{ photos: ServerPhoto[] }>(`/api/properties/${property.id}/photos?photo=${row.id}`);
    setBusy(false);
    if (!result.ok) {
      setErrors([result.message]);
      return;
    }
    setPhotos(result.data.photos);
  };

  const setMain = async (mediaKey: string, list = photos) => {
    setMainPhotoKey(mediaKey);
    if (!property) return;
    const row = list.find((entry) => entry.media_key === mediaKey);
    if (!row || row.is_main) return;
    setBusy(true);
    const result = await apiPatch<{ photos: ServerPhoto[] }>(`/api/properties/${property.id}/photos`, { main: row.id });
    setBusy(false);
    if (result.ok) setPhotos(result.data.photos);
  };

  const movePhoto = async (mediaKey: string, direction: -1 | 1) => {
    if (!property) return;
    const order = [...photos].sort((a, b) => a.position - b.position).map((entry) => entry.media_key);
    const index = order.indexOf(mediaKey);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    setBusy(true);
    const result = await apiPatch<{ photos: ServerPhoto[] }>(`/api/properties/${property.id}/photos`, { order });
    setBusy(false);
    if (result.ok) setPhotos(result.data.photos);
  };

  /* ------------------------------------------------------------------
     PIÈCES
     ------------------------------------------------------------------ */
  const [docKind, setDocKind] = useState<string>("titre-foncier");
  const [docName, setDocName] = useState("");

  const addDocument = async () => {
    const filename = docName.trim();
    if (!filename) {
      setErrors(["Indiquez le nom du fichier de la pièce."]);
      return;
    }
    if (!property) {
      setDocDraft((current) => [...current, { kind: docKind, filename }]);
      setDocName("");
      setStatus({ tone: "info", text: "Pièce notée : elle sera transmise au serveur avec le dossier." });
      return;
    }
    setBusy(true);
    const result = await apiPost<{ document: ServerDocument }>(`/api/properties/${property.id}/documents`, {
      kind: docKind,
      filename,
    });
    setBusy(false);
    if (!result.ok) {
      setErrors([result.message]);
      return;
    }
    setDocuments((current) => [...current, result.data.document]);
    setDocName("");
  };

  /* ------------------------------------------------------------------
     RENDU
     ------------------------------------------------------------------ */
  if (loadingExisting) {
    return <div className="mx-auto flex max-w-3xl items-center gap-3 py-20 text-note text-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Chargement du dossier…</div>;
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-4xl">
        <WorkspaceHeading eyebrow="Dossier propriétaire" title="Dossier introuvable" description="Cette référence n’existe pas ou ne vous appartient pas." />
        <EmptyPanel
          icon={House}
          title="Ce dossier n’est pas accessible"
          description="Retournez à vos biens pour consulter les références et leurs statuts réels."
          action={<Link href="/proprietaire/biens" className={BUTTON_PRIMARY}>Mes biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl rounded-card border border-success/25 bg-card p-7 text-center shadow-[var(--shadow-card)] sm:p-10">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden="true" />
        <p className="mt-4 text-caption font-semibold uppercase tracking-[0.16em] text-success">Dossier soumis</p>
        <h1 className="mt-2 font-serif text-display-sm">Le bien est en vérification</h1>
        <p className="mx-auto mt-3 max-w-xl text-body-sm leading-relaxed text-muted">
          Le dossier est enregistré sur le serveur HOMERA. Il n’est pas encore publié : une personne habilitée
          contrôle les pièces, étape par étape, avant toute mise en ligne.
        </p>
        <p className="mt-5 font-mono text-body-sm font-semibold">
          {String(submitted.homeraId ?? submitted.reference ?? submitted.id)}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/proprietaire/biens" className={BUTTON_PRIMARY}>Voir mes biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link href="/proprietaire" className={BUTTON_SECONDARY}>Retour au tableau de bord</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <WorkspaceHeading
        eyebrow={initialListingId ? "Mise à jour d’un dossier" : "Nouveau dossier immobilier"}
        title={initialListingId ? "Corriger le dossier" : "Ajouter un bien"}
        description={
          initialListingId
            ? "Complétez les éléments demandés, puis renvoyez le dossier dans la file de vérification."
            : "Onze étapes. Le dossier est enregistré sur le serveur HOMERA dès la localisation connue."
        }
        actions={
          property ? (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-background px-3 text-caption font-semibold">
              <Save className="h-4 w-4" aria-hidden="true" />{String(property.homeraId ?? property.reference ?? "")}
            </span>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-btn border border-dashed border-border bg-background px-3 text-caption text-muted">
              Brouillon non encore transmis
            </span>
          )
        }
      />

      {status && (
        <p role="status" className={`mb-4 rounded-xl border px-4 py-3 text-caption font-semibold ${status.tone === "ok" ? "border-success/20 bg-success/[0.05] text-success" : "border-info/20 bg-info/[0.05] text-info"}`}>
          {status.text}
        </p>
      )}
      {errors.length > 0 && (
        <div role="alert" className="mb-5 rounded-2xl border border-error/25 bg-error/[0.05] p-4">
          <p className="font-semibold text-error">Corrigez les points suivants :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-caption text-error">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-muted">Étape {String(step + 1).padStart(2, "0")} <span className="px-1 text-muted-light">/</span> {STEPS.length}</p>
          <p className="text-caption font-semibold">{STEPS[step]}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-hover">
          <div className="h-full rounded-full bg-homera-terracotta transition-[width] duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <ol className="mt-4 flex gap-1 overflow-x-auto pb-1" aria-label="Progression du formulaire">
          {STEPS.map((label, index) => (
            <li key={label} className="shrink-0">
              <button
                type="button"
                aria-current={index === step ? "step" : undefined}
                onClick={() => goToStep(index)}
                disabled={index >= step}
                title={label}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-caption font-semibold ${index === step ? "bg-homera-brown text-white" : index < step ? "bg-success/10 text-success" : "bg-surface-hover text-muted-light"} disabled:cursor-default`}
              >
                {index < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : String(index + 1).padStart(2, "0")}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <WizardStep
        step={step}
        draft={draft}
        change={change}
        photos={photos}
        photoDraft={photoDraft}
        chosenKeys={chosenKeys}
        mainPhotoKey={mainPhotoKey}
        onAddPhoto={addPhoto}
        onRemovePhoto={removePhoto}
        onMainPhoto={setMain}
        onMovePhoto={movePhoto}
        onUpload={(files) => void onUpload(files)}
        uploading={uploading}
        uploadError={uploadError}
        canUpload={Boolean(property?.id)}
        documents={documents}
        docDraft={docDraft}
        docKind={docKind}
        setDocKind={setDocKind}
        docName={docName}
        setDocName={setDocName}
        onAddDocument={addDocument}
        agents={agents}
        mandate={mandate}
        setMandate={setMandate}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={goBack} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-btn px-3 text-note font-semibold text-muted hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Étape précédente
        </button>
        {step < 9 ? (
          <button type="button" onClick={() => void goNext()} disabled={busy} className={`${BUTTON_PRIMARY} disabled:opacity-60`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Étape suivante<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : step === 9 ? (
          <button type="button" onClick={() => void goNext()} disabled={busy} className={`${BUTTON_PRIMARY} disabled:opacity-60`}>Valider la prévisualisation<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        ) : (
          <button type="button" onClick={() => void submitListing()} disabled={busy} className={`${BUTTON_PRIMARY} disabled:opacity-60`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="h-4 w-4" aria-hidden="true" />}Soumettre à vérification
          </button>
        )}
      </div>
    </div>
  );
}

/* ==================================================================
   ÉTAPES
   ================================================================== */

type StepProps = {
  step: number;
  draft: PropertyDraft;
  change: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void;
  photos: ServerPhoto[];
  photoDraft: string[];
  chosenKeys: string[];
  mainPhotoKey: string;
  onAddPhoto: (key: string) => void;
  onRemovePhoto: (key: string) => void;
  onMainPhoto: (key: string) => void;
  onMovePhoto: (key: string, direction: -1 | 1) => void;
  onUpload: (files: File[]) => void;
  uploading: boolean;
  uploadError: string | null;
  canUpload: boolean;
  documents: ServerDocument[];
  docDraft: { kind: string; filename: string }[];
  docKind: string;
  setDocKind: (kind: string) => void;
  docName: string;
  setDocName: (name: string) => void;
  onAddDocument: () => void;
  agents: AgentOption[];
  mandate: {
    agentId: string;
    agentEmail: string;
    agentName: string;
    scopes: string[];
    proofLabel: string;
    expiresAt: string;
    note: string;
  };
  setMandate: (next: {
    agentId: string;
    agentEmail: string;
    agentName: string;
    scopes: string[];
    proofLabel: string;
    expiresAt: string;
    note: string;
  }) => void;
};

function WizardStep(props: StepProps) {
  const { step, draft, change } = props;
  switch (step) {
    case 0:
      return (
        <WorkspacePanel title="Informations générales" description="Posez les repères principaux de l’annonce." icon={House}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Titre de l’annonce" name="listing-title" hint="Ex. Villa familiale avec jardin à Fidjrossè" required>
              <input id="listing-title" value={draft.title} onChange={(event) => change("title", event.target.value)} maxLength={90} className={INPUT_CLASS} placeholder="Titre clair et fidèle au bien" />
            </FormField>
            <FormField label="Projet" name="listing-intent" required>
              <select id="listing-intent" value={draft.intent} onChange={(event) => change("intent", event.target.value as PropertyIntent | "")} className={INPUT_CLASS}>
                <option value="">Choisir le projet</option>{INTENTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </FormField>
            <FormField label="Type de bien" name="listing-type" required>
              <select id="listing-type" value={draft.type} onChange={(event) => change("type", event.target.value as PropertyType | "")} className={INPUT_CLASS}>
                <option value="">Choisir le type</option>{PROPERTY_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </FormField>
            <FormField label="Description" name="listing-notes" hint="Elle pourra être complétée plus tard.">
              <textarea id="listing-notes" rows={3} value={draft.notes} onChange={(event) => change("notes", event.target.value)} maxLength={600} className={`${INPUT_CLASS} resize-y py-3`} placeholder="Atouts, état général, contexte…" />
            </FormField>
          </div>
        </WorkspacePanel>
      );

    case 1:
      return (
        <WorkspacePanel title="Localisation" description="Dès cette étape validée, le dossier est créé sur le serveur HOMERA." icon={MapPin}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Commune" name="listing-city" required>
              <select id="listing-city" value={draft.city} onChange={(event) => change("city", event.target.value)} className={INPUT_CLASS}>
                <option value="">Sélectionner</option>{["Cotonou", "Abomey-Calavi", "Porto-Novo", "Ouidah"].map((city) => <option key={city}>{city}</option>)}
              </select>
            </FormField>
            <FormField label="Quartier" name="listing-district" required>
              <input id="listing-district" value={draft.district} onChange={(event) => change("district", event.target.value)} maxLength={70} className={INPUT_CLASS} placeholder="Ex. Fidjrossè Calvaire" />
            </FormField>
            <FormField label="Adresse / repère" name="listing-address" hint="Visible après validation de l’autorisation de visite.">
              <input id="listing-address" value={draft.address} onChange={(event) => change("address", event.target.value)} maxLength={140} className={INPUT_CLASS} placeholder="Repère connu, voie principale…" />
            </FormField>
          </div>
        </WorkspacePanel>
      );

    case 2:
      return (
        <WorkspacePanel title="Caractéristiques" description="Des caractéristiques précises aident le client à comparer les biens." icon={House}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Surface (m²)" name="listing-surface" required><input id="listing-surface" type="number" min={1} value={draft.surface} onChange={(event) => change("surface", event.target.value)} className={INPUT_CLASS} /></FormField>
            <FormField label="Chambres" name="listing-bedrooms"><input id="listing-bedrooms" type="number" min={0} value={draft.bedrooms} onChange={(event) => change("bedrooms", event.target.value)} className={INPUT_CLASS} /></FormField>
            <FormField label="Pièces" name="listing-rooms"><input id="listing-rooms" type="number" min={0} value={draft.rooms} onChange={(event) => change("rooms", event.target.value)} className={INPUT_CLASS} /></FormField>
            <FormField label="Salles d’eau" name="listing-bathrooms"><input id="listing-bathrooms" type="number" min={0} value={draft.bathrooms} onChange={(event) => change("bathrooms", event.target.value)} className={INPUT_CLASS} /></FormField>
          </div>
          <fieldset className="mt-5">
            <legend className="text-note font-semibold">Équipements</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <label key={feature} className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-caption">
                  <input type="checkbox" checked={draft.features.includes(feature)} onChange={(event) => change("features", event.target.checked ? [...draft.features, feature] : draft.features.filter((item) => item !== feature))} className="h-4 w-4 accent-homera-terracotta" />{feature}
                </label>
              ))}
            </div>
          </fieldset>
        </WorkspacePanel>
      );

    case 3:
      return <PhotoStep {...props} />;

    case 4:
      return (
        <WorkspacePanel title="Prix & loyer" description="Le montant affiché dépend du projet choisi." icon={BadgeCheck}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label={draft.intent === "acheter" ? "Prix de vente (FCFA)" : draft.intent === "sejour" ? "Prix par nuitée (FCFA)" : "Loyer mensuel (FCFA)"} name="listing-price" required>
              <input id="listing-price" type="text" inputMode="numeric" value={draft.price} onChange={(event) => change("price", event.target.value.replace(/[^\d]/g, ""))} className={INPUT_CLASS} placeholder="Ex. 450000" />
            </FormField>
            <FormField label="Unité de prix" name="listing-period">
              <select id="listing-period" value={draft.pricePeriod} onChange={(event) => change("pricePeriod", event.target.value)} className={INPUT_CLASS}>
                <option value="">Déduite du projet</option><option value="mensuel">Par mois</option><option value="nuitée">Par nuitée</option><option value="forfait">Forfait</option>
              </select>
            </FormField>
          </div>
        </WorkspacePanel>
      );

    case 5:
      return (
        <WorkspacePanel title="Conditions de location / vente" description="Clarifiez les conditions attendues avant la visite." icon={FileText}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Dépôt / garantie (FCFA)" name="listing-deposit"><input id="listing-deposit" type="text" inputMode="numeric" value={draft.deposit} onChange={(event) => change("deposit", event.target.value.replace(/[^\d]/g, ""))} className={INPUT_CLASS} placeholder="Facultatif" /></FormField>
            <FormField label="Durée minimale" name="listing-duration"><input id="listing-duration" value={draft.duration} onChange={(event) => change("duration", event.target.value)} className={INPUT_CLASS} placeholder="Ex. 12 mois ou 3 nuits" /></FormField>
            <FormField label="Disponible à partir du" name="listing-available"><input id="listing-available" type="date" value={draft.availableFrom} onChange={(event) => change("availableFrom", event.target.value)} className={INPUT_CLASS} /></FormField>
          </div>
          <label htmlFor="listing-conditions" className="mt-5 block text-note font-semibold">Conditions particulières</label>
          <textarea id="listing-conditions" rows={4} value={draft.conditions} onChange={(event) => change("conditions", event.target.value)} maxLength={800} className={`${INPUT_CLASS} mt-1 resize-y py-3`} placeholder="Charges, durée minimale, règlement intérieur…" />
        </WorkspacePanel>
      );

    case 6:
      return <DocumentStep {...props} />;

    case 7:
      return <MandateStep {...props} />;

    case 8:
      return (
        <WorkspacePanel title="Vérification & consentements" description="Confirmez l’exactitude des informations avant de générer l’aperçu." icon={ShieldCheck}>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-note">
              <input type="checkbox" checked={draft.verifiedOwner} onChange={(event) => change("verifiedOwner", event.target.checked)} className="mt-1 h-4 w-4 accent-homera-terracotta" />
              <span>Je déclare être propriétaire ou mandataire dûment habilité et pouvoir soumettre ce bien au contrôle.</span>
            </label>
            {props.mandate.agentId || props.mandate.agentEmail ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-note">
                <input type="checkbox" checked={draft.verifiedMandate} onChange={(event) => change("verifiedMandate", event.target.checked)} className="mt-1 h-4 w-4 accent-homera-terracotta" />
                <span>Je certifie qu’un mandat écrit autorise l’agent désigné à représenter ce bien.</span>
              </label>
            ) : null}
          </div>
          <p className="mt-4 text-caption leading-relaxed text-muted">
            La soumission ne rend pas le bien « vérifié ». Une personne habilitée doit contrôler chaque pièce et
            consigner sa décision : le statut affiché vient du serveur, jamais de cette case.
          </p>
        </WorkspacePanel>
      );

    case 9:
      return <PropertyPreview draft={draft} photos={props.photos} photoDraft={props.photoDraft} />;

    default:
      return (
        <WorkspacePanel title="Soumettre le bien" description="Confirmez la soumission du dossier à la file de vérification." icon={UploadCloud}>
          <p className="text-note leading-relaxed text-muted">
            Le bien passera au statut « soumis », puis « en vérification ». Il ne sera visible dans la recherche
            publique qu’après le contrôle documentaire réalisé par HOMERA.
          </p>
          <div className="mt-4 rounded-xl border border-warning/25 bg-warning/[0.06] p-4 text-caption leading-relaxed text-muted">
            <strong className="text-foreground">Avant de poursuivre :</strong> vérifiez le titre, l’adresse, le prix,
            les photos et le mandat du représentant. Le contrôle HOMERA n’est pas une validation juridique.
          </div>
        </WorkspacePanel>
      );
  }
}

/* ------------------------------------------------------------------ photos */

function PhotoStep(props: StepProps) {
  const { photos, photoDraft, chosenKeys, mainPhotoKey, onAddPhoto, onRemovePhoto, onMainPhoto, onMovePhoto, onUpload, uploading, uploadError, canUpload } = props;
  const order = [...photos].sort((a, b) => a.position - b.position);
  return (
    <WorkspacePanel title="Photos du bien" description="Choisissez les visuels de la galerie, désignez la photo principale et ordonnez-les." icon={ImagePlus}>
      <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4">
        <label htmlFor="photos-envoi" className="block text-note font-semibold text-foreground">
          Ajouter vos propres photos
        </label>
        <input
          id="photos-envoi"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={!canUpload || uploading}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length > 0) onUpload(files);
          }}
          className="mt-2 block w-full max-w-xl cursor-pointer rounded-input border border-border bg-card px-3 py-2 text-caption text-foreground file:mr-3 file:cursor-pointer file:rounded-btn file:border-0 file:bg-homera-terracotta file:px-3 file:py-2 file:text-caption file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="mt-2 text-caption leading-relaxed text-muted">
          JPEG, PNG, WebP ou AVIF · 8 Mo par photo · 12 photos par bien. Les fichiers sont contrôlés côté
          serveur, rangés hors du code, et l’ordre comme la photo principale sont enregistrés définitivement.
        </p>
        {uploading && (
          <p className="mt-2 inline-flex items-center gap-2 text-caption font-semibold text-homera-terracotta">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Envoi en cours…
          </p>
        )}
        {uploadError && (
          <p role="alert" className="mt-2 text-caption leading-relaxed text-error">
            {uploadError}
          </p>
        )}
      </div>

      {chosenKeys.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {order.map((photo, index) => (
            <li key={photo.id} className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="relative aspect-[4/3]">
                <Visual mediaKey={photo.media_key} alt={photo.alt || "Photo du bien"} sizes="260px" veil="none" quality={68} className="absolute inset-0 h-full w-full" />
                {mainPhotoKey === photo.media_key && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-homera-brown px-2.5 py-1 text-micro font-semibold text-white">
                    <Star className="h-3 w-3" aria-hidden="true" />Principale
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <button type="button" onClick={() => onMainPhoto(photo.media_key)} aria-label={`Désigner ${photo.filename ?? photo.media_key} comme photo principale`} className="flex min-h-8 items-center gap-1 rounded-lg px-2 text-micro font-semibold text-homera-terracotta hover:bg-surface-hover">
                  <Star className="h-3 w-3" aria-hidden="true" />Principale
                </button>
                <span className="flex items-center">
                  <button type="button" onClick={() => onMovePhoto(photo.media_key, -1)} disabled={index === 0} aria-label="Avancer la photo" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover disabled:opacity-30"><GripVertical className="h-3.5 w-3.5 rotate-90" aria-hidden="true" /></button>
                  <button type="button" onClick={() => onMovePhoto(photo.media_key, 1)} disabled={index === order.length - 1} aria-label="Reculer la photo" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover disabled:opacity-30"><GripVertical className="h-3.5 w-3.5 -rotate-90" aria-hidden="true" /></button>
                  <button type="button" onClick={() => onRemovePhoto(photo.media_key)} aria-label={`Retirer ${photo.filename ?? photo.media_key}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-error/[0.06] hover:text-error"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </span>
              </div>
            </li>
          ))}
          {photoDraft.map((key) => (
            <li key={key} className="overflow-hidden rounded-2xl border border-dashed border-border bg-background">
              <div className="relative aspect-[4/3] opacity-70">
                <Visual mediaKey={key} alt="Photo à enregistrer" sizes="260px" veil="none" quality={62} className="absolute inset-0 h-full w-full" />
              </div>
              <p className="p-2 text-micro text-muted">À enregistrer avec le dossier</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-note font-semibold">Médiathèque</p>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MEDIA_KEYS.filter((key) => !chosenKeys.includes(key)).map((key) => (
          <li key={key}>
            <button type="button" onClick={() => onAddPhoto(key)} className="group block w-full overflow-hidden rounded-xl border border-border bg-background text-left transition-colors hover:border-homera-terracotta">
              <span className="relative block aspect-[4/3]">
                <Visual mediaKey={key} alt={key} sizes="200px" veil="none" quality={62} className="absolute inset-0 h-full w-full" />
              </span>
              <span className="block truncate px-2 py-1.5 text-micro text-muted">{key}</span>
            </button>
          </li>
        ))}
      </ul>
    </WorkspacePanel>
  );
}

/* -------------------------------------------------------------- documents */

function DocumentStep(props: StepProps) {
  const { documents, docDraft, docKind, setDocKind, docName, setDocName, onAddDocument } = props;
  return (
    <WorkspacePanel title="Documents de propriété" description="Déclarez les pièces nécessaires au contrôle du dossier." icon={FileCheck2}>
      <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        <label className="space-y-1.5 text-caption font-semibold" htmlFor="doc-kind">Type de pièce
          <select id="doc-kind" value={docKind} onChange={(event) => setDocKind(event.target.value)} className={INPUT_CLASS}>
            {DOCUMENT_KINDS.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-caption font-semibold" htmlFor="doc-name">Nom du fichier
          <input id="doc-name" value={docName} onChange={(event) => setDocName(event.target.value)} className={INPUT_CLASS} placeholder="titre-foncier-000421.pdf" />
        </label>
        <button type="button" onClick={onAddDocument} className={BUTTON_SECONDARY}><FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />Déclarer la pièce</button>
      </div>

      <ul className="mt-4 space-y-2">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-caption">
            <FileText className="h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{doc.filename}</span>
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-micro">{DOCUMENT_KINDS.find((kind) => kind.id === doc.kind)?.label ?? doc.kind}</span>
            <span className="shrink-0 text-micro text-muted">{doc.status ?? "declare"}</span>
          </li>
        ))}
        {docDraft.map((doc) => (
          <li key={`${doc.kind}-${doc.filename}`} className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-caption text-muted">
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{doc.filename}</span>
            <span className="shrink-0 text-micro">à transmettre</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-caption leading-relaxed text-muted">
        Les pièces sont enregistrées sur votre dossier : HOMERA sait quelles pièces sont déclarées et lesquelles
        restent à fournir. <strong className="text-foreground">Le fichier lui-même n’est pas encore hébergé</strong> —
        le stockage sécurisé des justificatifs n’est pas ouvert dans ce pilote.
      </p>
    </WorkspacePanel>
  );
}

/* ---------------------------------------------------------------- mandat */

function MandateStep(props: StepProps) {
  const { agents, mandate, setMandate } = props;
  const update = (patch: Partial<typeof mandate>) => setMandate({ ...mandate, ...patch });
  const toggleScope = (scope: string) =>
    update({ scopes: mandate.scopes.includes(scope) ? mandate.scopes.filter((entry) => entry !== scope) : [...mandate.scopes, scope] });

  return (
    <WorkspacePanel title="Représentant / agent" description="Un agent n’accède au dossier qu’avec un mandat accepté : la demande est enregistrée, l’agent et l’administration sont notifiés." icon={ShieldCheck}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Agent HOMERA" name="mandate-agent" hint="Seuls les comptes portant le rôle agent sont proposés.">
          <select id="mandate-agent" value={mandate.agentId} onChange={(event) => update({ agentId: event.target.value, agentEmail: event.target.value ? "" : mandate.agentEmail })} className={INPUT_CLASS}>
            <option value="">Aucun agent pour le moment</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.matricule} · {agent.name}{agent.agency ? ` · ${agent.agency}` : ""}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Ou inviter par e-mail" name="mandate-email" hint="Si l’agent n’a pas encore de compte HOMERA.">
          <input id="mandate-email" type="email" value={mandate.agentEmail} onChange={(event) => update({ agentEmail: event.target.value, agentId: event.target.value ? "" : mandate.agentId })} className={INPUT_CLASS} placeholder="agent@cabinet.bj" />
        </FormField>
        <FormField label="Nature du mandat" name="mandate-proof" required>
          <input id="mandate-proof" value={mandate.proofLabel} onChange={(event) => update({ proofLabel: event.target.value })} className={INPUT_CLASS} placeholder="Mandat de gestion signé le 12/10/2026" />
        </FormField>
        <FormField label="Fin de validité" name="mandate-expires" required>
          <input id="mandate-expires" type="date" value={mandate.expiresAt} onChange={(event) => update({ expiresAt: event.target.value })} className={INPUT_CLASS} />
        </FormField>
      </div>

      <fieldset className="mt-5">
        <legend className="text-note font-semibold">Actions autorisées</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {MANDATE_SCOPES.map((scope) => (
            <label key={scope.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-caption">
              <input type="checkbox" checked={mandate.scopes.includes(scope.id)} onChange={() => toggleScope(scope.id)} className="h-4 w-4 accent-homera-terracotta" />{scope.label}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-4 text-caption leading-relaxed text-muted">
        La demande est créée au statut « en attente ». Elle n’ouvre aucun accès tant que l’agent ne l’a pas
        acceptée ; elle peut être refusée, révoquée, contestée ou arriver à expiration, et chaque mouvement est
        consigné dans l’historique du mandat.
      </p>
    </WorkspacePanel>
  );
}

/* --------------------------------------------------------- prévisualisation */

function PropertyPreview({ draft, photos, photoDraft }: { draft: PropertyDraft; photos: ServerPhoto[]; photoDraft: string[] }) {
  const cover = photos.find((photo) => photo.is_main)?.media_key ?? photos[0]?.media_key ?? photoDraft[0] ?? "";
  return (
    <WorkspacePanel title="Prévisualisation de l’annonce" description="Le résumé que le client consultera après vérification et publication." icon={BadgeCheck}>
      <div className="rounded-2xl border border-border bg-background p-5">
        {cover && (
          <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-xl">
            <Visual mediaKey={cover} alt={draft.title || "Bien HOMERA"} sizes="640px" veil="none" quality={72} className="absolute inset-0 h-full w-full" />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-homera-brown px-3 py-1.5 text-caption font-semibold text-white">{draft.intent || "Projet à choisir"} · {draft.type || "Type à choisir"}</span>
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-warning"><ShieldCheck className="h-4 w-4" aria-hidden="true" />En attente de vérification</span>
        </div>
        <h2 className="mt-5 font-serif text-display-sm">{draft.title || "Titre du bien"}</h2>
        <p className="mt-2 flex items-center gap-2 text-note text-muted"><MapPin className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />{draft.district || "Quartier"}, {draft.city || "Commune"}</p>
        <p className="homera-num mt-4 font-serif text-display-xs">
          {draft.price ? `${new Intl.NumberFormat("fr-FR").format(Number(draft.price))} FCFA` : "Prix à définir"}
          {draft.pricePeriod === "mensuel" ? " / mois" : draft.pricePeriod === "nuitée" ? " / nuitée" : ""}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <PreviewItem label="Surface" value={draft.surface ? `${draft.surface} m²` : "À renseigner"} />
          <PreviewItem label="Pièces" value={draft.rooms || "—"} />
          <PreviewItem label="Chambres" value={draft.bedrooms || "—"} />
        </div>
        <p className="mt-5 text-note leading-relaxed text-muted">{draft.notes || "La description détaillée n’a pas encore été ajoutée."}</p>
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-caption font-semibold">Galerie</p>
          <p className="mt-1 text-caption text-muted">{photos.length + photoDraft.length} visuel(s) · principale : {cover || "aucune"}</p>
        </div>
      </div>
    </WorkspacePanel>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</p><p className="mt-1 text-note font-semibold">{value}</p></div>;
}

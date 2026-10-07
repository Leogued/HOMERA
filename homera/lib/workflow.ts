import type { PropertyType, PropertyIntent } from "@/lib/content";

export type VisitStatus =
  | "demande-envoyee"
  | "en-attente"
  | "confirmee"
  | "agent-indisponible"
  | "annulee"
  | "terminee";

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  "demande-envoyee": "Demande envoyée",
  "en-attente": "En attente",
  confirmee: "Confirmée",
  "agent-indisponible": "Agent indisponible",
  annulee: "Annulée",
  terminee: "Terminée",
};

export type VisitRecord = {
  id: string;
  propertyId: string;
  propertyRef: string;
  propertyTitle: string;
  clientName: string;
  date: string;
  slot: string;
  status: VisitStatus;
  createdAt: string;
  rating?: number;
  comment?: string;
};

export type RentalStage =
  | "demande-envoyee"
  | "etude"
  | "acceptee"
  | "refusee"
  | "contrat"
  | "signature"
  | "preparation-cles"
  | "recuperation"
  | "active";

export const RENTAL_STAGES: { id: RentalStage; label: string; description: string }[] = [
  { id: "demande-envoyee", label: "Demande envoyée", description: "Votre dossier a été transmis au propriétaire." },
  { id: "etude", label: "Étude", description: "Les pièces et conditions sont en cours d’examen." },
  { id: "acceptee", label: "Acceptée", description: "Le propriétaire a accepté votre candidature." },
  { id: "refusee", label: "Refusée", description: "La candidature n’a pas été retenue." },
  { id: "contrat", label: "Contrat", description: "Le contrat est préparé et consultable." },
  { id: "signature", label: "Signature", description: "Les signatures des parties sont en cours." },
  { id: "preparation-cles", label: "Préparation des clés", description: "Le logement se prépare pour votre arrivée." },
  { id: "recuperation", label: "Récupération", description: "La remise des clés est à organiser." },
  { id: "active", label: "Location active", description: "Votre location a commencé." },
];

export type RentalApplication = {
  id: string;
  propertyId: string;
  propertyRef: string;
  propertyTitle: string;
  visitId: string;
  stage: RentalStage;
  monthlyIncome: string;
  message: string;
  submittedAt: string;
};

export type ContractStatus = "brouillon" | "envoye" | "consulte" | "a-signer" | "signe" | "annule";

export type ContractRecord = {
  id: string;
  applicationId: string;
  propertyId: string;
  propertyRef: string;
  propertyTitle: string;
  status: ContractStatus;
  rent: number;
  duration: string;
  sentAt?: string;
  signedAt?: string;
  updatedAt: string;
  clauses: string;
};

export type ListingStatus =
  | "publie"
  | "brouillon"
  | "en-verification"
  | "verifie"
  | "modification-demandee"
  | "suspendu"
  | "loue"
  | "indisponible";

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  publie: "Publié",
  brouillon: "Brouillon",
  "en-verification": "En vérification",
  verifie: "Vérifié",
  "modification-demandee": "Modifications demandées",
  suspendu: "Suspendu",
  loue: "Loué",
  indisponible: "Indisponible",
};

/** L’équipe HOMERA seule peut valider ou suspendre un dossier. */
export function nextOwnerListingStatus(status: ListingStatus): ListingStatus | null {
  switch (status) {
    case "brouillon": return "en-verification";
    case "verifie": return "publie";
    case "publie": return "indisponible";
    case "indisponible": return "publie";
    default: return null;
  }
}

export type WorkspaceListing = {
  id: string;
  reference: string;
  title: string;
  intent: PropertyIntent;
  type: PropertyType;
  city: string;
  district: string;
  price: number;
  status: ListingStatus;
  submittedAt: string;
  photoNames: string[];
  documentNames: string[];
  ownerAccountId?: string;
  ownerName?: string;
  ownerEmail?: string;
  agentId?: string;
  ownerDeclared?: boolean;
  mandateDeclared?: boolean;
  draftSnapshot?: PropertyDraft;
};

export type PropertyDraft = {
  step: number;
  title: string;
  intent: PropertyIntent | "";
  type: PropertyType | "";
  city: string;
  district: string;
  address: string;
  surface: string;
  bedrooms: string;
  rooms: string;
  bathrooms: string;
  features: string[];
  photoNames: string[];
  price: string;
  pricePeriod: string;
  deposit: string;
  duration: string;
  availableFrom: string;
  conditions: string;
  documentNames: string[];
  agentId: string;
  verifiedOwner: boolean;
  verifiedMandate: boolean;
  notes: string;
  updatedAt?: string;
};

export type AppNotificationType = "visite" | "demande" | "contrat" | "verification" | "agent" | "propriete" | "systeme";

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

export type MessageItem = {
  id: string;
  author: "me" | "agent" | "proprietaire";
  body: string;
  createdAt: string;
};

export type MessageThread = {
  id: string;
  propertyId: string;
  propertyRef: string;
  propertyTitle: string;
  recipient: "agent" | "proprietaire";
  updatedAt: string;
  messages: MessageItem[];
};

export type VerificationDecision = "a-examiner" | "valide" | "modification-demandee" | "refuse" | "suspendu";

export type VerificationHistoryEvent = {
  id: string;
  createdAt: string;
  decision: VerificationDecision;
  title: string;
  detail: string;
};

export type WorkspacePreferences = {
  emailNotifications: boolean;
  visitNotifications: boolean;
  marketingNotifications: boolean;
  language: "fr" | "en";
};

export type PaymentProviderId =
  | "mtn-momo"
  | "moov-money"
  | "celtiis-cash"
  | "carte-bancaire"
  | "virement-uemoa";

export type PaymentMethodUsage = "paiement" | "reversement" | "mixte";

export type PaymentProviderSpec = {
  id: PaymentProviderId;
  label: string;
  shortLabel: string;
  category: "mobile-money" | "carte" | "virement";
  badge: string;
  description: string;
  placeholder: string;
  processingNote: string;
};

export const PAYMENT_PROVIDERS: readonly PaymentProviderSpec[] = [
  {
    id: "mtn-momo",
    label: "MTN Mobile Money (MoMo)",
    shortLabel: "MTN MoMo",
    category: "mobile-money",
    badge: "Mobile Money Bénin",
    description: "Validation USSD / push immédiate sur numéro MTN Bénin (+229 01).",
    placeholder: "+229 01 97 00 00 00",
    processingNote: "Confirmation par code secret MoMo sur le téléphone du titulaire.",
  },
  {
    id: "moov-money",
    label: "Moov Money (Flooz)",
    shortLabel: "Moov Money",
    category: "mobile-money",
    badge: "Mobile Money Bénin",
    description: "Règlement et encaissement sur portefeuille Moov Africa Bénin (+229 01).",
    placeholder: "+229 01 95 00 00 00",
    processingNote: "Confirmation directe via notification push Moov Money.",
  },
  {
    id: "celtiis-cash",
    label: "Celtiis Cash",
    shortLabel: "Celtiis Cash",
    category: "mobile-money",
    badge: "Opérateur national SBIN",
    description: "Portefeuille mobile national Celtiis Bénin (+229 01).",
    placeholder: "+229 01 40 00 00 00",
    processingNote: "Validation sécurisée sur le numéro Celtiis Cash enregistré.",
  },
  {
    id: "carte-bancaire",
    label: "Carte bancaire (Visa / Mastercard)",
    shortLabel: "Visa / Mastercard",
    category: "carte",
    badge: "Local & Diaspora",
    description: "Paiement par carte internationale ou régionale avec authentification 3D Secure.",
    placeholder: "4821",
    processingNote: "Seuls les 4 derniers chiffres et l’échéance sont conservés à titre de repère.",
  },
  {
    id: "virement-uemoa",
    label: "Virement bancaire UEMOA (RIB / IBAN)",
    shortLabel: "Virement UEMOA",
    category: "virement",
    badge: "Banques Bénin & UEMOA",
    description: "Compte bancaire pour loyers, cautions et reversements propriétaires (BOA, Ecobank, Orabank, NSIA, UBA, SG…).",
    placeholder: "BJ06 0001 0002 0003 0004 9102",
    processingNote: "Rapprochement par référence HOMERA sur relevé bancaire UEMOA.",
  },
] as const;

export const UEMOA_BANKS: readonly string[] = [
  "Bank of Africa (BOA) Bénin",
  "Ecobank Bénin",
  "Orabank Bénin",
  "NSIA Banque Bénin",
  "UBA Bénin",
  "Société Générale Bénin",
  "Coris Bank International Bénin",
  "BGFI Bank Bénin",
] as const;

export type SavedPaymentMethod = {
  id: string;
  provider: PaymentProviderId;
  holderName: string;
  maskedIdentifier: string;
  bankOrNetwork?: string;
  expiry?: string;
  usage: PaymentMethodUsage;
  isDefault: boolean;
  createdAt: string;
};

export type PaymentTransactionKind = "loyer" | "caution" | "abonnement" | "reservation";
export type PaymentTransactionStatus = "confirme" | "en-verification";

export type PaymentTransactionRecord = {
  id: string;
  reference: string;
  kind: PaymentTransactionKind;
  label: string;
  amount: number;
  provider: PaymentProviderId;
  methodSummary: string;
  propertyRef?: string;
  contractId?: string;
  status: PaymentTransactionStatus;
  createdAt: string;
};

/** Masque un numéro Mobile Money, les 4 derniers chiffres d’une carte ou un RIB/IBAN UEMOA. */
export function maskPaymentIdentifier(provider: PaymentProviderId, raw: string, bankName?: string): string {
  const cleaned = raw.trim();
  if (provider === "carte-bancaire") {
    const digits = cleaned.replace(/\D/g, "");
    const last4 = digits.slice(-4).padStart(4, "0");
    return `Carte •••• ${last4}`;
  }
  if (provider === "virement-uemoa") {
    const alnum = cleaned.replace(/\s+/g, "").toUpperCase();
    const prefix = alnum.slice(0, 4) || "BJ06";
    const suffix = alnum.slice(-4).padStart(4, "0");
    const bankPrefix = bankName ? `${bankName} · ` : "";
    return `${bankPrefix}${prefix} •••• •••• ${suffix}`;
  }
  const digits = cleaned.replace(/\D/g, "");
  const suffix = digits.slice(-2).padStart(2, "0");
  const prefix = digits.startsWith("229") ? "+229 01" : "+229 01";
  return `${prefix} •• •• •• ${suffix}`;
}

export type WorkspaceData = {
  visits: VisitRecord[];
  applications: RentalApplication[];
  contracts: ContractRecord[];
  listings: WorkspaceListing[];
  listingStatusOverrides: Record<string, ListingStatus>;
  notifications: AppNotification[];
  messages: MessageThread[];
  verificationDecisions: Record<string, VerificationDecision>;
  verificationHistory: Record<string, VerificationHistoryEvent[]>;
  draftProperty: PropertyDraft | null;
  preferences: WorkspacePreferences;
  paymentMethods: SavedPaymentMethod[];
  transactions: PaymentTransactionRecord[];
};

export const EMPTY_PROPERTY_DRAFT: PropertyDraft = {
  step: 0,
  title: "",
  intent: "",
  type: "",
  city: "",
  district: "",
  address: "",
  surface: "",
  bedrooms: "",
  rooms: "",
  bathrooms: "",
  features: [],
  photoNames: [],
  price: "",
  pricePeriod: "",
  deposit: "",
  duration: "",
  availableFrom: "",
  conditions: "",
  documentNames: [],
  agentId: "",
  verifiedOwner: false,
  verifiedMandate: false,
  notes: "",
};

export const EMPTY_WORKSPACE: WorkspaceData = {
  visits: [],
  applications: [],
  contracts: [],
  listings: [],
  listingStatusOverrides: {},
  notifications: [],
  messages: [],
  verificationDecisions: {},
  verificationHistory: {},
  draftProperty: null,
  preferences: {
    emailNotifications: true,
    visitNotifications: true,
    marketingNotifications: false,
    language: "fr",
  },
  paymentMethods: [],
  transactions: [],
};

export type RentalRequestFailure =
  | "visite-introuvable"
  | "demande-existante"
  | "visite-non-terminee"
  | "bien-introuvable"
  | "bien-incoherent"
  | "bien-non-louable";

export type RentalRequestValidation =
  | { ok: true; visit: VisitRecord }
  | { ok: false; reason: RentalRequestFailure };

/** Une candidature doit référencer une visite terminée, non utilisée et le bien exact de cette visite. */
export function validateRentalRequest(
  data: Pick<WorkspaceData, "visits" | "applications">,
  visitId: string,
  propertyId: string | undefined,
  propertyIntent: PropertyIntent | undefined,
): RentalRequestValidation {
  const visit = data.visits.find((entry) => entry.id === visitId);
  if (!visit) return { ok: false, reason: "visite-introuvable" };
  if (data.applications.some((entry) => entry.visitId === visit.id)) {
    return { ok: false, reason: "demande-existante" };
  }
  if (visit.status !== "terminee") return { ok: false, reason: "visite-non-terminee" };
  if (!propertyId) return { ok: false, reason: "bien-introuvable" };
  if (visit.propertyId !== propertyId) return { ok: false, reason: "bien-incoherent" };
  if (propertyIntent !== "louer") return { ok: false, reason: "bien-non-louable" };
  return { ok: true, visit };
}

/** Visites éligibles : une visite terminée ne peut ouvrir qu’une seule candidature. */
export function eligibleRentalVisits(
  data: Pick<WorkspaceData, "visits" | "applications">,
): VisitRecord[] {
  const usedVisitIds = new Set(data.applications.map((entry) => entry.visitId));
  return data.visits.filter((visit) => visit.status === "terminee" && !usedVisitIds.has(visit.id));
}

export function workflowStorageKey(accountId: string): string {
  return `homera.workflow.v1.${accountId}`;
}

export function createLocalId(prefix: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

export function makeNotification(
  type: AppNotificationType,
  title: string,
  body: string,
  href?: string,
): AppNotification {
  return {
    id: createLocalId("notif"),
    type,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
    href,
  };
}

export function listingStatusForDecision(decision: VerificationDecision): ListingStatus {
  switch (decision) {
    case "a-examiner": return "en-verification";
    case "valide": return "verifie";
    case "modification-demandee": return "modification-demandee";
    case "refuse":
    case "suspendu": return "suspendu";
  }
}

/** Enregistre la décision, son historique et le statut propriétaire dans une seule mise à jour locale. */
export function recordVerificationDecision(
  data: WorkspaceData,
  id: string,
  decision: VerificationDecision,
  title: string,
): WorkspaceData {
  const listing = data.listings.find((entry) => entry.id === id);
  const createdAt = new Date().toISOString();
  const detail = decision === "valide"
    ? "Le dossier a été validé dans le contrôle local de démonstration."
    : decision === "modification-demandee"
      ? "Des compléments sont demandés avant qu’une nouvelle décision puisse être prise."
      : decision === "refuse"
        ? "Le dossier a été refusé dans le contrôle local de démonstration."
        : decision === "suspendu"
          ? "Le dossier a été suspendu dans le contrôle local de démonstration."
          : "Le dossier attend un nouvel examen par l’équipe HOMERA.";
  const event: VerificationHistoryEvent = {
    id: createLocalId("controle"),
    createdAt,
    decision,
    title,
    detail,
  };
  return {
    ...data,
    verificationDecisions: { ...data.verificationDecisions, [id]: decision },
    verificationHistory: {
      ...data.verificationHistory,
      [id]: [event, ...(data.verificationHistory[id] ?? [])].slice(0, 50),
    },
    listingStatusOverrides: listing
      ? { ...data.listingStatusOverrides, [id]: listingStatusForDecision(decision) }
      : data.listingStatusOverrides,
    notifications: [
      makeNotification(
        "verification",
        title,
        `${listing?.reference ?? id} · ${detail}`,
        listing ? "/proprietaire/biens" : "/admin/verifications",
      ),
      ...data.notifications,
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVerificationDecision(value: unknown): value is VerificationDecision {
  return ["a-examiner", "valide", "modification-demandee", "refuse", "suspendu"].includes(String(value));
}

function isPropertyIntent(value: unknown): value is PropertyIntent {
  return value === "acheter" || value === "louer" || value === "sejour";
}

function isPropertyType(value: unknown): value is PropertyType {
  return value === "villa" || value === "appartement" || value === "studio" || value === "terrain" || value === "local";
}

function isListingStatus(value: unknown): value is ListingStatus {
  return typeof value === "string" && Object.hasOwn(LISTING_STATUS_LABELS, value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringList(value: unknown, maxItems = 50): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").slice(0, maxItems) : [];
}

function parsePropertyDraft(value: unknown): PropertyDraft | undefined {
  if (!isRecord(value)) return undefined;
  const step = typeof value.step === "number" && Number.isInteger(value.step) ? Math.max(0, Math.min(10, value.step)) : 0;
  return {
    ...EMPTY_PROPERTY_DRAFT,
    step,
    title: stringValue(value.title),
    intent: isPropertyIntent(value.intent) ? value.intent : "",
    type: isPropertyType(value.type) ? value.type : "",
    city: stringValue(value.city),
    district: stringValue(value.district),
    address: stringValue(value.address),
    surface: stringValue(value.surface),
    bedrooms: stringValue(value.bedrooms),
    rooms: stringValue(value.rooms),
    bathrooms: stringValue(value.bathrooms),
    features: stringList(value.features, 30),
    photoNames: stringList(value.photoNames, 12),
    price: stringValue(value.price),
    pricePeriod: stringValue(value.pricePeriod),
    deposit: stringValue(value.deposit),
    duration: stringValue(value.duration),
    availableFrom: stringValue(value.availableFrom),
    conditions: stringValue(value.conditions),
    documentNames: stringList(value.documentNames, 10),
    agentId: stringValue(value.agentId),
    verifiedOwner: value.verifiedOwner === true,
    verifiedMandate: value.verifiedMandate === true,
    notes: stringValue(value.notes),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
  };
}

function parseWorkspaceListing(value: unknown): WorkspaceListing | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.reference !== "string") return null;
  return {
    id: value.id,
    reference: value.reference,
    title: stringValue(value.title),
    intent: isPropertyIntent(value.intent) ? value.intent : "louer",
    type: isPropertyType(value.type) ? value.type : "villa",
    city: stringValue(value.city),
    district: stringValue(value.district),
    price: typeof value.price === "number" && Number.isFinite(value.price) && value.price >= 0 ? value.price : 0,
    status: isListingStatus(value.status) ? value.status : "brouillon",
    submittedAt: stringValue(value.submittedAt),
    photoNames: stringList(value.photoNames, 12),
    documentNames: stringList(value.documentNames, 10),
    ownerAccountId: typeof value.ownerAccountId === "string" ? value.ownerAccountId : undefined,
    ownerName: typeof value.ownerName === "string" ? value.ownerName : undefined,
    ownerEmail: typeof value.ownerEmail === "string" ? value.ownerEmail : undefined,
    agentId: typeof value.agentId === "string" ? value.agentId : undefined,
    ownerDeclared: value.ownerDeclared === true,
    mandateDeclared: value.mandateDeclared === true,
    draftSnapshot: parsePropertyDraft(value.draftSnapshot),
  };
}

function parseVerificationHistory(value: unknown): Record<string, VerificationHistoryEvent[]> {
  if (!isRecord(value)) return {};
  const parsed: Record<string, VerificationHistoryEvent[]> = {};
  for (const [key, rawEvents] of Object.entries(value)) {
    if (!Array.isArray(rawEvents)) continue;
    const events = rawEvents.flatMap((entry) => {
      if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.createdAt !== "string" ||
        typeof entry.title !== "string" || typeof entry.detail !== "string" || !isVerificationDecision(entry.decision)) return [];
      return [{
        id: entry.id,
        createdAt: entry.createdAt,
        decision: entry.decision,
        title: entry.title,
        detail: entry.detail,
      }];
    }).slice(0, 50);
    if (events.length) parsed[key] = events;
  }
  return parsed;
}

function isPaymentProviderId(value: unknown): value is PaymentProviderId {
  return ["mtn-momo", "moov-money", "celtiis-cash", "carte-bancaire", "virement-uemoa"].includes(String(value));
}

function isPaymentMethodUsage(value: unknown): value is PaymentMethodUsage {
  return ["paiement", "reversement", "mixte"].includes(String(value));
}

function parsePaymentMethod(value: unknown): SavedPaymentMethod | null {
  if (!isRecord(value) || typeof value.id !== "string" || !isPaymentProviderId(value.provider)) return null;
  const holderName = stringValue(value.holderName).trim();
  const maskedIdentifier = stringValue(value.maskedIdentifier).trim();
  if (!holderName || !maskedIdentifier) return null;
  return {
    id: value.id,
    provider: value.provider,
    holderName,
    maskedIdentifier,
    bankOrNetwork: typeof value.bankOrNetwork === "string" ? value.bankOrNetwork : undefined,
    expiry: typeof value.expiry === "string" ? value.expiry : undefined,
    usage: isPaymentMethodUsage(value.usage) ? value.usage : "mixte",
    isDefault: value.isDefault === true,
    createdAt: stringValue(value.createdAt) || new Date(0).toISOString(),
  };
}

function parsePaymentTransaction(value: unknown): PaymentTransactionRecord | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.reference !== "string" || !isPaymentProviderId(value.provider)) return null;
  const amount = typeof value.amount === "number" && Number.isFinite(value.amount) && value.amount >= 0 ? value.amount : 0;
  const kind: PaymentTransactionKind =
    value.kind === "loyer" || value.kind === "caution" || value.kind === "abonnement" || value.kind === "reservation"
      ? value.kind
      : "loyer";
  return {
    id: value.id,
    reference: value.reference,
    kind,
    label: stringValue(value.label) || "Règlement HOMERA",
    amount,
    provider: value.provider,
    methodSummary: stringValue(value.methodSummary),
    propertyRef: typeof value.propertyRef === "string" ? value.propertyRef : undefined,
    contractId: typeof value.contractId === "string" ? value.contractId : undefined,
    status: value.status === "en-verification" ? "en-verification" : "confirme",
    createdAt: stringValue(value.createdAt) || new Date(0).toISOString(),
  };
}

/** Relecture défensive : le stockage navigateur n’est jamais considéré comme une source fiable. */
export function parseWorkspace(value: unknown): WorkspaceData {
  if (!isRecord(value)) return EMPTY_WORKSPACE;
  const preferences = isRecord(value.preferences) ? value.preferences : {};
  return {
    ...EMPTY_WORKSPACE,
    visits: Array.isArray(value.visits) ? value.visits.filter((entry) => isRecord(entry) && typeof entry.id === "string" && typeof entry.propertyId === "string") as unknown as VisitRecord[] : [],
    applications: Array.isArray(value.applications) ? value.applications.filter((entry) => isRecord(entry) && typeof entry.id === "string" && typeof entry.propertyId === "string") as unknown as RentalApplication[] : [],
    contracts: Array.isArray(value.contracts) ? value.contracts.filter((entry) => isRecord(entry) && typeof entry.id === "string" && typeof entry.propertyId === "string") as unknown as ContractRecord[] : [],
    listings: Array.isArray(value.listings) ? value.listings.map(parseWorkspaceListing).filter((entry): entry is WorkspaceListing => entry !== null) : [],
    listingStatusOverrides: isRecord(value.listingStatusOverrides)
      ? Object.fromEntries(Object.entries(value.listingStatusOverrides).filter(([, status]) => Object.keys(LISTING_STATUS_LABELS).includes(String(status)))) as Record<string, ListingStatus>
      : {},
    notifications: Array.isArray(value.notifications) ? value.notifications.filter((entry) => isRecord(entry) && typeof entry.id === "string" && typeof entry.title === "string") as unknown as AppNotification[] : [],
    messages: Array.isArray(value.messages) ? value.messages.filter((entry) => isRecord(entry) && typeof entry.id === "string" && Array.isArray(entry.messages)) as unknown as MessageThread[] : [],
    verificationDecisions: isRecord(value.verificationDecisions)
      ? Object.fromEntries(Object.entries(value.verificationDecisions).filter(([, status]) => isVerificationDecision(status))) as Record<string, VerificationDecision>
      : {},
    verificationHistory: parseVerificationHistory(value.verificationHistory),
    draftProperty: parsePropertyDraft(value.draftProperty) ?? null,
    preferences: {
      emailNotifications: preferences.emailNotifications !== false,
      visitNotifications: preferences.visitNotifications !== false,
      marketingNotifications: preferences.marketingNotifications === true,
      language: preferences.language === "en" ? "en" : "fr",
    },
    paymentMethods: Array.isArray(value.paymentMethods)
      ? value.paymentMethods.map(parsePaymentMethod).filter((entry): entry is SavedPaymentMethod => entry !== null)
      : [],
    transactions: Array.isArray(value.transactions)
      ? value.transactions.map(parsePaymentTransaction).filter((entry): entry is PaymentTransactionRecord => entry !== null)
      : [],
  };
}

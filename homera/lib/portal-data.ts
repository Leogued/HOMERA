import { PROPERTIES } from "@/lib/content";
import type { ListingStatus, VerificationDecision } from "@/lib/workflow";

export type DemoOwnerListing = {
  id: string;
  reference: string;
  title: string;
  city: string;
  district: string;
  price: number;
  status: ListingStatus;
  propertyId?: string;
  note?: string;
};

export const DEMO_OWNER_LISTINGS: DemoOwnerListing[] = [
  {
    id: "owner-421",
    reference: "HOM-CTN-000421",
    title: "Villa 4 chambres & jardin tropical",
    city: "Cotonou",
    district: "Fidjrossè Calvaire",
    price: 450_000,
    status: "publie",
    propertyId: "villa-fidjrosse",
    note: "Dossier vérifié · disponibilité confirmée",
  },
  {
    id: "owner-422",
    reference: "HOM-CTN-000422",
    title: "Appartement F3 avec balcon",
    city: "Cotonou",
    district: "Haie Vive",
    price: 280_000,
    status: "en-verification",
    note: "Pièce de propriété en cours de contrôle",
  },
  {
    id: "owner-423",
    reference: "HOM-CTN-000423",
    title: "Parcelle résidentielle de 400 m²",
    city: "Cotonou",
    district: "Akpakpa",
    price: 22_000_000,
    status: "brouillon",
    note: "Brouillon non publié · informations à compléter",
  },
];

export type AgentAuthorization = {
  propertyId: string;
  propertyRef: string;
  agentId: string;
  agentName: string;
  agency: string;
  status: "active" | "expiree" | "revoquee";
  proof: string;
  authorizedAt: string;
  expiresAt: string;
  scope: string;
};

const villa = PROPERTIES.find((property) => property.id === "villa-fidjrosse")!;
const apartment = PROPERTIES.find((property) => property.id === "appartement-haie-vive")!;
const duplex = PROPERTIES.find((property) => property.id === "duplex-ganhi")!;

export const DEMO_AGENT_ID = "AG-HOM-0248";
export const DEMO_AGENT_NAME = "Koffi Ahouansou";

/** Liste d’habilitations explicite : le tableau agent est filtré par ces références, pas par une propriété déclarée. */
export const DEMO_AGENT_AUTHORIZATIONS: AgentAuthorization[] = [
  {
    propertyId: villa.id,
    propertyRef: villa.homeraId,
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    agency: "Cabinet Ahouansou Immobilier",
    status: "active",
    proof: "Mandat de location · document pilote MA-2026-041",
    authorizedAt: "2026-08-18",
    expiresAt: "2027-02-18",
    scope: "Présenter le bien, organiser les visites et transmettre les candidatures au propriétaire.",
  },
  {
    propertyId: apartment.id,
    propertyRef: apartment.homeraId,
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    agency: "Cabinet Ahouansou Immobilier",
    status: "active",
    proof: "Mandat de gestion · document pilote MG-2026-019",
    authorizedAt: "2026-09-02",
    expiresAt: "2027-03-02",
    scope: "Présenter le bien, organiser les visites et répondre aux questions de premier niveau.",
  },
  {
    propertyId: duplex.id,
    propertyRef: duplex.homeraId,
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    agency: "Cabinet Ahouansou Immobilier",
    status: "active",
    proof: "Mandat de séjour · document pilote MS-2026-008",
    authorizedAt: "2026-09-11",
    expiresAt: "2026-12-11",
    scope: "Présenter le bien, organiser un rendez-vous et coordonner l’accueil du séjour.",
  },
];

export type AgentAccountIdentity = {
  roles: readonly string[];
  prenom: string;
  nom: string;
  profile?: Record<string, string>;
};

export function isAgentAuthorizationCurrent(entry: AgentAuthorization, now = new Date()): boolean {
  const today = now.toISOString().slice(0, 10);
  return entry.status === "active" && entry.authorizedAt <= today && entry.expiresAt >= today;
}

/** Les mandats fictifs ne sont montrés qu’au profil agent de démonstration correspondant, et uniquement pendant leur période active. */
export function authorizationsForAgent(account: AgentAccountIdentity | null | undefined, now = new Date()): AgentAuthorization[] {
  if (!account || !account.roles.includes("agent")) return [];
  const normalize = (value: string | undefined) => (value ?? "").trim().toLocaleLowerCase("fr-FR").replace(/[^\p{L}\p{N}]/gu, "");
  const isDemoAgent =
    normalize(account.prenom) === normalize("Koffi") &&
    normalize(account.nom) === normalize("Ahouansou") &&
    normalize(account.profile?.structure) === normalize("Cabinet Ahouansou Immobilier") &&
    normalize(account.profile?.identification) === normalize("RB/COT/24 B 1234");
  if (!isDemoAgent) return [];
  return DEMO_AGENT_AUTHORIZATIONS.filter((entry) => entry.agentId === DEMO_AGENT_ID && isAgentAuthorizationCurrent(entry, now));
}

export type VerificationCase = {
  id: string;
  reference: string;
  propertyId?: string;
  title: string;
  city: string;
  owner: string;
  ownerEmail: string;
  submittedAt: string;
  documents: { name: string; state: "reçu" | "à vérifier" | "manquant" }[];
  information: { label: string; value: string }[];
  agentId: string;
  agentName: string;
  agentProof: string;
  checks: { label: string; detail: string }[];
  history: { date: string; title: string; detail: string }[];
  initialDecision: VerificationDecision;
}

export const DEMO_VERIFICATION_CASES: VerificationCase[] = [
  {
    id: "case-421",
    reference: "HOM-CTN-000421",
    propertyId: villa.id,
    title: villa.title,
    city: "Fidjrossè Calvaire, Cotonou",
    owner: "Mme Clarisse Ahouansou",
    ownerEmail: "clarisse.a@example.demo",
    submittedAt: "2026-09-10T08:30:00.000Z",
    documents: [
      { name: "Titre de propriété — extrait.pdf", state: "reçu" },
      { name: "Pièce d’identité propriétaire.pdf", state: "reçu" },
      { name: "Mandat agent MA-2026-041.pdf", state: "à vérifier" },
    ],
    information: [
      { label: "Type", value: "Villa · location longue durée" },
      { label: "Surface", value: "280 m² habitables" },
      { label: "Prix déclaré", value: "450 000 FCFA / mois" },
      { label: "Disponibilité", value: "À confirmer par le propriétaire" },
    ],
    agentId: DEMO_AGENT_ID,
    agentName: DEMO_AGENT_NAME,
    agentProof: "Mandat de location · document pilote MA-2026-041",
    checks: [
      { label: "Identité du propriétaire", detail: "Nom et pièce d’identité comparés aux informations du dossier." },
      { label: "Droit de propriété", detail: "Titre déclaré reçu ; concordance cadastrale à valider." },
      { label: "Mandat du représentant", detail: "Périmètre et date d’expiration à vérifier." },
      { label: "Photos et description", detail: "Cohérence de la fiche à contrôler lors de la visite de validation." },
    ],
    history: [
      { date: "2026-09-10", title: "Dossier soumis", detail: "Un dossier de démonstration a été ajouté à la file de contrôle." },
      { date: "2026-09-11", title: "Contrôle préliminaire", detail: "Les pièces d’identité sont présentes ; mandat à examiner." },
    ],
    initialDecision: "a-examiner",
  },
  {
    id: "case-422",
    reference: "HOM-CTN-000422",
    title: "Appartement F3 avec balcon",
    city: "Haie Vive, Cotonou",
    owner: "M. Éric Hounkpatin",
    ownerEmail: "eric.h@example.demo",
    submittedAt: "2026-09-29T14:15:00.000Z",
    documents: [
      { name: "Convention de vente.pdf", state: "reçu" },
      { name: "Pièce d’identité propriétaire.pdf", state: "reçu" },
      { name: "Mandat de représentation.pdf", state: "manquant" },
    ],
    information: [
      { label: "Type", value: "Appartement F3 · location mensuelle" },
      { label: "Surface", value: "110 m²" },
      { label: "Prix déclaré", value: "280 000 FCFA / mois" },
      { label: "Disponibilité", value: "Disponible selon le déclarant" },
    ],
    agentId: DEMO_AGENT_ID,
    agentName: "Aucun agent déclaré",
    agentProof: "Aucune autorisation jointe au dossier.",
    checks: [
      { label: "Identité du propriétaire", detail: "Pièce jointe présente, contrôle à effectuer." },
      { label: "Droit de propriété", detail: "Convention reçue, référence à rapprocher du dossier." },
      { label: "Mandat du représentant", detail: "Pièce manquante si un agent doit commercialiser le bien." },
      { label: "Données de l’annonce", detail: "Loyer, surface et disponibilité à confirmer." },
    ],
    history: [{ date: "2026-09-29", title: "Dossier soumis", detail: "Première soumission du propriétaire." }],
    initialDecision: "a-examiner",
  },
  {
    id: "case-423",
    reference: "HOM-CTN-000423",
    title: "Parcelle résidentielle de 400 m²",
    city: "Akpakpa, Cotonou",
    owner: "Mme Mariam Soglo",
    ownerEmail: "mariam.s@example.demo",
    submittedAt: "2026-09-30T10:05:00.000Z",
    documents: [
      { name: "ACD — copie.pdf", state: "à vérifier" },
      { name: "Pièce d’identité propriétaire.pdf", state: "reçu" },
      { name: "Plan de bornage.pdf", state: "reçu" },
    ],
    information: [
      { label: "Type", value: "Terrain · vente" },
      { label: "Surface", value: "400 m²" },
      { label: "Prix déclaré", value: "22 000 000 FCFA" },
      { label: "Disponibilité", value: "À confirmer" },
    ],
    agentId: "AG-HOM-0312",
    agentName: "Aïcha Sètondji",
    agentProof: "Mandat de commercialisation · document pilote MC-2026-057",
    checks: [
      { label: "Identité du propriétaire", detail: "Pièce reçue ; correspondance à valider." },
      { label: "Droit foncier", detail: "ACD à examiner auprès des pièces cadastrales." },
      { label: "Bornage et superficie", detail: "Plan présent, limites à rapprocher des indications de terrain." },
      { label: "Autorisation de l’agent", detail: "Mandat transmis ; date de validité à contrôler." },
    ],
    history: [{ date: "2026-09-30", title: "Dossier soumis", detail: "Dossier reçu dans la file de vérification." }],
    initialDecision: "a-examiner",
  },
];

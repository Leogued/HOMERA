import { z } from "zod";
import {
  FEATURE_LABELS,
  LAND_TITLE_LABELS,
  type PropertyFeature,
  type PropertyIntent,
  type PropertyType,
} from "../content";
import { MEDIA } from "../media.generated";
import { REPORT_REASON_VALUES } from "../reports";

/* ==================================================================
   HOMERA — VALIDATION DES ENTRÉES SERVEUR
   ------------------------------------------------------------------
   Le navigateur valide déjà pour aider l’utilisateur ; cette couche
   valide pour protéger la donnée. Elle est la seule opposable : une
   requête forgée à la main passe par les mêmes schémas.

   Les messages sont écrits pour être affichés tels quels sous le champ
   fautif (jamais de jargon technique).
   ================================================================== */

export type FieldErrors = Record<string, string>;

/** Accepte `true`, `"true"`, `"1"`, `1` — refuse le reste. */
const booleanish = z.preprocess(
  (value) => (typeof value === "string" ? value === "true" || value === "1" : Boolean(value)),
  z.boolean(),
);

export type Parsed<T> = { ok: true; data: T } | { ok: false; message: string; fields: FieldErrors };

const FEATURES = Object.keys(FEATURE_LABELS) as [PropertyFeature, ...PropertyFeature[]];
const LAND_TITLES = Object.keys(LAND_TITLE_LABELS) as [string, ...string[]];

export const propertyTypes = ["villa", "appartement", "studio", "chambre", "immeuble", "terrain", "boutique", "salle", "espace"] as const;
export const propertyIntents = ["acheter", "louer", "sejour"] as const;

export const propertyDraftSchema = z.object({
  title: z.string().trim().min(6, "Donnez un titre d’au moins 6 caractères.").max(120),
  intent: z.enum(propertyIntents, { message: "Choisissez un projet : achat, location ou séjour." }) as z.ZodType<PropertyIntent>,
  type: z.enum(propertyTypes, { message: "Choisissez un type de bien." }) as z.ZodType<PropertyType>,
  price: z.coerce.number().int().min(0, "Le montant ne peut pas être négatif.").max(5_000_000_000),
  pricePeriod: z.string().trim().max(20).optional().default(""),
  country: z.string().trim().max(60).optional().default("Bénin"),
  department: z.string().trim().max(80).optional().default(""),
  commune: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().min(2, "Indiquez la commune ou la ville.").max(80),
  district: z.string().trim().min(2, "Indiquez le quartier.").max(120),
  address: z.string().trim().max(200).optional().default(""),
  bedrooms: z.coerce.number().int().min(0).max(50).optional().default(0),
  bathrooms: z.coerce.number().int().min(0).max(50).optional().default(0),
  surface: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
  rooms: z.coerce.number().int().min(0).max(100).nullable().optional(),
  floor: z.string().trim().max(40).optional().default(""),
  landTitle: z.enum(LAND_TITLES).nullable().optional(),
  minNights: z.coerce.number().int().min(0).max(365).nullable().optional(),
  description: z.string().trim().max(4000).optional().default(""),
  conditions: z.string().trim().max(2000).optional().default(""),
  furnished: booleanish.optional().default(false),
  features: z.array(z.enum(FEATURES)).optional().default([]),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
});

/** Type d’ENTRÉE : les champs optionnels du formulaire restent optionnels. */
export type PropertyDraftInput = z.input<typeof propertyDraftSchema>;

export const visitRequestSchema = z.object({
  propertyId: z.string().trim().min(1, "Indiquez le bien concerné."),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez une date au format AAAA-MM-JJ."),
  time: z.string().trim().regex(/^\d{2}:\d{2}$/, "Indiquez une heure au format HH:MM.").optional().default("09:00"),
  slotId: z.string().trim().max(60).nullable().optional(),
  message: z.string().trim().max(1000).optional().default(""),
  durationMin: z.coerce.number().int().min(15).max(240).optional().default(45),
});

export const applicationDraftSchema = z.object({
  visitId: z.string().trim().min(1, "Rattachez votre dossier à une visite effectuée."),
  message: z.string().trim().max(1000).optional().default(""),
  monthlyIncome: z.coerce.number().int().min(0).max(100_000_000).optional().default(0),
});
export const applicationDecisionSchema = z.object({
  action: z.enum(["accepter", "refuser", "etudier", "annuler"]),
  reason: z.string().trim().max(500).optional().default(""),
});
export const visitDecisionSchema = z.object({
  action: z.enum(["confirmer", "refuser", "annuler", "reprogrammer", "effectuer", "absence"]),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez une date au format AAAA-MM-JJ.").optional(),
  time: z.string().trim().regex(/^\d{2}:\d{2}$/, "Indiquez une heure au format HH:MM.").optional(),
  slotId: z.string().trim().max(60).nullable().optional(),
  reason: z.string().trim().max(500).optional().default(""),
});

export const authorizationRequestSchema = z.object({
  propertyId: z.string().trim().min(1, "Choisissez le bien concerné."),
  agentId: z.string().trim().max(60).nullable().optional(),
  agentEmail: z.string().trim().max(160).optional().default(""),
  agentName: z.string().trim().max(120).optional().default(""),
  agencyName: z.string().trim().max(160).optional().default(""),
  mandateType: z.enum(["location", "vente", "gerance", "visite"]).optional().default("location"),
  scope: z.array(z.enum(["visite", "location", "annonce", "gestion", "encaissement"])).min(1, "Choisissez au moins une action autorisée."),
  proofLabel: z.string().trim().min(3, "Décrivez la pièce fournie (mandat, procuration…).").max(200),
  expiresAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez une date de fin au format AAAA-MM-JJ."),
  note: z.string().trim().max(1000).optional().default(""),
});

export const authorizationDecisionSchema = z.object({
  action: z.enum(["accepter", "refuser", "revoquer", "contester", "renouveler"]),
  reason: z.string().trim().max(500).optional().default(""),
  expiresAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const verificationStepSchema = z.object({
  stepKey: z.string().trim().min(1).max(60),
  status: z.enum(["a-faire", "en-cours", "valide", "refuse", "non-applicable"]),
  comment: z.string().trim().max(2000).optional().default(""),
  internal: booleanish.optional().default(true),
});

export const verificationDecisionSchema = z.object({
  decision: z.enum(["a-examiner", "incomplet", "en-cours", "accepte", "refuse", "suspendu", "a-reexaminer"]),
  note: z.string().trim().max(2000).optional().default(""),
  documentRequest: z.string().trim().max(1000).optional().default(""),
});

export const availabilitySchema = z.object({
  start: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez une date de début."),
  end: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez une date de fin."),
  kind: z.enum(["disponible", "indisponible"]),
  reason: z.string().trim().max(300).optional().default(""),
});

export const slotSchema = z.object({
  startsAt: z.string().trim().min(4),
  endsAt: z.string().trim().min(4),
  capacity: z.coerce.number().int().min(1).max(10).optional().default(1),
  note: z.string().trim().max(300).optional().default(""),
});

/* Un visuel qui n’existe pas afficherait une image cassée : la clé est
   donc vérifiée contre la médiathèque réellement construite. */
export const photoSchema = z.object({
  mediaKey: z
    .string()
    .trim()
    .min(1, "Choisissez un visuel.")
    .max(200)
    .refine((key) => Object.prototype.hasOwnProperty.call(MEDIA, key), "Ce visuel n’existe pas dans la médiathèque HOMERA."),
  alt: z.string().trim().max(300).optional().default(""),
});

export const reportSchema = z.object({
  propertyId: z.string().trim().min(1),
  reason: z.enum(REPORT_REASON_VALUES, { message: "Choisissez l’un des motifs proposés." }),
  detail: z
    .string()
    .trim()
    .min(10, "Décrivez le problème en au moins 10 caractères : sans contexte, le signalement est inexploitable.")
    .max(1500),
});

/** Transforme une erreur Zod en messages par champ prêts à afficher. */
export function zodToFields(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function parseInput<T>(schema: z.ZodType<T>, payload: unknown): Parsed<T> {
  const result = schema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };
  const fields = zodToFields(result.error);
  const first = Object.values(fields)[0] ?? "Les informations transmises ne sont pas valides.";
  return { ok: false, message: Object.keys(fields).length > 1 ? "Plusieurs champs restent à corriger." : first, fields };
}

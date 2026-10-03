/* ==================================================================
   HOMERA — RÈGLES DE COMPTE (partie pure)
   ------------------------------------------------------------------
   Tout ce qui décide vit ici, et rien d’autre : les trois rôles, les
   champs demandés à chacun, les contrôles de saisie, la politique de
   mot de passe, les codes de vérification et de réinitialisation.

   Aucune dépendance au navigateur, à React ou au réseau : ce fichier
   se lit, se relit et se teste seul (scripts/test-motion.mjs). Les
   composants ne font qu’afficher ce que ce module a déjà tranché.

   Règle éditoriale tenue partout : ce qui est vrai est dit. Les durées
   de validité, le nombre d’essais et la politique de mot de passe sont
   annoncés à l’écran parce qu’ils sont réellement appliqués ici.
   ================================================================== */

/* ------------------------------------------------------------------
   RÔLES
   ------------------------------------------------------------------ */

export type AccountRole = "client" | "proprietaire" | "agent";

export type RoleIconKey = "search" | "key" | "shield";

export type RoleDefinition = {
  id: AccountRole;
  /** Libellé court : sélecteur de rôle, badges, menu du compte. */
  label: string;
  /** Une phrase, pour le choix du rôle. */
  oneLine: string;
  /** Ce que le compte ouvre, en une phrase. */
  promise: string;
  /** Trois bénéfices concrets, affichés dans la colonne latérale. */
  benefits: string[];
  /** Ce que HOMERA demandera plus tard pour vérifier ce rôle. */
  verification: string;
  /** Ce que le rôle reprend du socle client — dit sans le laisser deviner. */
  includes: string;
  /** Clé de pictogramme — les composants possèdent l’icône réelle. */
  icon: RoleIconKey;
};

export const ROLES: readonly RoleDefinition[] = [
  {
    id: "client",
    label: "Client",
    oneLine: "Je cherche un bien à acheter, à louer ou pour un séjour.",
    promise:
      "Rechercher, comparer et suivre vos biens : favoris synchronisés, alertes sur vos critères, demandes de visite au même endroit.",
    includes: "C’est le socle : tout compte HOMERA l’a, quel que soit le rôle choisi.",
    benefits: [
      "Favoris et recherches enregistrées, retrouvés sur tous vos appareils",
      "Alerte dès qu’un bien vérifié correspond à vos critères",
      "Demandes de visite et échanges suivis, avec la référence du bien",
    ],
    verification: "Une adresse e-mail confirmée suffit pour commencer.",
    icon: "search",
  },
  {
    id: "proprietaire",
    label: "Propriétaire",
    oneLine: "Je confie un ou plusieurs biens à HOMERA — et je garde tout le compte client.",
    promise:
      "Déposer un bien, suivre sa vérification et sa publication : vous savez à tout moment où en est le dossier et ce qui a été contrôlé.",
    includes:
      "Inclut le compte client, entièrement : recherche, favoris, recherches enregistrées, alertes et demandes de visite.",
    benefits: [
      "Dépôt d’un bien en ligne, pièces et mandat joints au dossier",
      "Suivi de la vérification, étape par étape, jusqu’à la publication",
      "Candidatures, visites et gestion locative regroupées",
    ],
    verification:
      "Propriétaire du bien ou mandat écrit : les pièces sont demandées à l’ouverture du dossier, pas à l’inscription.",
    icon: "key",
  },
  {
    id: "agent",
    label: "Agent",
    oneLine: "Je présente des biens pour des propriétaires, avec un mandat — et je garde tout le compte client.",
    promise:
      "Un espace de dépôt pour vos mandats, un suivi de publication par bien et une fiche agent lisible par les clients.",
    includes:
      "Inclut le compte client, entièrement : recherche, favoris, recherches enregistrées, alertes et demandes de visite.",
    benefits: [
      "Dépôt de biens mandatés, rattachés à votre structure",
      "Fiche agent : zone d’exercice, mandats suivis, biens publiés",
      "File de vérification partagée avec l’équipe HOMERA",
    ],
    verification:
      "Structure identifiée (RCCM ou IFU) et mandat écrit par bien : la vérification se fait avec l’équipe, par téléphone et sur présentation des pièces.",
    icon: "shield",
  },
] as const;

export const ROLE_ORDER: readonly AccountRole[] = ROLES.map((role) => role.id);

export function roleDefinition(role: AccountRole): RoleDefinition {
  return ROLES.find((entry) => entry.id === role) ?? ROLES[0];
}

/** Un rôle n’est accepté que s’il vient de la liste — jamais d’un paramètre d’URL brut. */
export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === "string" && ROLE_ORDER.includes(value as AccountRole);
}

export function roleFromParam(value: unknown): AccountRole | null {
  return isAccountRole(value) ? value : null;
}

/* ------------------------------------------------------------------
   CAPACITÉS — LES RÔLES SONT CUMULATIFS
   ------------------------------------------------------------------
   Un propriétaire cherche aussi un logement ; un agent achète aussi
   pour lui-même. Les rôles ne sont donc pas des profils exclusifs :
   chaque rôle **contient** le socle client, et y ajoute son métier.

   Deux niveaux sont distingués, parce que c’est la vérité du pilote :

   • `available: true` — la fonction existe déjà, sans serveur (la
     recherche et les favoris du catalogue) ;
   • `available: false` — la fonction demande l’API ; elle est annoncée
     comme à venir, jamais présentée comme ouverte.

   Une seule source pour l’interface : les écrans ne composent pas leurs
   propres listes, ils lisent ces groupes.
   ------------------------------------------------------------------ */

export type CapabilityScope = "socle" | "proprietaire" | "agent";

export type Capability = {
  id: string;
  label: string;
  detail: string;
  /** « socle » : le client, donc tout le monde. Sinon le rôle qui l’ajoute. */
  scope: CapabilityScope;
  /** true : la fonction fonctionne déjà dans le pilote, sans serveur. */
  available: boolean;
};

export const CAPABILITIES: readonly Capability[] = [
  {
    id: "recherche",
    scope: "socle",
    available: true,
    label: "Chercher, filtrer, comparer",
    detail: "Tout le catalogue et chaque fiche, avec des adresses partageables.",
  },
  {
    id: "favoris",
    scope: "socle",
    available: true,
    label: "Favoris et recherches enregistrées",
    detail: "Rattachés au compte au lieu de rester anonymes dans le navigateur.",
  },
  {
    id: "visites",
    scope: "socle",
    available: false,
    label: "Demandes de visite",
    detail: "Envoyer une demande sur un bien et suivre son état, référence à l’appui.",
  },
  {
    id: "alertes",
    scope: "socle",
    available: false,
    label: "Alertes sur critères",
    detail: "Être prévenu dès qu’un bien vérifié correspond à la recherche enregistrée.",
  },
  {
    id: "depot",
    scope: "proprietaire",
    available: false,
    label: "Dépôt d’un bien",
    detail: "Constituer le dossier : pièces, mandat, photos, prix, disponibilité.",
  },
  {
    id: "suivi",
    scope: "proprietaire",
    available: false,
    label: "Suivi de la vérification",
    detail: "Savoir où en est le dossier, étape par étape, jusqu’à la publication.",
  },
  {
    id: "candidatures",
    scope: "proprietaire",
    available: false,
    label: "Candidatures et visites reçues",
    detail: "Examiner les demandes reçues sur vos biens, sans échange dispersé.",
  },
  {
    id: "gestion",
    scope: "proprietaire",
    available: false,
    label: "Gestion locative",
    detail: "Loyers, quittances, maintenance : le dossier reste au même endroit.",
  },
  {
    id: "mandats",
    scope: "agent",
    available: false,
    label: "Biens mandatés",
    detail: "Déposer les biens pour lesquels un mandat écrit est détenu.",
  },
  {
    id: "structure",
    scope: "agent",
    available: false,
    label: "Fiche structure et file de vérification",
    detail: "Rattacher les dossiers à votre agence et suivre leur contrôle.",
  },
] as const;

/** Capacités apportées par un rôle, socle client compris. */
export function roleCapabilities(role: AccountRole): Capability[] {
  return CAPABILITIES.filter((entry) => entry.scope === "socle" || entry.scope === role);
}

/** Union des capacités de plusieurs rôles, sans doublon et dans l’ordre du catalogue. */
export function rolesCapabilities(roles: readonly AccountRole[]): Capability[] {
  return CAPABILITIES.filter(
    (entry) => entry.scope === "socle" || roles.includes(entry.scope as AccountRole),
  );
}

export type CapabilityGroup = {
  scope: CapabilityScope;
  title: string;
  capabilities: Capability[];
};

/** Groupes prêts à afficher : le socle d’abord, puis chaque rôle détenu. */
export function capabilitiesByRole(roles: readonly AccountRole[]): CapabilityGroup[] {
  const groups: CapabilityGroup[] = [
    {
      scope: "socle",
      title: "Avec tout compte HOMERA",
      capabilities: CAPABILITIES.filter((entry) => entry.scope === "socle"),
    },
  ];
  for (const role of ROLE_ORDER) {
    if (role === "client" || !roles.includes(role)) continue;
    groups.push({
      scope: role,
      title: `En tant que ${roleDefinition(role).label.toLowerCase()}`,
      capabilities: CAPABILITIES.filter((entry) => entry.scope === role),
    });
  }
  return groups;
}

/** Un compte ne détient jamais deux fois le même rôle. */
export function hasRole(roles: readonly AccountRole[], role: AccountRole): boolean {
  return roles.includes(role);
}

/**
 * Rôles qu’un compte peut encore ajouter : tout sauf ceux déjà détenus,
 * et sauf le client — que tous les rôles incluent par construction.
 */
export function missingRoles(roles: readonly AccountRole[]): AccountRole[] {
  return ROLE_ORDER.filter((role) => role !== "client" && !roles.includes(role));
}

/** « Propriétaire », « Client · Propriétaire » — libellé court des rôles détenus. */
export function rolesLabel(roles: readonly AccountRole[]): string {
  const held = ROLE_ORDER.filter((role) => roles.includes(role));
  if (held.length === 0) return "Compte";
  return held.map((role) => roleDefinition(role).label).join(" · ");
}

/* ------------------------------------------------------------------
   CHAMPS DEMANDÉS — communs, puis adaptés au rôle
   ------------------------------------------------------------------ */

export type FieldKind = "text" | "email" | "tel" | "password" | "select" | "textarea" | "checkbox";

export type FieldGroup = "identite" | "profil" | "securite";

export type FieldOption = { value: string; label: string };

export type FieldSpec = {
  name: string;
  label: string;
  kind: FieldKind;
  group: FieldGroup;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  help?: string;
  options?: readonly FieldOption[];
  maxLength?: number;
  inputMode?: "text" | "email" | "tel" | "numeric";
  /** Largeur dans la grille du formulaire (deux colonnes sur desktop). */
  span?: "full" | "half";
};

/** Communes couvertes par le pilote, décision produit figée. */
export const COVERED_CITIES: readonly string[] = ["Cotonou", "Abomey-Calavi", "Porto-Novo", "Ouidah"];

const ZONE_OPTIONS: readonly FieldOption[] = [
  ...COVERED_CITIES.map((city) => ({ value: city, label: city })),
  { value: "autre-commune", label: "Une autre commune du Bénin" },
  { value: "hors-benin", label: "Hors du Bénin" },
];

const PROPERTY_KIND_OPTIONS: readonly FieldOption[] = [
  { value: "villa", label: "Maison / villa" },
  { value: "appartement", label: "Appartement" },
  { value: "studio", label: "Studio" },
  { value: "terrain", label: "Terrain / parcelle" },
  { value: "local", label: "Local commercial" },
  { value: "plusieurs", label: "Plusieurs types" },
];

/** Identité et contact : les mêmes pour les trois rôles. */
const IDENTITY_FIELDS: readonly FieldSpec[] = [
  {
    name: "prenom",
    label: "Prénom",
    kind: "text",
    group: "identite",
    required: true,
    autoComplete: "given-name",
    placeholder: "Awa",
    maxLength: 40,
    span: "half",
  },
  {
    name: "nom",
    label: "Nom",
    kind: "text",
    group: "identite",
    required: true,
    autoComplete: "family-name",
    placeholder: "Dossou",
    maxLength: 40,
    span: "half",
  },
  {
    name: "email",
    label: "Adresse e-mail",
    kind: "email",
    group: "identite",
    required: true,
    autoComplete: "email",
    placeholder: "vous@exemple.com",
    help: "C’est l’adresse du compte : elle identifie votre espace et recevra les nouvelles importantes.",
    span: "half",
  },
  {
    name: "telephone",
    label: "Téléphone",
    kind: "tel",
    group: "identite",
    required: true,
    autoComplete: "tel",
    inputMode: "tel",
    placeholder: "+229 01 97 00 00 00",
    help: "Utilisé pour les visites et les dossiers — jamais publié sur le site.",
    span: "half",
  },
  {
    name: "zone",
    label: "Zone principale",
    kind: "select",
    group: "identite",
    required: true,
    options: ZONE_OPTIONS,
    help: "Le pilote couvre Cotonou, Abomey-Calavi, Porto-Novo et Ouidah ; les autres zones sont enregistrées pour la suite.",
    span: "full",
  },
];

/** Ce que chaque rôle ajoute — c’est ici que l’inscription s’adapte. */
const ROLE_PROFILE_FIELDS: Record<AccountRole, readonly FieldSpec[]> = {
  client: [
    {
      name: "projet",
      label: "Votre projet",
      kind: "select",
      group: "profil",
      required: true,
      placeholder: "Choisir un projet",
      options: [
        { value: "acheter", label: "Acheter" },
        { value: "louer", label: "Louer" },
        { value: "sejour", label: "Séjourner" },
        { value: "investir", label: "Investir" },
      ],
      span: "half",
    },
    {
      name: "bienRecherche",
      label: "Type de bien recherché",
      kind: "select",
      group: "profil",
      required: true,
      placeholder: "Choisir un type",
      options: PROPERTY_KIND_OPTIONS,
      span: "half",
    },
    {
      name: "budget",
      label: "Budget indicatif",
      kind: "select",
      group: "profil",
      required: true,
      placeholder: "Choisir une fourchette",
      options: [
        { value: "location-100", label: "Jusqu’à 100 000 FCFA / mois" },
        { value: "location-500", label: "100 000 à 500 000 FCFA / mois" },
        { value: "achat-25", label: "5 à 25 millions FCFA" },
        { value: "achat-75", label: "25 à 75 millions FCFA" },
        { value: "achat-75-plus", label: "Plus de 75 millions FCFA" },
        { value: "a-definir", label: "À définir avec un conseiller" },
      ],
      help: "Il sert à filtrer les alertes ; il reste modifiable dans votre espace.",
      span: "full",
    },
    {
      name: "horizon",
      label: "Horizon du projet (facultatif)",
      kind: "select",
      group: "profil",
      options: [
        { value: "", label: "Non précisé" },
        { value: "immediat", label: "Immédiat" },
        { value: "trois-mois", label: "Dans les trois mois" },
        { value: "annee", label: "Dans l’année" },
        { value: "information", label: "Je m’informe" },
      ],
      span: "full",
    },
  ],
  proprietaire: [
    {
      name: "portefeuille",
      label: "Biens à confier",
      kind: "select",
      group: "profil",
      required: true,
      options: [
        { value: "1", label: "1 bien" },
        { value: "2-5", label: "2 à 5 biens" },
        { value: "6-20", label: "6 à 20 biens" },
        { value: "20-plus", label: "Plus de 20 biens" },
      ],
      span: "half",
    },
    {
      name: "natureBiens",
      label: "Nature des biens",
      kind: "select",
      group: "profil",
      required: true,
      options: PROPERTY_KIND_OPTIONS,
      span: "half",
    },
    {
      name: "zoneBiens",
      label: "Où se trouvent vos biens",
      kind: "select",
      group: "profil",
      required: true,
      options: [
        ...COVERED_CITIES.map((city) => ({ value: city, label: city })),
        { value: "plusieurs-communes", label: "Plusieurs communes" },
        { value: "hors-zone", label: "Hors zone couverte" },
      ],
      span: "half",
    },
    {
      name: "usage",
      label: "Projet pour ces biens",
      kind: "select",
      group: "profil",
      required: true,
      placeholder: "Choisir un projet",
      options: [
        { value: "location", label: "Mise en location" },
        { value: "vente", label: "Vente" },
        { value: "saisonniere", label: "Location saisonnière" },
        { value: "gestion", label: "Gestion complète" },
      ],
      span: "half",
    },
    {
      name: "situation",
      label: "Votre situation",
      kind: "select",
      group: "profil",
      required: true,
      options: [
        { value: "benin", label: "Je réside au Bénin" },
        { value: "diaspora", label: "Je réside à l’étranger" },
        { value: "mandataire", label: "Je représente le propriétaire (mandat)" },
      ],
      help: "Un propriétaire qui réside à l’étranger suit son dossier à distance : chaque étape reste datée.",
      span: "full",
    },
    {
      name: "ifu",
      label: "IFU du propriétaire (facultatif)",
      kind: "text",
      group: "profil",
      inputMode: "numeric",
      placeholder: "13 chiffres",
      help: "Utile pour la mise en location et la facturation. Jamais affiché publiquement.",
      maxLength: 13,
      span: "full",
    },
  ],
  agent: [
    {
      name: "structure",
      label: "Structure ou agence",
      kind: "text",
      group: "profil",
      required: true,
      autoComplete: "organization",
      placeholder: "Nom de votre agence",
      maxLength: 80,
      span: "half",
    },
    {
      name: "identification",
      label: "RCCM ou IFU de la structure",
      kind: "text",
      group: "profil",
      required: true,
      placeholder: "RB/COT/… ou 13 chiffres",
      help: "Sert à vérifier que la structure existe avant l’ouverture de l’espace de dépôt.",
      maxLength: 40,
      span: "half",
    },
    {
      name: "zoneExercice",
      label: "Zone d’exercice",
      kind: "select",
      group: "profil",
      required: true,
      options: [
        ...COVERED_CITIES.map((city) => ({ value: city, label: city })),
        { value: "plusieurs-communes", label: "Plusieurs communes" },
      ],
      span: "half",
    },
    {
      name: "experience",
      label: "Expérience",
      kind: "select",
      group: "profil",
      required: true,
      placeholder: "Choisir une tranche",
      options: [
        { value: "moins-1", label: "Moins d’un an" },
        { value: "1-3", label: "1 à 3 ans" },
        { value: "3-10", label: "3 à 10 ans" },
        { value: "10-plus", label: "Plus de 10 ans" },
      ],
      span: "half",
    },
    {
      name: "cartePro",
      label: "Carte professionnelle (facultatif)",
      kind: "text",
      group: "profil",
      placeholder: "Numéro de carte",
      maxLength: 40,
      span: "full",
    },
  ],
};

/** Sécurité : mot de passe, confirmation, consentements — mêmes règles pour tous. */
const SECURITY_FIELDS: readonly FieldSpec[] = [
  {
    name: "motDePasse",
    label: "Mot de passe",
    kind: "password",
    group: "securite",
    required: true,
    autoComplete: "new-password",
    span: "full",
  },
  {
    name: "confirmation",
    label: "Confirmer le mot de passe",
    kind: "password",
    group: "securite",
    required: true,
    autoComplete: "new-password",
    span: "full",
  },
];

const CONSENT_FIELDS: Record<AccountRole, readonly FieldSpec[]> = {
  client: [
    {
      name: "alertes",
      label: "Recevoir une alerte quand un bien vérifié correspond à mes critères",
      kind: "checkbox",
      group: "securite",
      help: "Facultatif, modifiable à tout moment depuis votre espace.",
      span: "full",
    },
  ],
  proprietaire: [
    {
      name: "mandat",
      label:
        "Je certifie être propriétaire des biens déclarés, ou disposer d’un mandat écrit de leur propriétaire.",
      kind: "checkbox",
      group: "securite",
      required: true,
      span: "full",
    },
  ],
  agent: [
    {
      name: "mandat",
      label:
        "Je certifie disposer d’un mandat écrit pour chaque bien que je présenterai sur HOMERA.",
      kind: "checkbox",
      group: "securite",
      required: true,
      span: "full",
    },
  ],
};

const TERMS_FIELD: FieldSpec = {
  name: "conditions",
  label: "J’accepte les conditions d’utilisation et la politique de confidentialité.",
  kind: "checkbox",
  group: "securite",
  required: true,
  span: "full",
};

/** Ordre d’affichage et contenu complet du formulaire pour un rôle donné. */
export function roleFields(role: AccountRole): readonly FieldSpec[] {
  return [
    ...IDENTITY_FIELDS,
    ...ROLE_PROFILE_FIELDS[role],
    ...SECURITY_FIELDS,
    ...CONSENT_FIELDS[role],
    TERMS_FIELD,
  ];
}

/** Les champs de profil d’un rôle — utilisés par la validation et par la fiche du compte. */
export function profileFields(role: AccountRole): readonly FieldSpec[] {
  return ROLE_PROFILE_FIELDS[role];
}

export function fieldByName(role: AccountRole, name: string): FieldSpec | undefined {
  return roleFields(role).find((field) => field.name === name);
}

export function groupFields(role: AccountRole, group: FieldGroup): readonly FieldSpec[] {
  return roleFields(role).filter((field) => field.group === group);
}

/* ------------------------------------------------------------------
   VALEURS DE FORMULAIRE
   ------------------------------------------------------------------ */

export type FieldValue = string | boolean;
export type FormValues = Record<string, FieldValue>;

export type ValidationResult = {
  ok: boolean;
  /** Message par champ — sert directement à `aria-describedby`. */
  fields: Record<string, string>;
  /** Message général (mot de passe, consentement, panne de stockage…). */
  form?: string;
};

export function emptyValues(role: AccountRole): FormValues {
  const values: FormValues = {};
  for (const field of roleFields(role)) {
    values[field.name] = field.kind === "checkbox" ? false : field.kind === "select" && !field.required ? "" : "";
  }
  return values;
}

export function textValue(values: FormValues, name: string): string {
  const value = values[name];
  return typeof value === "string" ? value.trim() : "";
}

export function boolValue(values: FormValues, name: string): boolean {
  return values[name] === true;
}

/* ------------------------------------------------------------------
   CONTRÔLES DE SAISIE
   ------------------------------------------------------------------ */

/** Suffisamment strict pour attraper une faute de frappe, jamais pour exclure une adresse valable. */
export function isEmail(value: string): boolean {
  const email = value.trim();
  if (email.length < 6 || email.length > 160) return false;
  if (email.includes("..")) return false;
  return /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/.test(email);
}

/** Numéros béninois et internationaux : on compte les chiffres, pas la mise en forme. */
export function phoneDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export function isPhone(value: string): boolean {
  const digits = phoneDigits(value);
  if (digits.length < 8 || digits.length > 15) return false;
  // Un numéro béninois s’écrit 01 97 00 00 00 (10 chiffres) ou 97 00 00 00 (8 chiffres).
  if (value.trim().startsWith("+229") || digits.startsWith("229")) {
    const national = digits.startsWith("229") ? digits.slice(3) : digits;
    return national.length === 8 || (national.length === 10 && national.startsWith("01"));
  }
  return true;
}

/** Les numéros se lisent par paires de chiffres, jamais par triades. */
function groupPairs(digits: string): string {
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

/**
 * Mise en forme lisible d’un numéro saisi :
 * « +2290197000000 » et « 0197000000 » deviennent « +229 01 97 00 00 00 »
 * et « 01 97 00 00 00 » — un numéro béninois se lit par paires.
 * Un indicatif qu’on ne connaît pas n’est jamais reformaté d’office : le
 * numéro est rendu tel qu’il a été saisi, jamais réécrit de travers.
 */
export function formatPhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  const digits = phoneDigits(trimmed);
  if (digits.length === 0) return trimmed;

  // Le seul indicatif que HOMERA connaît : celui du Bénin.
  const benin = digits.startsWith("229") && digits.length > 10;
  if (trimmed.startsWith("+") && !benin) return trimmed;
  if (benin) {
    const rest = digits.slice(3);
    return rest === "" ? "+229" : `+229 ${groupPairs(rest)}`;
  }
  return groupPairs(digits);
}

/** L’IFU béninois compte 13 chiffres ; on ne l’impose que s’il est renseigné. */
export function isIfu(value: string): boolean {
  return /^\d{13}$/.test(phoneDigits(value));
}

/** RCCM ou IFU : une référence d’au moins six caractères, lettres et chiffres. */
export function isBusinessId(value: string): boolean {
  const cleaned = value.replace(/[\s./-]/g, "");
  return cleaned.length >= 6 && /^[A-Za-z0-9]+$/.test(cleaned);
}

/* ------------------------------------------------------------------
   MOT DE PASSE — politique annoncée = politique appliquée
   ------------------------------------------------------------------ */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_STRONG_LENGTH = 14;

export type PasswordContext = { prenom?: string; nom?: string; email?: string };

export type PasswordCriterion = {
  id: "longueur" | "casse" | "chiffre" | "symbole" | "personnel";
  label: string;
  required: boolean;
  met: boolean;
};

function comparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Le mot de passe ne doit pas contenir le prénom, le nom ou la partie locale de l’e-mail. */
export function passwordEchoesIdentity(password: string, context: PasswordContext = {}): boolean {
  const haystack = comparable(password);
  if (haystack.length === 0) return false;
  const candidates = [
    context.prenom ?? "",
    context.nom ?? "",
    (context.email ?? "").split("@")[0] ?? "",
  ]
    .map(comparable)
    .filter((entry) => entry.length >= 3);
  return candidates.some((entry) => haystack.includes(entry));
}

export function passwordCriteria(password: string, context: PasswordContext = {}): PasswordCriterion[] {
  return [
    {
      id: "longueur",
      label: `${PASSWORD_MIN_LENGTH} caractères minimum`,
      required: true,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "casse",
      label: "Une minuscule et une majuscule",
      required: true,
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      id: "chiffre",
      label: "Au moins un chiffre",
      required: true,
      met:/\d/.test(password),
    },
    {
      id: "personnel",
      label: "Ne reprend ni votre nom ni votre e-mail",
      required: true,
      met: !passwordEchoesIdentity(password, context),
    },
    {
      id: "symbole",
      label: "Un caractère spécial renforce l’ensemble (recommandé)",
      required: false,
      met:/[^A-Za-z0-9]/.test(password),
    },
  ];
}

export type PasswordStrength = {
  /** 0 → 4, sur les cinq critères (le symbole et la longueur longue comptent double). */
  score: number;
  /** 0 fragile · 1 moyen · 2 solide · 3 très solide */
  level: 0 | 1 | 2 | 3;
  label: string;
  /** Classe sémantique déjà décidée ici : les composants ne la recalculent pas. */
  tone: "error" | "warning" | "success";
  percent: number;
};

export function passwordStrength(password: string, context: PasswordContext = {}): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, level: 0, label: "Aucun mot de passe", tone: "error", percent: 0 };
  }
  const checks = passwordCriteria(password, context);
  const score = checks.filter((check) => check.met).length + (password.length >= PASSWORD_STRONG_LENGTH ? 1 : 0);
  if (score <= 2) {
    return { score, level: 0, label: "Fragile", tone: "error", percent: 25 };
  }
  if (score === 3) {
    return { score, level: 1, label: "Moyen", tone: "warning", percent: 50 };
  }
  if (score === 4) {
    return { score, level: 2, label: "Solide", tone: "success", percent: 75 };
  }
  return { score, level: 3, label: "Très solide", tone: "success", percent: 100 };
}

export function passwordProblems(password: string, context: PasswordContext = {}): string[] {
  return passwordCriteria(password, context)
    .filter((check) => check.required && !check.met)
    .map((check) => check.label);
}

/* ------------------------------------------------------------------
   VALIDATION DE L’INSCRIPTION
   ------------------------------------------------------------------ */

/**
 * Contrôles communs à tout jeu de champs : présence des champs obligatoires,
 * formats (e-mail, téléphone, IFU, RCCM) et longueurs. L’inscription et
 * l’ajout d’un rôle passent par ici : une règle ne se corrige qu’une fois.
 */
function validateFieldList(specs: readonly FieldSpec[], values: FormValues): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const field of specs) {
    if (field.kind === "password" || field.kind === "checkbox") continue;
    const value = textValue(values, field.name);

    if (field.required && value === "") {
      fields[field.name] = "Ce champ est nécessaire pour ouvrir le compte.";
      continue;
    }
    if (value === "") continue;

    if (field.kind === "email" && !isEmail(value)) {
      fields[field.name] = "Cette adresse semble incomplète — vérifiez le « @ » et le domaine.";
    }
    if (field.kind === "tel" && !isPhone(value)) {
      fields[field.name] = "Indiquez un numéro joignable, avec l’indicatif si vous êtes à l’étranger.";
    }
    if (field.name === "ifu" && !isIfu(value)) {
      fields[field.name] = "Un IFU compte treize chiffres — laissez vide si vous ne le connaissez pas.";
    }
    if (field.name === "identification" && !isBusinessId(value)) {
      fields[field.name] =
        "Indiquez le RCCM (ex. RB/COT/24 B 1234) ou l’IFU de la structure — six caractères minimum.";
    }
    if (field.maxLength && value.length > field.maxLength) {
      fields[field.name] = `${field.maxLength} caractères maximum.`;
    }
  }
  return fields;
}

export function validateSignUp(role: AccountRole, values: FormValues): ValidationResult {
  const fields = validateFieldList(roleFields(role), values);
  const password = textValue(values, "motDePasse");
  const context: PasswordContext = {
    prenom: textValue(values, "prenom"),
    nom: textValue(values, "nom"),
    email: textValue(values, "email"),
  };

  if (password === "") {
    fields.motDePasse = "Choisissez un mot de passe : il protège l’accès à votre espace.";
  } else {
    const problems = passwordProblems(password, context);
    if (problems.length > 0) {
      fields.motDePasse = `Mot de passe trop faible : ${problems.join(", ").toLowerCase()}.`;
    }
  }

  const confirmation = textValue(values, "confirmation");
  if (confirmation !== password) {
    fields.confirmation = "Les deux mots de passe ne correspondent pas.";
  }

  for (const field of roleFields(role)) {
    if (field.kind !== "checkbox" || !field.required) continue;
    if (!boolValue(values, field.name)) {
      fields[field.name] = "Cette case doit être cochée pour continuer.";
    }
  }

  const form =
    Object.keys(fields).length > 0
      ? "Quelques informations restent à corriger avant l’ouverture du compte."
      : undefined;

  return { ok: Object.keys(fields).length === 0, fields, form };
}

/**
 * Champs demandés pour ajouter un rôle à un compte existant : le profil du
 * rôle, et son consentement propre (mandat, certification de propriété).
 * Ni l’identité, ni le mot de passe, ni les conditions générales — déjà
 * acceptées à l’ouverture du compte — ne sont redemandés.
 */
export function upgradeFields(role: AccountRole): readonly FieldSpec[] {
  return [
    ...profileFields(role),
    ...roleFields(role).filter(
      (field) => field.kind === "checkbox" && field.required && field.name !== "conditions",
    ),
  ];
}

/** Ajouter un rôle à un compte existant : seuls les champs du rôle ajouté sont demandés. */
export function validateRoleUpgrade(role: AccountRole, values: FormValues): ValidationResult {
  const fields = validateFieldList(upgradeFields(role), values);

  for (const field of upgradeFields(role)) {
    if (field.kind !== "checkbox" || !field.required) continue;
    if (!boolValue(values, field.name)) {
      fields[field.name] = "Cette case doit être cochée pour ajouter ce rôle.";
    }
  }

  return {
    ok: Object.keys(fields).length === 0,
    fields,
    form:
      Object.keys(fields).length > 0
        ? "Quelques informations restent à compléter pour ajouter ce rôle."
        : undefined,
  };
}

/** Instantané du profil d’un rôle : seuls les champs renseignés sont conservés. */
export function profileSnapshot(role: AccountRole, values: FormValues): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const field of profileFields(role)) {
    const value = textValue(values, field.name);
    if (value !== "") snapshot[field.name] = value;
  }
  return snapshot;
}

/** Valeurs vides du formulaire d’ajout d’un rôle. */
export function emptyProfileValues(role: AccountRole): FormValues {
  const values: FormValues = {};
  for (const field of upgradeFields(role)) {
    values[field.name] = field.kind === "checkbox" ? false : "";
  }
  return values;
}

/* ------------------------------------------------------------------
   CONNEXION, RÉINITIALISATION, VÉRIFICATION
   ------------------------------------------------------------------ */

export function validateSignIn(values: FormValues): ValidationResult {
  const fields: Record<string, string> = {};
  const email = textValue(values, "email");
  const password = textValue(values, "motDePasse");

  if (email === "") fields.email = "Indiquez l’adresse e-mail du compte.";
  else if (!isEmail(email)) fields.email = "Cette adresse semble incomplète.";

  if (password === "") fields.motDePasse = "Indiquez votre mot de passe.";

  return { ok: Object.keys(fields).length === 0, fields };
}

export function validateEmailOnly(value: string): string | undefined {
  if (value.trim() === "") return "Indiquez l’adresse e-mail du compte.";
  if (!isEmail(value)) return "Cette adresse semble incomplète — vérifiez le « @ » et le domaine.";
  return undefined;
}

export function validateNewPassword(password: string, confirmation: string, context: PasswordContext = {}): ValidationResult {
  const fields: Record<string, string> = {};
  const problems = passwordProblems(password, context);
  if (password === "") fields.motDePasse = "Choisissez un nouveau mot de passe.";
  else if (problems.length > 0) {
    fields.motDePasse = `Mot de passe trop faible : ${problems.join(", ").toLowerCase()}.`;
  }
  if (confirmation !== password) fields.confirmation = "Les deux mots de passe ne correspondent pas.";
  return { ok: Object.keys(fields).length === 0, fields };
}

export function isVerificationCode(value: string): boolean {
  return /^\d{6}$/.test(value.replace(/\s/g, ""));
}

export function validateCode(value: string): string | undefined {
  const code = value.replace(/\s/g, "");
  if (code === "") return "Saisissez le code à six chiffres.";
  if (!isVerificationCode(code)) return "Le code compte six chiffres.";
  return undefined;
}

/* ------------------------------------------------------------------
   CODES ET JETONS — durées annoncées à l’écran
   ------------------------------------------------------------------ */

export const VERIFICATION_TTL_MINUTES = 15;
export const RESET_TTL_MINUTES = 30;
export const VERIFICATION_TTL_MS = VERIFICATION_TTL_MINUTES * 60 * 1000;
export const RESET_TTL_MS = RESET_TTL_MINUTES * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

export type RandomSource = () => number;

/** Code à six chiffres — le zéro initial est conservé (padStart). */
export function generateCode(random: RandomSource = Math.random): string {
  const value = Math.floor(random() * 1_000_000);
  return String(Math.min(Math.max(value, 0), 999_999)).padStart(6, "0");
}

/** Jeton d’URL pour la réinitialisation : 32 caractères hexadécimaux. */
export function generateToken(random: RandomSource = Math.random): string {
  let token = "";
  while (token.length < 32) {
    token += Math.floor(random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  }
  return token.slice(0, 32);
}

export type CodeState = "ok" | "expired" | "locked" | "absent";

export type CodeRecordLike = { code: string; expiresAt: number; attempts: number } | null | undefined;

export function codeState(record: CodeRecordLike, now: number): CodeState {
  if (!record) return "absent";
  if (record.expiresAt <= now) return "expired";
  if (record.attempts >= MAX_CODE_ATTEMPTS) return "locked";
  return "ok";
}

export function attemptsLeft(record: CodeRecordLike): number {
  if (!record) return 0;
  return Math.max(0, MAX_CODE_ATTEMPTS - record.attempts);
}

/** « 12 minutes », « 45 secondes » — toujours au singulier/pluriel correct. */
export function durationLabel(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

/* ------------------------------------------------------------------
   AFFICHAGE — masquer sans perdre le repère
   ------------------------------------------------------------------ */

/** « awa.dossou@exemple.com » → « a•••••••@exemple.com » : on reconnaît sans exposer. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (domain === "") return email;
  const head = local.slice(0, 1);
  return `${head}${"•".repeat(Math.max(3, local.length - 1))}@${domain}`;
}

/** « +229 01 97 00 00 00 » → « +229 01 •• •• •• 00 » : les deux derniers chiffres suffisent. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  const tail = digits.slice(-2);
  const prefix = phone.trim().startsWith("+") ? `+${digits.slice(0, 3)} ` : "";
  return `${prefix}${"•".repeat(4)} ${"•".repeat(4)} ${tail}`;
}

/** « Awa Dossou » — le nom affiché partout, jamais vide. */
export function fullName(prenom: string, nom: string, fallback = "Votre compte"): string {
  const name = `${prenom} ${nom}`.trim();
  return name === "" ? fallback : name;
}

export function initials(prenom: string, nom: string): string {
  const first = prenom.trim().slice(0, 1);
  const last = nom.trim().slice(0, 1);
  const pair = `${first}${last}`.toUpperCase();
  return pair === "" ? "H" : pair;
}

/* ------------------------------------------------------------------
   FICHE DU COMPTE — libellés lisibles des champs de profil
   ------------------------------------------------------------------ */

export type ProfileLine = { name: string; label: string; value: string };

/**
 * Fiche du compte : les champs de **tous** les rôles détenus, dans l’ordre
 * du catalogue, sans doublon. Un client devenu propriétaire garde donc
 * visibles ses informations de recherche comme celles de ses biens.
 */
export function describeProfile(
  roleOrRoles: AccountRole | readonly AccountRole[],
  profile: Record<string, string>,
): ProfileLine[] {
  const roles = typeof roleOrRoles === "string" ? [roleOrRoles] : [...roleOrRoles];
  const lines: ProfileLine[] = [];
  const seen = new Set<string>();
  for (const role of ROLE_ORDER) {
    if (!roles.includes(role)) continue;
    for (const field of profileFields(role)) {
      if (field.kind === "password" || field.kind === "checkbox") continue;
      if (seen.has(field.name)) continue;
      const raw = profile[field.name] ?? "";
      if (raw === "") continue;
      seen.add(field.name);
      const option = field.options?.find((entry) => entry.value === raw);
      lines.push({
        name: field.name,
        label: field.label.replace(/\s*\(facultatif\)$/i, ""),
        value: option?.label ?? raw,
      });
    }
  }
  return lines;
}

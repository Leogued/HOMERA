import { MEDIA, type MediaAsset } from "@/lib/media.generated";

/* ==================================================================
   HOMERA — CONTENU DE LA PAGE D’ACCUEIL
   ------------------------------------------------------------------
   Tout le texte, les chiffres et les jeux d’options vivent ici : la
   page se pilote depuis ce fichier sans toucher au design.

   ⚠️ Les valeurs chiffrées sont des DONNÉES DE DÉMONSTRATION du
   système pilote HOMERA (voir `DEMO_DATA` ci-dessous). Aucun chiffre
   réel n’est affirmé tant que l’API ne les fournit pas.
   ================================================================== */

/** Bascule unique : `true` tant que les chiffres réels ne sont pas branchés. */
export const DEMO_DATA = true;

/* ------------------------------------------------------------------
   VISUELS — replis temporaires
   ------------------------------------------------------------------
   Quelques visuels dédiés ne sont pas encore produits. Plutôt que de
   laisser un vide, chaque clé manquante pointe vers le visuel HOMERA
   le plus proche ; dès que le fichier dédié arrive (npm run images),
   il prend automatiquement sa place. Rien d’autre à modifier.
   ------------------------------------------------------------------ */

const MEDIA_FALLBACKS: Record<string, string> = {
  "service-demenagement": "prop-duplex",
  "service-travaux": "intent-louer",
  "editorial-architecture": "intent-acheter",
  "editorial-quartier": "prop-appartement",
  "editorial-lifestyle": "intent-sejourner",
  "cta-night": "prop-villa",
};

/** Récupère un visuel du manifeste (repli documenté si la source n’existe pas encore). */
export function media(key: string): MediaAsset | null {
  return MEDIA[key] ?? MEDIA[MEDIA_FALLBACKS[key] ?? ""] ?? null;
}

/* ------------------------------------------------------------------
   CHAPITRES — fil conducteur du scroll (rail latéral + repères)
   ------------------------------------------------------------------ */

export type Chapter = { id: string; index: string; label: string };

export const CHAPTERS: Chapter[] = [
  { id: "hero", index: "01", label: "Immersion" },
  { id: "chiffres", index: "02", label: "Repères" },
  { id: "explorer", index: "03", label: "Intentions" },
  { id: "biens", index: "04", label: "Sélection" },
  { id: "bien-homera", index: "05", label: "Identité du bien" },
  { id: "protocole", index: "06", label: "Vérification" },
  { id: "services", index: "07", label: "Écosystème" },
  { id: "magazine", index: "08", label: "Magazine" },
  { id: "manifeste", index: "09", label: "Manifeste" },
];

/* ------------------------------------------------------------------
   HERO — module de recherche
   ------------------------------------------------------------------ */

export type SelectOption = { value: string; label: string; hint?: string };

export const SEARCH_SELECTS = {
  project: [
    { value: "acheter", label: "Acheter", hint: "Devenir propriétaire" },
    { value: "louer", label: "Louer", hint: "Se loger au quotidien" },
    { value: "sejour", label: "Séjour", hint: "Nuitée & courte durée" },
  ] satisfies SelectOption[],
  location: [
    { value: "Cotonou", label: "Cotonou", hint: "Fidjrossè, Akpakpa, Ganhi…" },
    { value: "Abomey-Calavi", label: "Abomey-Calavi", hint: "Tankpè, Akassato…" },
    { value: "Fidjrossè", label: "Fidjrossè", hint: "Cotonou" },
    { value: "Akpakpa", label: "Akpakpa", hint: "Cotonou" },
    { value: "Tankpè", label: "Tankpè", hint: "Abomey-Calavi" },
    { value: "Akassato", label: "Akassato", hint: "Abomey-Calavi" },
    { value: "Porto-Novo", label: "Porto-Novo", hint: "Ouémé" },
    { value: "Ouidah", label: "Ouidah", hint: "Atlantique" },
  ] satisfies SelectOption[],
  propertyType: [
    { value: "appartement", label: "Appartement", hint: "F2 → F5, duplex" },
    { value: "studio", label: "Studio", hint: "Meublé ou vide" },
    { value: "villa", label: "Villa", hint: "Standing, jardin, piscine" },
    { value: "maison", label: "Maison", hint: "Familiale, cour, étage" },
    { value: "terrain", label: "Terrain nu", hint: "Parcelle, lotissement" },
    { value: "parcelle", label: "Parcelle", hint: "Avec titre ou ACD" },
    { value: "local", label: "Local commercial", hint: "Boutique, bureau" },
  ] satisfies SelectOption[],
} as const;

export type SearchFieldName = keyof typeof SEARCH_SELECTS | "budget";

export const SEARCH_FIELD_LABELS: Record<SearchFieldName, string> = {
  project: "Projet",
  location: "Localisation",
  propertyType: "Type de bien",
  budget: "Montant",
};

/** Montants proposés selon le projet : un budget d’achat ne se lit pas comme un loyer. */
export const BUDGET_OPTIONS: Record<string, SelectOption[]> = {
  achat: [
    { value: "5 000 000", label: "Jusqu’à 5 M FCFA", hint: "Petites parcelles" },
    { value: "10 000 000", label: "Jusqu’à 10 M FCFA", hint: "Lotissements viabilisés" },
    { value: "25 000 000", label: "Jusqu’à 25 M FCFA", hint: "Terrains avec titre" },
    { value: "50 000 000", label: "Jusqu’à 50 M FCFA", hint: "Villas & immeubles" },
    { value: "100 000 000", label: "Jusqu’à 100 M FCFA", hint: "Programmes & foncier" },
  ],
  periodique: [
    { value: "50 000", label: "Jusqu’à 50 000 FCFA", hint: "Par mois ou par nuitée" },
    { value: "100 000", label: "Jusqu’à 100 000 FCFA", hint: "Par mois ou par nuitée" },
    { value: "250 000", label: "Jusqu’à 250 000 FCFA", hint: "Par mois ou par nuitée" },
    { value: "500 000", label: "Jusqu’à 500 000 FCFA", hint: "Par mois ou par nuitée" },
    { value: "1 000 000", label: "Jusqu’à 1 000 000 FCFA", hint: "Par mois ou par nuitée" },
  ],
};

/* ------------------------------------------------------------------
   CHIFFRES — données de démonstration, éditez ces valeurs ici
   ------------------------------------------------------------------ */

export type Stat = {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  description: string;
  icon: "shield" | "user-check" | "users" | "map-pin";
};

export const STATS: Stat[] = [
  {
    value: 250,
    prefix: "+",
    label: "Biens vérifiés",
    description: "Villas, studios et appartements dotés d’un identifiant unique traçable.",
    icon: "shield",
  },
  {
    value: 120,
    prefix: "+",
    label: "Propriétaires",
    description: "Propriétaires enregistrés et titulaires identifiés au Bénin.",
    icon: "user-check",
  },
  {
    value: 80,
    prefix: "+",
    label: "Agents identifiés",
    description: "Mandataires habilités pour les visites et les dossiers de location.",
    icon: "users",
  },
  {
    value: 4,
    label: "Villes couvertes",
    description: "Cotonou, Abomey-Calavi, Porto-Novo et Ouidah.",
    icon: "map-pin",
  },
];

/* ------------------------------------------------------------------
   INTENTIONS — les quatre portes d’entrée
   ------------------------------------------------------------------ */

export type Intent = {
  id: string;
  anchor: string;
  index: string;
  title: string;
  claim: string;
  description: string;
  bullets: string[];
  cta: string;
  media: string;
  /** Filtres appliqués à la sélection quand on suit cette porte. */
  filter: { project?: string; propertyType?: string };
};

export const INTENTS: Intent[] = [
  {
    id: "acheter",
    anchor: "acheter",
    index: "01",
    title: "Acheter",
    claim: "Constituer un patrimoine sans zone d’ombre",
    description:
      "Terrains, maisons et villas : HOMERA identifie le propriétaire réel et contrôle le mandat avant toute mise en relation.",
    bullets: [
      "Documents de propriété et autorisations examinés",
      "Historique du bien consultable avant engagement",
    ],
    cta: "Explorer les biens en vente",
    media: "intent-acheter",
    filter: { project: "acheter" },
  },
  {
    id: "louer",
    anchor: "louer",
    index: "02",
    title: "Louer",
    claim: "Se loger au quotidien, sans mauvaise surprise",
    description:
      "Des fiches complètes, des photos fidèles et une prise de rendez-vous transparente pour visiter sans perdre de temps.",
    bullets: [
      "Visites sur créneau planifié, mandataire identifié",
      "Parcours structuré : demande → contrat → remise des clés",
    ],
    cta: "Voir les locations disponibles",
    media: "intent-louer",
    filter: { project: "louer" },
  },
  {
    id: "sejour",
    anchor: "sejour",
    index: "03",
    title: "Séjourner",
    claim: "L’hospitalité béninoise, dans des espaces vérifiés",
    description:
      "Déplacements professionnels, famille ou diaspora de passage : réservez une nuitée ou quelques semaines en confiance.",
    bullets: [
      "Logements meublés et équipés aux standards contrôlés",
      "Disponibilités tenues à jour, accueil organisé",
    ],
    cta: "Réserver un séjour",
    media: "intent-sejourner",
    filter: { project: "sejour" },
  },
  {
    id: "investir",
    anchor: "investir",
    index: "04",
    title: "Investir",
    claim: "Faire travailler un capital dans la pierre béninoise",
    description:
      "Foncier, locatif résidentiel ou commercial : HOMERA documente chaque dossier pour éclairer votre décision.",
    bullets: [
      "Lecture du potentiel locatif et de l’environnement",
      "Suivi de la gestion et de l’entretien après acquisition",
    ],
    cta: "Découvrir les opportunités",
    media: "intent-investir",
    filter: { project: "acheter", propertyType: "terrain" },
  },
];

/* ------------------------------------------------------------------
   BIENS — jeu de démonstration de la sélection certifiée
   ------------------------------------------------------------------ */

export type PropertyType = "villa" | "appartement" | "studio" | "terrain" | "local";
export type PropertyIntent = "acheter" | "louer" | "sejour";

export type Property = {
  id: string;
  homeraId: string;
  title: string;
  type: PropertyType;
  intent: PropertyIntent;
  price: number;
  priceLabel: string;
  pricePeriod?: string;
  city: string;
  district: string;
  bedrooms: number;
  bathrooms: number;
  surface: number;
  verifiedOn: string;
  media: string;
  alt: string;
};

export const PROPERTIES: Property[] = [
  {
    id: "villa-fidjrosse",
    homeraId: "HOM-CTN-000421",
    title: "Villa 4 chambres & jardin tropical",
    type: "villa",
    intent: "louer",
    price: 450_000,
    priceLabel: "450 000 FCFA",
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Fidjrossè Calvaire",
    bedrooms: 4,
    bathrooms: 3,
    surface: 280,
    verifiedOn: "12/09/2026",
    media: "prop-villa",
    alt: "Villa contemporaine avec terrasse couverte, jardin tropical et piscine, lumière de fin de journée",
  },
  {
    id: "appartement-haie-vive",
    homeraId: "HOM-CTN-000305",
    title: "Appartement F3 avec balcon & vue dégagée",
    type: "appartement",
    intent: "louer",
    price: 220_000,
    priceLabel: "220 000 FCFA",
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Haie Vive",
    bedrooms: 2,
    bathrooms: 2,
    surface: 110,
    verifiedOn: "05/09/2026",
    media: "prop-appartement",
    alt: "Immeuble d’appartements contemporain à balcons profonds et pare-soleil en bois",
  },
  {
    id: "parcelle-tankpe",
    homeraId: "HOM-CAL-000108",
    title: "Parcelle clôturée de 500 m² avec titre foncier",
    type: "terrain",
    intent: "acheter",
    price: 18_500_000,
    priceLabel: "18 500 000 FCFA",
    city: "Abomey-Calavi",
    district: "Tankpè Carrefour",
    bedrooms: 0,
    bathrooms: 0,
    surface: 500,
    verifiedOn: "14/09/2026",
    media: "prop-terrain",
    alt: "Parcelle clôturée bordée de cocotiers le long d’une voie en latérite",
  },
  {
    id: "duplex-ganhi",
    homeraId: "HOM-CTN-000512",
    title: "Duplex de standing meublé, séjour courte durée",
    type: "appartement",
    intent: "sejour",
    price: 45_000,
    priceLabel: "45 000 FCFA",
    pricePeriod: "/ nuitée",
    city: "Cotonou",
    district: "Ganhi",
    bedrooms: 2,
    bathrooms: 2,
    surface: 95,
    verifiedOn: "18/09/2026",
    media: "prop-duplex",
    alt: "Séjour meublé chaleureux avec bois clair, textiles tissés et éclairage du soir",
  },
  {
    id: "studio-cadjehoun",
    homeraId: "HOM-CTN-000477",
    title: "Studio meublé & équipé, proche du centre",
    type: "studio",
    intent: "louer",
    price: 95_000,
    priceLabel: "95 000 FCFA",
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Cadjèhoun",
    bedrooms: 1,
    bathrooms: 1,
    surface: 38,
    verifiedOn: "08/09/2026",
    media: "intent-louer",
    alt: "Intérieur clair et meublé ouvrant sur un balcon planté",
  },
  {
    id: "maison-calavi",
    homeraId: "HOM-CAL-000233",
    title: "Maison familiale avec cour et dépendance",
    type: "villa",
    intent: "acheter",
    price: 42_000_000,
    priceLabel: "42 000 000 FCFA",
    city: "Abomey-Calavi",
    district: "Akassato",
    bedrooms: 3,
    bathrooms: 2,
    surface: 210,
    verifiedOn: "10/09/2026",
    media: "intent-acheter",
    alt: "Villa familiale aux volumes contemporains, jardins plantés et bassin réfléchissant",
  },
  {
    id: "local-ganhi",
    homeraId: "HOM-CTN-000590",
    title: "Local commercial en rez-de-chaussée, forte visibilité",
    type: "local",
    intent: "louer",
    price: 320_000,
    priceLabel: "320 000 FCFA",
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Ganhi",
    bedrooms: 0,
    bathrooms: 1,
    surface: 120,
    verifiedOn: "16/09/2026",
    media: "prop-appartement",
    alt: "Façade d’immeuble contemporain adaptée à un usage professionnel ou commercial",
  },
];

/** Identifiant de filtre : « tous » ou un type de bien précis. */
export type PropertyFilterId = PropertyType | "tous";

/** Filtres rapides de la sélection : synchronisés avec le module de recherche. */
export const PROPERTY_FILTERS: { id: PropertyFilterId; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "villa", label: "Villas" },
  { id: "appartement", label: "Appartements" },
  { id: "studio", label: "Studios" },
  { id: "terrain", label: "Terrains" },
  { id: "local", label: "Locaux" },
];

/* ------------------------------------------------------------------
   LE BIEN HOMERA — anatomie d’un identifiant
   ------------------------------------------------------------------ */

export type DossierField = {
  id: string;
  label: string;
  value: string;
  position: "top-left" | "top-right" | "mid-left" | "mid-right" | "bottom-left" | "bottom-right";
};

export const DOSSIER = {
  reference: "HOM-CTN-000421",
  status: "Vérifié HOMERA",
  fields: [
    {
      id: "propriete",
      label: "Propriété",
      value: "Villa 4 chambres — 280 m²",
      position: "top-left",
    },
    {
      id: "localisation",
      label: "Localisation",
      value: "Fidjrossè Calvaire, Cotonou",
      position: "top-right",
    },
    {
      id: "statut",
      label: "Statut",
      value: "Vérifié — publiable",
      position: "mid-right",
    },
    {
      id: "verification",
      label: "Vérification",
      value: "Pièces & mandat contrôlés",
      position: "mid-left",
    },
    {
      id: "agent",
      label: "Agent autorisé",
      value: "Mandataire habilité — HOM-A-0214",
      position: "bottom-left",
    },
    {
      id: "date",
      label: "Date de vérification",
      value: "12/09/2026",
      position: "bottom-right",
    },
  ] as DossierField[],
  note: "L’identifiant relie le bien à sa fiche : ce qui a été contrôlé, par qui, et à quelle date.",
} as const;

/* ------------------------------------------------------------------
   PROTOCOLE DE VÉRIFICATION — 7 mouvements racontés
   ------------------------------------------------------------------ */

export type VerificationStep = {
  num: string;
  title: string;
  narrative: string;
  detail: string;
  icon: "file" | "lock" | "search" | "user" | "shield" | "check" | "award";
};

export const VERIFICATION_STEPS: VerificationStep[] = [
  {
    num: "01",
    title: "Le bien entre dans HOMERA",
    narrative: "Un propriétaire ou son mandataire dépose le bien et déclare son intention.",
    detail: "Soumission du dossier et premières pièces justificatives.",
    icon: "file",
  },
  {
    num: "02",
    title: "Les informations sont contrôlées",
    narrative: "Le bien reçoit un identifiant unique et une fiche structurée.",
    detail: "Exemple de référence : HOM-CTN-000421.",
    icon: "lock",
  },
  {
    num: "03",
    title: "Les documents sont vérifiés",
    narrative: "Titres, actes et pièces présentées sont examinés un à un.",
    detail: "Analyse des pièces de propriété et de la situation du bien.",
    icon: "search",
  },
  {
    num: "04",
    title: "Les représentants sont identifiés",
    narrative: "L’autorisation explicite de commercialiser est contrôlée.",
    detail: "Vérification de l’identité du mandataire et de l’étendue du mandat.",
    icon: "user",
  },
  {
    num: "05",
    title: "Le bien reçoit son statut",
    narrative: "Les caractéristiques réelles, photos et disponibilité sont confrontées.",
    detail: "Un dossier validé ou renvoyé par l’équipe d’audit HOMERA.",
    icon: "shield",
  },
  {
    num: "06",
    title: "Le client consulte",
    narrative: "La fiche rend lisible ce qui a été vérifié — et ce qui ne l’a pas été.",
    detail: "Aucune promesse juridique : uniquement des éléments contrôlés, datés.",
    icon: "check",
  },
  {
    num: "07",
    title: "Le bien devient publiable",
    narrative: "Le badge d’autorisation est actif et l’historique reste traçable.",
    detail: "Publication officielle sous identifiant HOMERA.",
    icon: "award",
  },
];

/* ------------------------------------------------------------------
   SERVICES — l’écosystème autour du bien
   ------------------------------------------------------------------ */

export type Service = {
  id: string;
  index: string;
  title: string;
  short: string;
  description: string;
  bullets: string[];
  icon: "home" | "wrench" | "truck" | "paint";
  media: string;
  alt: string;
};

export const SERVICES: Service[] = [
  {
    id: "gestion",
    index: "01",
    title: "Gestion immobilière",
    short: "Loyers, états des lieux, relation locataire",
    description:
      "Nous prenons en charge l’opérationnel de votre bien : suivi des loyers, états des lieux, relances et relation avec les occupants.",
    bullets: [
      "Quittances et suivi des encaissements",
      "États des lieux d’entrée et de sortie documentés",
      "Interlocuteur unique pour le propriétaire",
    ],
    icon: "home",
    media: "service-gestion",
    alt: "Bureau clair avec ordinateur, jeu de clés et dossier de bail à proximité d’une fenêtre",
  },
  {
    id: "maintenance",
    index: "02",
    title: "Maintenance & réparation",
    short: "Plomberie, électricité, entretien préventif",
    description:
      "Des interventions rapides par des techniciens identifiés, avec un compte rendu simple à suivre pour le propriétaire.",
    bullets: [
      "Diagnostic et devis avant intervention",
      "Plomberie, électricité et petits travaux",
      "Entretien préventif pour préserver la valeur du bien",
    ],
    icon: "wrench",
    media: "service-maintenance",
    alt: "Technicien vu de dos vérifiant une évacuation dans une salle de bain claire",
  },
  {
    id: "demenagement",
    index: "03",
    title: "Déménagement",
    short: "Transport et manutention sécurisés",
    description:
      "De la préparation du départ à l’installation, vos meubles et effets personnels sont transportés et protégés.",
    bullets: [
      "Emballage et protection du mobilier",
      "Équipe et véhicule adaptés au volume",
      "Installation dans le nouveau logement",
    ],
    icon: "truck",
    media: "service-demenagement",
    alt: "Équipe de déménagement transportant un canapé protégé vers un véhicule",
  },
  {
    id: "travaux",
    index: "04",
    title: "Travaux & aménagement",
    short: "Rénovation, peinture, mise en valeur",
    description:
      "Rénover, aménager ou préparer un logement à la location : des travaux suivis, du devis à la réception.",
    bullets: [
      "Rénovation et remise en état",
      "Peinture et aménagement d’intérieur",
      "Préparation du bien avant mise en location",
    ],
    icon: "paint",
    media: "service-travaux",
    alt: "Chantier de rénovation propre avec mur fraîchement enduit et matériel rangé",
  },
];

/* ------------------------------------------------------------------
   MANIFESTE — convictions & piliers
   ------------------------------------------------------------------ */

export const PILLARS = [
  {
    title: "Aucune démarche d’illusion",
    description:
      "Fini les photos non conformes, les frais de déplacement abusifs et les intermédiaires sans mandat clair.",
    icon: "shield",
  },
  {
    title: "Traçabilité irréfutable",
    description:
      "Chaque bien possède son matricule unique et conserve l’historique de ses vérifications.",
    icon: "user-check",
  },
  {
    title: "Pensé pour la diaspora",
    description:
      "Rechercher, vérifier et suivre un projet au Bénin depuis l’étranger, sans dépendre d’un intermédiaire.",
    icon: "globe",
  },
  {
    title: "Cadre équitable et certifié",
    description:
      "Propriétaires, mandataires autorisés et clients collaborent dans un environnement structuré.",
    icon: "handshake",
  },
] as const;

/* ------------------------------------------------------------------
   MAGAZINE — l’univers éditorial HOMERA
   ------------------------------------------------------------------ */

export type Story = {
  id: string;
  category: "Architecture" | "Quartiers" | "Styles de vie" | "Maisons" | "Appartements" | "Terrains" | "Inspirations";
  title: string;
  excerpt: string;
  readingTime: string;
  media: string;
  alt: string;
};

export const EDITORIAL = {
  title: "Des lieux qui méritent plus qu’une annonce.",
  intro:
    "Architecture, quartiers, manières d’habiter : HOMERA documente le contexte avant de parler de prix.",
  categories: [
    "Architecture",
    "Quartiers",
    "Styles de vie",
    "Maisons",
    "Appartements",
    "Terrains",
    "Inspirations",
  ],
  stories: [
    {
      id: "brise-soleil",
      category: "Architecture",
      title: "Le brise-soleil, geste fondateur de la maison tropicale",
      excerpt:
        "Pourquoi les maisons béninoises contemporaines réinventent l’ombre avant de réinventer la forme.",
      readingTime: "6 min",
      media: "intent-acheter",
      alt: "Façade contemporaine à claustras de bois et murs clairs sous une lumière chaude",
    },
    {
      id: "fidjrosse",
      category: "Quartiers",
      title: "Fidjrossè, côté jardin",
      excerpt:
        "Un quartier qui respire : rues sableuses, bougainvilliers et maisons basses à quelques minutes de la mer.",
      readingTime: "5 min",
      media: "prop-appartement",
      alt: "Immeuble résidentiel clair aux balcons profonds dans un quartier planté",
    },
    {
      id: "terrasse",
      category: "Styles de vie",
      title: "Vivre dehors : la terrasse comme deuxième séjour",
      excerpt:
        "Rattan, ombre et brise du soir : la pièce que l’on gagne en pensant d’abord l’extérieur.",
      readingTime: "4 min",
      media: "intent-sejourner",
      alt: "Cour intérieure avec bassin éclairé et salons en rotin à la tombée du jour",
    },
    {
      id: "villa-basse",
      category: "Maisons",
      title: "La maison basse, une réponse au climat",
      excerpt:
        "Épaisseur des murs, débords de toiture et circulation d’air : la sobriété qui rafraîchit.",
      readingTime: "7 min",
      media: "prop-villa",
      alt: "Maison basse avec grande pergola en bois, pelouse et bassin réfléchissant",
    },
    {
      id: "appartement-lumiere",
      category: "Appartements",
      title: "Appartements : ce que change une vraie orientation",
      excerpt:
        "Deux orientations opposées, deux vies différentes. Comment lire la lumière avant la surface.",
      readingTime: "5 min",
      media: "intent-louer",
      alt: "Séjour lumineux ouvert sur un balcon planté, rideaux clairs et sols en terre cuite",
    },
    {
      id: "parcelle-lisible",
      category: "Terrains",
      title: "Lire une parcelle avant de signer",
      excerpt:
        "Bornage, accès, assainissement : les vérifications simples qui évitent les dossiers sans fin.",
      readingTime: "8 min",
      media: "prop-terrain",
      alt: "Parcelle clôturée avec bornes visibles le long d’une voie de latérite",
    },
    {
      id: "matieres",
      category: "Inspirations",
      title: "Matières du pays : terre, bois, fibres",
      excerpt:
        "Comment une palette locale — crème, terre cuite, brun profond — donne sa chaleur à un intérieur.",
      readingTime: "6 min",
      media: "prop-duplex",
      alt: "Intérieur chaleureux aux tons crème, terre cuite et bois clair en fin de journée",
    },
  ] satisfies Story[],
} as const;

export const FINAL_CTA = {
  title: "Votre prochain bien est peut-être ici.",
  description:
    "Recherchez, comparez et demandez une visite : chaque fiche indique ce qui a été vérifié, par qui, et quand.",
  primary: "Rechercher un bien",
  secondary: "Comprendre la vérification",
  media: "cta-night",
  alt: "Villa éclairée à la nuit tombante, ouverte sur son jardin et son bassin",
} as const;

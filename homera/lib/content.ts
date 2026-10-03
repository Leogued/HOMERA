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
   VISUELS — filet de sécurité
   ------------------------------------------------------------------
   Les 16 visuels sont produits (public/images). Ce tableau reste utile
   pour la suite : si une clé vient à manquer (nouveau sujet éditorial,
   visuel remplacé), le composant pointe vers le visuel HOMERA le plus
   proche au lieu d’afficher un vide. Dès que le fichier dédié existe
   (npm run images), il reprend sa place automatiquement.
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
export type PropertyAvailability = "disponible" | "indisponible";
export type PropertyVerificationStatus = "verifie" | "en-verification";

/** Nature du document foncier présenté dans le dossier du bien. */
export const LAND_TITLE_LABELS = {
  "titre-foncier": "Titre foncier",
  acd: "ACD / convention",
  "en-cours": "En cours d’obtention",
} as const;
export type LandTitle = keyof typeof LAND_TITLE_LABELS;

/** Équipements réellement déclarés sur une fiche : sert aux filtres de l’explorateur. */
export const FEATURE_LABELS = {
  meuble: "Meublé",
  climatisation: "Climatisation",
  "cuisine-equipee": "Cuisine équipée",
  piscine: "Piscine",
  jardin: "Jardin",
  terrasse: "Terrasse",
  parking: "Parking",
  gardien: "Gardiennage",
  groupe: "Groupe électrogène",
  "eau-courante": "Eau courante",
  "titre-foncier": "Titre foncier",
  acd: "ACD / convention",
  cloture: "Terrain clôturé",
  "acces-routier": "Accès routier",
  vitrine: "Vitrine sur rue",
  bureaux: "Aménagé en bureaux",
} as const;
export type PropertyFeature = keyof typeof FEATURE_LABELS;

/** Ordre d’affichage des filtres : le plus discriminant d’abord. */
export const FEATURE_ORDER: PropertyFeature[] = [
  "meuble",
  "climatisation",
  "cuisine-equipee",
  "piscine",
  "jardin",
  "terrasse",
  "parking",
  "gardien",
  "groupe",
  "eau-courante",
  "titre-foncier",
  "acd",
  "cloture",
  "acces-routier",
  "vitrine",
  "bureaux",
];

export type Property = {
  id: string;
  homeraId: string;
  title: string;
  type: PropertyType;
  intent: PropertyIntent;
  /** Montant en FCFA : prix de vente, loyer mensuel ou prix par nuitée selon l’intention. */
  price: number;
  /** État déclaré de disponibilité : absent = disponible dans le catalogue pilote. */
  availabilityStatus?: PropertyAvailability;
  /** État documentaire : seuls les biens contrôlés apparaissent dans le catalogue public. */
  verificationStatus?: PropertyVerificationStatus;
  /** « / mois », « / nuitée »… absent pour une vente. */
  pricePeriod?: string;
  city: string;
  district: string;
  bedrooms: number;
  bathrooms: number;
  /** Surface habitable ou surface du terrain, selon le type de bien. */
  surface: number;
  /** Pièces principales (séjour compris) quand la donnée existe. */
  rooms?: number;
  /** Niveau de l’appartement dans l’immeuble. */
  floor?: string;
  landTitle?: LandTitle;
  /** Séjour : nombre de nuitées minimum. Absent = réservation libre. */
  minNights?: number;
  features?: PropertyFeature[];
  description?: string;
  /** Date de vérification affichée (JJ/MM/AAAA). */
  verifiedOn: string;
  /** Date de mise en ligne : base du tri « plus récents ». */
  publishedAt: string;
  media: string;
  alt: string;
  /** Réservé à la future vue carte — aucune carte n’est dessinée aujourd’hui. */
  coordinates?: { lat: number; lng: number };
};

export const PROPERTIES: Property[] = [
  {
    id: "villa-fidjrosse",
    homeraId: "HOM-CTN-000421",
    title: "Villa 4 chambres & jardin tropical",
    type: "villa",
    intent: "louer",
    price: 450_000,
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Fidjrossè Calvaire",
    bedrooms: 4,
    bathrooms: 3,
    surface: 280,
    rooms: 6,
    features: ["piscine", "jardin", "parking", "gardien", "climatisation"],
    description:
      "Villa de plain-pied dans un quartier résidentiel calme : quatre chambres, séjour ouvert sur le jardin, piscine entretenue et dépendance pour le personnel.",
    verifiedOn: "12/09/2026",
    publishedAt: "2026-09-13",
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
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Haie Vive",
    bedrooms: 2,
    bathrooms: 2,
    surface: 110,
    rooms: 3,
    floor: "2e étage",
    features: ["climatisation", "parking", "cuisine-equipee", "gardien"],
    description:
      "Deux chambres, séjour double prolongé par un balcon profond, cuisine équipée et place de parking dans la cour de l’immeuble.",
    verifiedOn: "05/09/2026",
    publishedAt: "2026-09-06",
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
    city: "Abomey-Calavi",
    district: "Tankpè Carrefour",
    bedrooms: 0,
    bathrooms: 0,
    surface: 500,
    landTitle: "titre-foncier",
    features: ["titre-foncier", "cloture", "acces-routier"],
    description:
      "Parcelle plate et clôturée de 500 m², titrée, dans un lotissement desservi par une voie carrossable. Bornage visible et accès à l’eau en limite.",
    verifiedOn: "14/09/2026",
    publishedAt: "2026-09-15",
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
    pricePeriod: "/ nuitée",
    city: "Cotonou",
    district: "Ganhi",
    bedrooms: 2,
    bathrooms: 2,
    surface: 95,
    minNights: 2,
    features: ["meuble", "climatisation", "cuisine-equipee", "terrasse"],
    description:
      "Duplex meublé réservé aux séjours courts : deux chambres climatisées, séjour ouvert et petite terrasse, à cinq minutes du centre des affaires.",
    verifiedOn: "18/09/2026",
    publishedAt: "2026-09-19",
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
    availabilityStatus: "indisponible",
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Cadjèhoun",
    bedrooms: 1,
    bathrooms: 1,
    surface: 38,
    features: ["meuble", "climatisation", "eau-courante"],
    description:
      "Studio meublé et équipé, proche du centre : lit double, kitchenette, douche privative et compteur électrique individuel.",
    verifiedOn: "08/09/2026",
    publishedAt: "2026-09-09",
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
    city: "Abomey-Calavi",
    district: "Akassato",
    bedrooms: 3,
    bathrooms: 2,
    surface: 210,
    rooms: 5,
    landTitle: "titre-foncier",
    features: ["jardin", "parking", "climatisation", "titre-foncier"],
    description:
      "Maison familiale sur parcelle titrée : trois chambres, séjour double, cour arborée et dépendance d’une pièce pour un proche ou un bureau.",
    verifiedOn: "10/09/2026",
    publishedAt: "2026-09-11",
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
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Ganhi",
    bedrooms: 0,
    bathrooms: 1,
    surface: 120,
    features: ["vitrine", "climatisation", "acces-routier"],
    description:
      "Local en rez-de-chaussée sur un axe très fréquenté : vitrine de huit mètres, réserve, sanitaires et climatisation déjà installée.",
    verifiedOn: "16/09/2026",
    publishedAt: "2026-09-17",
    media: "prop-appartement",
    alt: "Façade d’immeuble contemporain adaptée à un usage professionnel ou commercial",
  },

  /* --- Acheter ------------------------------------------------- */
  {
    id: "villa-cocotiers-fidjrosse",
    homeraId: "HOM-CTN-000634",
    title: "Villa 5 chambres avec piscine et jardin",
    type: "villa",
    intent: "acheter",
    price: 145_000_000,
    city: "Cotonou",
    district: "Fidjrossè Plage",
    bedrooms: 5,
    bathrooms: 4,
    surface: 420,
    rooms: 7,
    landTitle: "titre-foncier",
    features: ["piscine", "jardin", "parking", "gardien", "titre-foncier"],
    description:
      "Villa de plain-pied articulée autour de son patio : cinq chambres, un séjour ouvert sur la piscine et un jardin planté de cocotiers, à quatre minutes de la plage.",
    verifiedOn: "22/09/2026",
    publishedAt: "2026-09-23",
    media: "prop-villa-piscine",
    alt: "Villa contemporaine avec piscine à débordement, pergola en bois et jardin tropical au coucher du soleil",
  },
  {
    id: "villa-duplex-tankpe",
    homeraId: "HOM-CAL-000301",
    title: "Villa duplex 4 chambres sur 750 m²",
    type: "villa",
    intent: "acheter",
    price: 78_000_000,
    city: "Abomey-Calavi",
    district: "Tankpè",
    bedrooms: 4,
    bathrooms: 3,
    surface: 310,
    rooms: 6,
    landTitle: "titre-foncier",
    features: ["jardin", "parking", "climatisation", "eau-courante", "titre-foncier"],
    description:
      "Duplex récent sur une parcelle titrée de 750 m² : quatre chambres dont une suite, double séjour, cour engazonnée et place pour deux véhicules.",
    verifiedOn: "18/09/2026",
    publishedAt: "2026-09-19",
    media: "prop-villa",
    alt: "Maison basse avec grande pergola en bois, pelouse et bassin réfléchissant",
  },
  {
    id: "maison-plage-ouidah",
    homeraId: "HOM-OUH-000044",
    title: "Maison basse 3 chambres à six minutes de la plage",
    type: "villa",
    intent: "acheter",
    price: 34_500_000,
    city: "Ouidah",
    district: "Ouidah Centre",
    bedrooms: 3,
    bathrooms: 2,
    surface: 180,
    rooms: 5,
    landTitle: "acd",
    features: ["jardin", "terrasse", "acces-routier", "acd"],
    description:
      "Construction sobre et fraîche, couverte par une toiture à grands débords : trois chambres, véranda ombragée, jardin et puits. Dossier foncier en règle (ACD).",
    verifiedOn: "11/09/2026",
    publishedAt: "2026-09-12",
    media: "prop-villa-cour",
    alt: "Maison familiale avec cour intérieure, véranda couverte et arbre mature donnant de l’ombre",
  },
  {
    id: "appartement-f4-haie-vive",
    homeraId: "HOM-CTN-000658",
    title: "Appartement F4 avec balcon et suite parentale",
    type: "appartement",
    intent: "acheter",
    price: 62_000_000,
    city: "Cotonou",
    district: "Haie Vive",
    bedrooms: 3,
    bathrooms: 2,
    surface: 128,
    rooms: 4,
    floor: "3e étage",
    features: ["climatisation", "parking", "gardien", "terrasse"],
    description:
      "Au troisième étage d’un immeuble entretenu : séjour double prolongé par un balcon profond, trois chambres dont une suite, deux places de parking en sous-sol.",
    verifiedOn: "20/09/2026",
    publishedAt: "2026-09-21",
    media: "prop-appartement",
    alt: "Immeuble d’appartements contemporain à balcons profonds et pare-soleil en bois",
  },
  {
    id: "appartement-f3-akpakpa",
    homeraId: "HOM-CTN-000671",
    title: "Appartement F3 dans un immeuble récent",
    type: "appartement",
    intent: "acheter",
    price: 38_000_000,
    city: "Cotonou",
    district: "Akpakpa",
    bedrooms: 2,
    bathrooms: 2,
    surface: 92,
    rooms: 3,
    floor: "1er étage",
    features: ["climatisation", "gardien", "parking"],
    description:
      "Immeuble livré en 2024, parties communes propres et gardiennage assuré. Séjour lumineux ouvert sur une cuisine américaine, deux chambres climatisées.",
    verifiedOn: "07/09/2026",
    publishedAt: "2026-09-08",
    media: "prop-appartement-sejour",
    alt: "Séjour clair d’appartement avec canapé en tissu naturel et baie vitrée ouvrant sur un balcon planté",
  },
  {
    id: "duplex-terrasse-calavi",
    homeraId: "HOM-CAL-000318",
    title: "Duplex neuf 3 chambres avec toit-terrasse",
    type: "appartement",
    intent: "acheter",
    price: 55_000_000,
    city: "Abomey-Calavi",
    district: "Akassato",
    bedrooms: 3,
    bathrooms: 3,
    surface: 165,
    rooms: 4,
    features: ["terrasse", "cuisine-equipee", "parking", "climatisation"],
    description:
      "Duplex traversant livré cette année : séjour en double hauteur, cuisine équipée, trois chambres et toit-terrasse aménageable avec vue dégagée.",
    verifiedOn: "15/09/2026",
    publishedAt: "2026-09-16",
    media: "prop-duplex-terrasse",
    alt: "Terrasse en toiture aménagée au crépuscule, assises en rotin et vue sur les toits de la ville",
  },
  {
    id: "parcelle-godomey",
    homeraId: "HOM-CAL-000327",
    title: "Parcelle de 600 m² avec ACD, prête à bâtir",
    type: "terrain",
    intent: "acheter",
    price: 12_500_000,
    city: "Abomey-Calavi",
    district: "Godomey",
    bedrooms: 0,
    bathrooms: 0,
    surface: 600,
    landTitle: "acd",
    features: ["acd", "cloture", "acces-routier", "eau-courante"],
    description:
      "Parcelle clôturée dans un lotissement viabilisé, accès direct par une voie carrossable, eau et électricité en limite de propriété.",
    verifiedOn: "24/09/2026",
    publishedAt: "2026-09-25",
    media: "prop-terrain-borne",
    alt: "Parcelle bornée et clôturée le long d’une voie de latérite nivelée",
  },
  {
    id: "terrain-titre-ouidah",
    homeraId: "HOM-OUH-000051",
    title: "Terrain de 1 000 m² titré, quartier calme",
    type: "terrain",
    intent: "acheter",
    price: 26_000_000,
    city: "Ouidah",
    district: "Ouidah Centre",
    bedrooms: 0,
    bathrooms: 0,
    surface: 1_000,
    landTitle: "titre-foncier",
    features: ["titre-foncier", "cloture", "acces-routier"],
    description:
      "Mille mètres carrés titrés, plats et clôturés, à dix minutes du centre historique. Convient à un projet résidentiel ou à une résidence locative.",
    verifiedOn: "09/09/2026",
    publishedAt: "2026-09-10",
    media: "prop-terrain",
    alt: "Parcelle clôturée bordée de cocotiers le long d’une voie en latérite",
  },
  {
    id: "parcelles-porto-novo",
    homeraId: "HOM-PNV-000062",
    title: "Deux parcelles contiguës de 400 m²",
    type: "terrain",
    intent: "acheter",
    price: 15_000_000,
    city: "Porto-Novo",
    district: "Ouando",
    bedrooms: 0,
    bathrooms: 0,
    surface: 800,
    landTitle: "acd",
    features: ["acd", "acces-routier", "eau-courante"],
    description:
      "Ensemble de deux parcelles mitoyennes, vendues ensemble ou séparément : idéal pour un programme de deux maisons ou un petit immeuble locatif.",
    verifiedOn: "05/09/2026",
    publishedAt: "2026-09-06",
    media: "prop-terrain-borne",
    alt: "Deux parcelles contiguës délimitées par des bornes, herbe rase et poteaux électriques au loin",
  },
  {
    id: "immeuble-bureaux-ganhi",
    homeraId: "HOM-CTN-000690",
    title: "Immeuble de bureaux, trois niveaux loués",
    type: "local",
    intent: "acheter",
    price: 185_000_000,
    city: "Cotonou",
    district: "Ganhi",
    bedrooms: 0,
    bathrooms: 4,
    surface: 540,
    features: ["bureaux", "parking", "gardien", "groupe", "titre-foncier"],
    description:
      "Immeuble de bureaux occupé par deux locataires en place : 540 m² utiles sur trois niveaux, parking clos, groupe électrogène et gardiennage.",
    verifiedOn: "19/09/2026",
    publishedAt: "2026-09-20",
    media: "prop-immeuble-bureaux",
    alt: "Immeuble de bureaux contemporain en béton clair avec brise-soleil en bois et hall d’entrée vitré",
  },
  {
    id: "local-vitrine-akpakpa",
    homeraId: "HOM-CTN-000703",
    title: "Local commercial de 85 m² avec vitrine sur rue",
    type: "local",
    intent: "acheter",
    price: 48_000_000,
    city: "Cotonou",
    district: "Akpakpa",
    bedrooms: 0,
    bathrooms: 1,
    surface: 85,
    features: ["vitrine", "climatisation", "parking"],
    description:
      "Rez-de-chaussée commercial sur un axe passant : vitrine de six mètres, réserve à l’arrière, sanitaires et climatisation déjà en place.",
    verifiedOn: "13/09/2026",
    publishedAt: "2026-09-14",
    media: "prop-local-commerce",
    alt: "Local commercial en rez-de-chaussée avec grande vitrine vitrée et soubassement en terre cuite",
  },

  /* --- Louer ---------------------------------------------------- */
  {
    id: "villa-piscine-fidjrosse",
    homeraId: "HOM-CTN-000712",
    title: "Villa 5 chambres avec piscine, gardiennage 24 h",
    type: "villa",
    intent: "louer",
    price: 850_000,
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Fidjrossè",
    bedrooms: 5,
    bathrooms: 4,
    surface: 420,
    rooms: 7,
    features: ["piscine", "jardin", "gardien", "climatisation", "parking"],
    description:
      "Location longue durée d’une villa meublée ou vide, au choix : piscine entretenue par le bailleur, gardiennage 24 h et jardinier deux fois par mois.",
    verifiedOn: "21/09/2026",
    publishedAt: "2026-09-22",
    media: "prop-villa-piscine",
    alt: "Villa avec piscine et pergola en bois, jardin tropical arrosé, lumière de fin de journée",
  },
  {
    id: "maison-cour-akassato",
    homeraId: "HOM-CAL-000342",
    title: "Maison 3 chambres avec cour et dépendance",
    type: "villa",
    intent: "louer",
    price: 180_000,
    pricePeriod: "/ mois",
    city: "Abomey-Calavi",
    district: "Akassato",
    bedrooms: 3,
    bathrooms: 2,
    surface: 190,
    rooms: 5,
    features: ["jardin", "parking", "eau-courante"],
    description:
      "Maison basse dans une cour close, avec une chambre indépendante pour un proche ou un jeune actif. Compteur d’eau individuel.",
    verifiedOn: "12/09/2026",
    publishedAt: "2026-09-13",
    media: "prop-villa-cour",
    alt: "Maison familiale avec cour cimentée, dépendance et arbre mature",
  },
  {
    id: "appartement-f4-cadjehoun",
    homeraId: "HOM-CTN-000725",
    title: "Appartement F4 avec grande terrasse",
    type: "appartement",
    intent: "louer",
    price: 340_000,
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Cadjèhoun",
    bedrooms: 3,
    bathrooms: 2,
    surface: 135,
    rooms: 4,
    floor: "2e étage",
    features: ["terrasse", "climatisation", "parking", "cuisine-equipee"],
    description:
      "Trois chambres, séjour double et terrasse de 25 m² orientée à l’ouest : la pièce supplémentaire que l’on gagne en fin de journée.",
    verifiedOn: "17/09/2026",
    publishedAt: "2026-09-18",
    media: "prop-appartement-sejour",
    alt: "Séjour d’appartement ouvert sur une terrasse plantée, rideaux clairs et sols en carrelage clair",
  },
  {
    id: "appartement-f2-zogbo",
    homeraId: "HOM-CTN-000738",
    title: "Appartement F2 rénové, quartier Zogbo",
    type: "appartement",
    intent: "louer",
    price: 150_000,
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Zogbo",
    bedrooms: 2,
    bathrooms: 1,
    surface: 68,
    rooms: 2,
    floor: "1er étage",
    features: ["climatisation", "eau-courante", "parking"],
    description:
      "Deux chambres, séjour et cuisine séparée, entièrement repeint cette année. Quartier résidentiel calme, à dix minutes de l’aéroport.",
    verifiedOn: "03/09/2026",
    publishedAt: "2026-09-04",
    media: "prop-appartement",
    alt: "Immeuble résidentiel sobre avec balcons en béton et volets en bois",
  },
  {
    id: "studio-meuble-ganhi",
    homeraId: "HOM-CTN-000741",
    title: "Studio meublé et climatisé, centre-ville",
    type: "studio",
    intent: "louer",
    price: 145_000,
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Ganhi",
    bedrooms: 1,
    bathrooms: 1,
    surface: 34,
    features: ["meuble", "climatisation", "cuisine-equipee", "eau-courante"],
    description:
      "Studio livré meublé, prêt à habiter : lit double, kitchenette équipée, climatisation révisée et ménage des parties communes.",
    verifiedOn: "25/09/2026",
    publishedAt: "2026-09-26",
    media: "prop-studio-meuble",
    alt: "Studio meublé compact avec lit deux places, kitchenette linéaire et lumière douce d’après-midi",
  },
  {
    id: "studio-akpakpa",
    homeraId: "HOM-CTN-000754",
    title: "Studio vide au calme, proche du marché",
    type: "studio",
    intent: "louer",
    price: 65_000,
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Akpakpa",
    bedrooms: 1,
    bathrooms: 1,
    surface: 28,
    features: ["eau-courante", "acces-routier"],
    description:
      "Studio carrelé avec douche privative et coin cuisine, dans une maison basse à cinq minutes à pied du marché. Compteur individuel.",
    verifiedOn: "28/08/2026",
    publishedAt: "2026-08-29",
    media: "intent-louer",
    alt: "Intérieur clair et sobre ouvrant sur un balcon planté",
  },
  {
    id: "bureaux-haie-vive",
    homeraId: "HOM-CTN-000767",
    title: "Plateau de bureaux de 140 m², prêt à occuper",
    type: "local",
    intent: "louer",
    price: 550_000,
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Haie Vive",
    bedrooms: 0,
    bathrooms: 2,
    surface: 140,
    features: ["bureaux", "climatisation", "parking", "groupe", "gardien"],
    description:
      "Plateau cloisonné en quatre bureaux et une salle de réunion, câblage réseau en place, climatisation et groupe électrogène partagés.",
    verifiedOn: "16/09/2026",
    publishedAt: "2026-09-17",
    media: "prop-immeuble-bureaux",
    alt: "Façade vitrée d’un petit immeuble de bureaux, brise-soleil verticaux et massif planté",
  },
  {
    id: "boutique-dantokpa",
    homeraId: "HOM-CTN-000770",
    title: "Boutique de 25 m² à deux pas du marché",
    type: "local",
    intent: "louer",
    price: 190_000,
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Akpakpa",
    bedrooms: 0,
    bathrooms: 1,
    surface: 25,
    features: ["vitrine", "acces-routier"],
    description:
      "Local en angle avec rideau métallique et compteur électrique individuel : forte fréquentation, livraison possible devant la porte.",
    verifiedOn: "10/09/2026",
    publishedAt: "2026-09-11",
    media: "prop-local-commerce",
    alt: "Rez-de-chaussée commercial avec vitrine sur un axe passant, rideau métallique relevé",
  },
  {
    id: "maison-porto-novo",
    homeraId: "HOM-PNV-000071",
    title: "Maison 4 chambres avec dépendance et cour",
    type: "villa",
    intent: "louer",
    price: 220_000,
    pricePeriod: "/ mois",
    city: "Porto-Novo",
    district: "Djègan-Kpèvi",
    bedrooms: 4,
    bathrooms: 2,
    surface: 230,
    rooms: 6,
    features: ["jardin", "parking", "eau-courante"],
    description:
      "Maison familiale dans une cour arborée, avec une dépendance d’une pièce et un puits en plus du réseau. Quartier desservi et calme.",
    verifiedOn: "06/09/2026",
    publishedAt: "2026-09-07",
    media: "prop-villa",
    alt: "Maison familiale aux volumes contemporains avec jardin planté et ombre portée",
  },
  {
    id: "appartement-f3-ouidah",
    homeraId: "HOM-OUH-000066",
    title: "Appartement F3 neuf, proche du centre",
    type: "appartement",
    intent: "louer",
    price: 130_000,
    pricePeriod: "/ mois",
    city: "Ouidah",
    district: "Ouidah Centre",
    bedrooms: 2,
    bathrooms: 2,
    surface: 88,
    rooms: 3,
    floor: "Rez-de-chaussée surélevé",
    features: ["climatisation", "parking", "cuisine-equipee"],
    description:
      "Deux chambres avec placards, séjour ouvert sur une cuisine équipée, place de parking dans la cour. Immeuble livré en 2025.",
    verifiedOn: "02/09/2026",
    publishedAt: "2026-09-03",
    media: "prop-appartement-sejour",
    alt: "Séjour d’appartement meublé avec cuisine ouverte et grande fenêtre lumineuse",
  },

  /* --- Séjour --------------------------------------------------- */
  {
    id: "villa-piscine-fidjrosse-sejour",
    homeraId: "HOM-CTN-000783",
    title: "Villa 4 chambres avec piscine, bord de mer",
    type: "villa",
    intent: "sejour",
    price: 185_000,
    pricePeriod: "/ nuitée",
    city: "Cotonou",
    district: "Fidjrossè Plage",
    bedrooms: 4,
    bathrooms: 4,
    surface: 380,
    minNights: 3,
    features: ["meuble", "piscine", "climatisation", "cuisine-equipee", "gardien"],
    description:
      "Villa entièrement meublée à louer à la nuitée : quatre chambres climatisées, piscine privée, cuisine équipée et ménage inclus en fin de séjour.",
    verifiedOn: "26/09/2026",
    publishedAt: "2026-09-27",
    media: "prop-villa-piscine",
    alt: "Villa meublée avec piscine privée et transats, jardin tropical, lumière du soir",
  },
  {
    id: "appartement-meuble-haie-vive",
    homeraId: "HOM-CTN-000796",
    title: "Appartement meublé 2 chambres, Haie Vive",
    type: "appartement",
    intent: "sejour",
    price: 65_000,
    pricePeriod: "/ nuitée",
    city: "Cotonou",
    district: "Haie Vive",
    bedrooms: 2,
    bathrooms: 2,
    surface: 110,
    minNights: 2,
    features: ["meuble", "climatisation", "cuisine-equipee", "parking"],
    description:
      "Appartement meublé avec linge de maison, wi-fi fibré et cuisine équipée, à dix minutes du centre des affaires. Arrivée autonome possible.",
    verifiedOn: "23/09/2026",
    publishedAt: "2026-09-24",
    media: "prop-appartement-sejour",
    alt: "Séjour meublé lumineux avec canapé, table basse en bois et baie vitrée",
  },
  {
    id: "studio-meuble-cadjehoun",
    homeraId: "HOM-CTN-000809",
    title: "Studio meublé, arrivée autonome",
    type: "studio",
    intent: "sejour",
    price: 32_000,
    pricePeriod: "/ nuitée",
    city: "Cotonou",
    district: "Cadjèhoun",
    bedrooms: 1,
    bathrooms: 1,
    surface: 32,
    minNights: 1,
    features: ["meuble", "climatisation", "cuisine-equipee"],
    description:
      "Studio compact et bien équipé, réservable à la nuitée : lit double, kitchenette, douche à l’italienne et boîte à clés pour une arrivée tardive.",
    verifiedOn: "27/09/2026",
    publishedAt: "2026-09-28",
    media: "prop-studio-meuble",
    alt: "Studio meublé composé, lit deux places, coin bureau et kitchenette",
  },
  {
    id: "duplex-terrasse-ganhi",
    homeraId: "HOM-CTN-000812",
    title: "Duplex meublé avec toit-terrasse",
    type: "appartement",
    intent: "sejour",
    price: 78_000,
    pricePeriod: "/ nuitée",
    city: "Cotonou",
    district: "Ganhi",
    bedrooms: 2,
    bathrooms: 2,
    surface: 105,
    minNights: 2,
    features: ["meuble", "terrasse", "climatisation", "cuisine-equipee"],
    description:
      "Duplex meublé en centre-ville, avec toit-terrasse aménagé pour les soirées. Deux chambres, deux salles d’eau et un séjour ouvert.",
    verifiedOn: "20/09/2026",
    publishedAt: "2026-09-21",
    media: "prop-duplex-terrasse",
    alt: "Toit-terrasse meublé au crépuscule avec assises en rotin et guirlandes lumineuses",
  },
  {
    id: "maison-jardin-ouidah",
    homeraId: "HOM-OUH-000075",
    title: "Maison basse avec jardin, à 400 m de la plage",
    type: "villa",
    intent: "sejour",
    price: 95_000,
    pricePeriod: "/ nuitée",
    city: "Ouidah",
    district: "Ouidah Centre",
    bedrooms: 3,
    bathrooms: 2,
    surface: 160,
    minNights: 3,
    features: ["meuble", "jardin", "climatisation", "cuisine-equipee"],
    description:
      "Maison de vacances à trois chambres, véranda ombragée et jardin clos : quatre minutes à pied de la plage, adaptée à un séjour en famille.",
    verifiedOn: "14/09/2026",
    publishedAt: "2026-09-15",
    media: "prop-villa-cour",
    alt: "Maison basse avec véranda ombragée, jardin clos et mobilier de jardin en bois",
  },
  {
    id: "appartement-calavi-sejour",
    homeraId: "HOM-CAL-000355",
    title: "Appartement 3 chambres, séjour familial",
    type: "appartement",
    intent: "sejour",
    price: 42_000,
    pricePeriod: "/ nuitée",
    city: "Abomey-Calavi",
    district: "Tankpè",
    bedrooms: 3,
    bathrooms: 2,
    surface: 120,
    minNights: 3,
    features: ["meuble", "climatisation", "cuisine-equipee", "parking"],
    description:
      "Trois chambres meublées, cuisine équipée et parking clos : pensé pour les familles reçues à Abomey-Calavi, à vingt minutes de Cotonou.",
    verifiedOn: "08/09/2026",
    publishedAt: "2026-09-09",
    media: "prop-appartement",
    alt: "Immeuble résidentiel avec balcons, volets en bois et cour plantée",
  },
  {
    id: "loft-porto-novo",
    homeraId: "HOM-PNV-000084",
    title: "Loft meublé au cœur du vieux Porto-Novo",
    type: "appartement",
    intent: "sejour",
    price: 38_000,
    pricePeriod: "/ nuitée",
    city: "Porto-Novo",
    district: "Ouando",
    bedrooms: 1,
    bathrooms: 1,
    surface: 60,
    minNights: 2,
    features: ["meuble", "climatisation", "cuisine-equipee"],
    description:
      "Loft rénové dans une maison ancienne : volumes hauts, boiseries d’origine et cuisine ouverte, à quelques rues du musée et du marché.",
    verifiedOn: "30/08/2026",
    publishedAt: "2026-08-31",
    media: "prop-duplex",
    alt: "Intérieur chaleureux aux tons crème, terre cuite et bois clair en fin de journée",
  },
  {
    id: "maison-bord-mer-ouidah",
    homeraId: "HOM-OUH-000081",
    title: "Maison 3 chambres à quelques pas de l’océan",
    type: "villa",
    intent: "sejour",
    price: 120_000,
    pricePeriod: "/ nuitée",
    city: "Ouidah",
    district: "Ouidah Plage",
    bedrooms: 3,
    bathrooms: 2,
    surface: 175,
    minNights: 4,
    features: ["meuble", "jardin", "climatisation", "cuisine-equipee", "gardien"],
    description:
      "Maison de bord de mer pour les séjours d’une semaine et plus : trois chambres, grande terrasse face à l’océan et gardien sur place.",
    verifiedOn: "19/09/2026",
    publishedAt: "2026-09-20",
    media: "prop-villa",
    alt: "Maison de bord de mer avec grande terrasse, jardin planté et lumière rasante",
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
      id: "proprietaire",
      label: "Propriétaire",
      value: "Identifié dans le dossier",
      position: "top-left",
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
      media: "editorial-architecture",
      alt: "Détail d’architecture : angle de mur crème, claustra de bois sombre et ombre portée franche",
    },
    {
      id: "fidjrosse",
      category: "Quartiers",
      title: "Fidjrossè, côté jardin",
      excerpt:
        "Un quartier qui respire : rues sableuses, bougainvilliers et maisons basses à quelques minutes de la mer.",
      readingTime: "5 min",
      media: "editorial-quartier",
      alt: "Rue sableuse bordée de maisons basses crème et terre cuite, bougainvillier et cocotiers au coucher du soleil",
    },
    {
      id: "terrasse",
      category: "Styles de vie",
      title: "Vivre dehors : la terrasse comme deuxième séjour",
      excerpt:
        "Rattan, ombre et brise du soir : la pièce que l’on gagne en pensant d’abord l’extérieur.",
      readingTime: "4 min",
      media: "editorial-lifestyle",
      alt: "Terrasse en toiture au coucher du soleil, assises en rotin, tapis tissés et lumière chaude",
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
  primary: "Explorer HOMERA",
  secondary: "Comprendre la vérification",
  media: "cta-night",
  alt: "Villa éclairée à la nuit tombante, ouverte sur son jardin et son bassin",
} as const;

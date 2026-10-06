import { SERVICES, type PropertyIntent, type PropertyType } from "@/lib/content";
import { EMPTY_QUERY, type CatalogQuery } from "@/lib/properties";

/* ==================================================================
   HOMERA — NAVIGATION PUBLIQUE & PAGES DE PROJET
   ------------------------------------------------------------------
   Une seule source pour : le menu du site, le pied de page, les pages
   de projet (Acheter, Louer, Séjour) et leurs catégories.

   Toute la partie publique est ici — un visiteur sans compte peut
   parcourir l’ensemble de ces adresses. L’espace client (/client) est
   séparé du menu public et s’ouvre depuis la commande du compte.
   ================================================================== */

/** Accepte uniquement une adresse interne pour éviter les redirections externes après connexion. */
export function safeReturnTo(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /[\u0000-\u001f]/.test(candidate)) return null;
  try {
    const destination = new URL(candidate, "https://homera.invalid");
    if (destination.origin !== "https://homera.invalid") return null;
    if (destination.pathname === "/connexion" || destination.pathname === "/verification-email") return null;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

export type PublicProject = "acheter" | "louer" | "sejour";

export type PublicCategory = {
  /** Segment d’URL : /acheter/maisons */
  slug: string;
  label: string;
  /** Titre de la page catégorie. */
  title: string;
  intro: string;
  /** Filtres appliqués par la page — la recherche reste modifiable ensuite. */
  filter: { intent: PropertyIntent; types?: PropertyType[]; stayNights?: number };
  /** Requête à composer pour l’explorateur (une phrase, pas un jargon). */
  hint: string;
};

export type PublicProjectPage = {
  slug: PublicProject;
  /** Libellé court de menu. */
  navLabel: string;
  eyebrow: string;
  title: string;
  intro: string;
  /** Ce que le visiteur trouve sur cette page. */
  points: string[];
  categories: PublicCategory[];
};

export const PROJECT_PAGES: PublicProjectPage[] = [
  {
    slug: "acheter",
    navLabel: "Acheter",
    eyebrow: "Devenir propriétaire",
    title: "Acheter un bien au Bénin",
    intro:
      "Terrains titrés, maisons de famille, appartements et locaux : chaque fiche indique ce qui a été contrôlé sur le bien, par qui et à quelle date — avant toute mise en relation.",
    points: [
      "Documents de propriété et mandat examinés avant publication",
      "Prix, surface et statut foncier affichés sans détour",
      "Visite organisée avec un mandataire identifié",
    ],
    categories: [
      {
        slug: "maisons",
        label: "Maisons & villas",
        title: "Maisons et villas à vendre",
        intro:
          "Maisons basses, villas familiales, propriétés avec jardin ou piscine : l’habitat individuel disponible à la vente.",
        filter: { intent: "acheter", types: ["villa"] },
        hint: "Achat · Habitat individuel",
      },
      {
        slug: "appartements",
        label: "Appartements",
        title: "Appartements à vendre",
        intro:
          "F2, F3, F4 et duplex : des logements collectifs, souvent plus faciles à entretenir et à louer ensuite.",
        filter: { intent: "acheter", types: ["appartement"] },
        hint: "Achat · Logement collectif",
      },
      {
        slug: "terrains",
        label: "Terrains & parcelles",
        title: "Terrains et parcelles à vendre",
        intro:
          "Parcelles titrées ou sous ACD, viabilisées, clôturées ou prêtes à bâtir dans les communes desservies.",
        filter: { intent: "acheter", types: ["terrain"] },
        hint: "Achat · Foncier",
      },
      {
        slug: "locaux",
        label: "Locaux commerciaux",
        title: "Locaux commerciaux à acheter",
        intro:
          "Boutiques, plateaux de bureaux et immeubles de rapport : investir dans un bien qui produit déjà un revenu.",
        filter: { intent: "acheter", types: ["local"] },
        hint: "Achat · Professionnel",
      },
    ],
  },
  {
    slug: "louer",
    navLabel: "Louer",
    eyebrow: "Se loger au quotidien",
    title: "Louer un logement au Bénin",
    intro:
      "Maisons, appartements, studios et locaux : des fiches complètes, des loyers affichés et un parcours de visite structuré, sans frais de déplacement abusifs.",
    points: [
      "Loyer, charges et surface affichés dès la fiche",
      "Visite sur créneau planifié avec un mandataire identifié",
      "Parcours structuré : demande, contrat, remise des clés",
    ],
    categories: [
      {
        slug: "maisons",
        label: "Maisons",
        title: "Maisons à louer",
        intro:
          "Maisons basses, villas et maisons familiales avec cour : pour un foyer qui veut de l’espace et un extérieur.",
        filter: { intent: "louer", types: ["villa"] },
        hint: "Location · Habitat individuel",
      },
      {
        slug: "appartements",
        label: "Appartements",
        title: "Appartements à louer",
        intro:
          "F2, F3, F4 avec balcon ou terrasse, dans des immeubles entretenus et desservis.",
        filter: { intent: "louer", types: ["appartement"] },
        hint: "Location · Logement collectif",
      },
      {
        slug: "studios",
        label: "Studios",
        title: "Studios à louer",
        intro:
          "Studios meublés ou vides, adaptés à une personne ou à une jeune famille : l’essentiel, sans pièce inutile.",
        filter: { intent: "louer", types: ["studio"] },
        hint: "Location · Format compact",
      },
      {
        slug: "locaux",
        label: "Locaux commerciaux",
        title: "Locaux commerciaux à louer",
        intro:
          "Boutiques sur rue et plateaux de bureaux : s’installer vite à une adresse qui fonctionne.",
        filter: { intent: "louer", types: ["local"] },
        hint: "Location · Professionnel",
      },
    ],
  },
  {
    slug: "sejour",
    navLabel: "Séjour",
    eyebrow: "Nuitée, quelques jours, courte période",
    title: "Séjourner au Bénin",
    intro:
      "Déplacement professionnel, visite familiale ou retour au pays : des logements meublés, équipés et tenus à jour, réservables pour une nuit, quelques jours ou plusieurs semaines.",
    points: [
      "Durée minimale affichée clairement sur chaque fiche",
      "Logements meublés et équipés, standards contrôlés",
      "Disponibilités tenues à jour, accueil organisé",
    ],
    categories: [
      {
        slug: "nuitee",
        label: "À la nuitée",
        title: "Séjours à la nuitée",
        intro:
          "Pour une arrivée tardive ou une escale : des logements réservables dès une nuit, arrivée autonome possible.",
        filter: { intent: "sejour", stayNights: 1 },
        hint: "Séjour · Dès 1 nuit",
      },
      {
        slug: "quelques-jours",
        label: "Quelques jours",
        title: "Séjours de quelques jours",
        intro:
          "Trois, quatre jours ou une semaine : la bonne mesure pour un déplacement professionnel ou une visite de famille.",
        filter: { intent: "sejour", stayNights: 4 },
        hint: "Séjour · 2 à 4 nuits",
      },
      {
        slug: "courte-periode",
        label: "Courte période",
        title: "Séjours en courte période",
        intro:
          "D’une à plusieurs semaines, pour une mission, un déménagement en cours ou un retour au pays prolongé.",
        filter: { intent: "sejour", stayNights: 14 },
        hint: "Séjour · Semaines",
      },
    ],
  },
];

/** Traduit le filtre déclaré par une catégorie en requête d’explorateur. */
export function categoryQuery(filter: PublicCategory["filter"]): CatalogQuery {
  return {
    ...EMPTY_QUERY,
    intent: filter.intent,
    types: filter.types ?? [],
    stayNights: filter.stayNights ?? null,
  };
}

/** Requête d’une page de projet : tous les biens du projet, sans autre filtre. */
export function projectQuery(project: PublicProject): CatalogQuery {
  return { ...EMPTY_QUERY, intent: project };
}

export function findProject(slug: string): PublicProjectPage | undefined {
  return PROJECT_PAGES.find((project) => project.slug === slug);
}

export function findCategory(project: string, slug: string): { page: PublicProjectPage; category: PublicCategory } | undefined {
  const page = findProject(project);
  const category = page?.categories.find((entry) => entry.slug === slug);
  return page && category ? { page, category } : undefined;
}

/* ------------------------------------------------------------------
   MENU PRINCIPAL PUBLIC
   ------------------------------------------------------------------ */

export type NavChild = { label: string; href: string; hint?: string };
export type NavEntry = { title: string; href: string; children?: NavChild[] };

/** Navigation principale — six entrées, dans cet ordre.
    Les liens de service (À propos, Contact, accès personnel) vivent dans
    le pied de page : la barre reste lisible, et le menu ne double pas. */
export const PUBLIC_NAV: NavEntry[] = [
  { title: "Explorer", href: "/explorer" },
  ...PROJECT_PAGES.map((project) => ({
    title: project.navLabel,
    href: `/${project.slug}`,
    children: project.categories.map((category) => ({
      label: category.label,
      href: `/${project.slug}/${category.slug}`,
      hint: category.hint,
    })),
  })),
  {
    title: "Services",
    href: "/services",
    children: SERVICES.map((service) => ({
      label: service.title,
      href: `/services/${service.id === "gestion" ? "gestion-immobiliere" : service.id}`,
      hint: service.short,
    })),
  },
  { title: "Favoris", href: "/favoris" },
];

/** Identifiant stable pour les panneaux de navigation (aria-controls).
    Les accents sont retirés, pas convertis en tirets : « Séjour » → « sejour ». */
export function navPanelId(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------
   ADRESSES DU COMPTE & ESPACE CLIENT
   ------------------------------------------------------------------
   Une seule source pour le menu de compte, les cinq écrans
   d’authentification et l’entrée dans le tableau de bord : aucune
   adresse partagée n’est écrite deux fois.
   ------------------------------------------------------------------ */

export const AUTH_HREF = "/connexion";
export const CLIENT_HREF = "/client";
export const SIGNUP_HREF = "/inscription";
export const FORGOT_HREF = "/mot-de-passe-oublie";
export const RESET_HREF = "/reinitialisation";
export const VERIFY_HREF = "/verification-email";

export const ACCOUNT_LINKS = [
  { href: AUTH_HREF, label: "Connexion" },
  { href: SIGNUP_HREF, label: "Inscription" },
  { href: FORGOT_HREF, label: "Mot de passe oublié" },
  { href: RESET_HREF, label: "Réinitialisation" },
  { href: VERIFY_HREF, label: "Vérification de l’adresse" },
] as const;

/** Sections de /a-propos, réutilisées par le sommaire de la page. */
export const ABOUT_SECTIONS = [
  { id: "mission", label: "Notre mission" },
  { id: "protocole", label: "Protocole de vérification" },
  { id: "piliers", label: "Nos convictions" },
  { id: "chiffres", label: "Repères" },
  { id: "publics", label: "À qui s’adresse HOMERA" },
  { id: "responsabilite", label: "Cadre légal" },
] as const;

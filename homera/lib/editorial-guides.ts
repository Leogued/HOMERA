import type { Property } from "@/lib/content";
import { FEATURE_LABELS, INTENT_LABELS, LAND_TITLE_LABELS, TYPE_LABELS, formatFCFA } from "@/lib/format";

/* ==================================================================
   HOMERA — GUIDES ÉDITORIAUX, REPÈRES MÉTIERS & CONTEXTE TERRITORIAL
   ------------------------------------------------------------------
   Ce module alimente les pages publiques en contenu utile, précis et
   directement actionnable (AGENTS.md — "Le contenu passe avant la mise
   en page" & "Pouvoir d'ajouter").
   Règle absolue : zéro statistique inventée, zéro faux témoignage,
   zéro slogan creux — uniquement des repères immobiliers concrets,
   adaptés au marché béninois (Cotonou, Abomey-Calavi, Porto-Novo,
   Ouidah) et au protocole de vérification HOMERA.
   ================================================================== */

export type NeighborhoodProfile = {
  title: string;
  vibe: string;
  summary: string;
  highlights: { label: string; detail: string }[];
};

const DISTRICT_PROFILES: Record<string, NeighborhoodProfile> = {
  "Fidjrossè": {
    title: "Fidjrossè · Cotonou Ouest",
    vibe: "Littoral résidentiel, villas contemporaines et cadre aéré",
    summary:
      "Situé à l’ouest de Cotonou le long de l’axe menant à la Route des Pêches et à proximité immédiate de l’aéroport international Cardinal Bernardin Gantin, Fidjrossè conjugue vie résidentielle calme, brise océanique et accès rapide au centre-ville.",
    highlights: [
      { label: "Accès & mobilité", detail: "Liaison directe vers l’aéroport, Haie Vive et la Route des Pêches par voies aménagées." },
      { label: "Typologie dominante", detail: "Villas familiales avec cour, résidences d’appartements récents et logements meublés de court séjour." },
      { label: "Cadre quotidien", detail: "Commerces de proximité, tables du front de mer et ambiance résidentielle recherchée par la diaspora." },
    ],
  },
  "Fidjrossè Plage": {
    title: "Fidjrossè Plage · Front de mer de Cotonou",
    vibe: "Première ligne côtière, résidences de standing et séjours balnéaires",
    summary:
      "Frange maritime de Fidjrossè ouverte sur l’océan Atlantique et la Route des Pêches, ce secteur accueille des villas contemporaines avec jardin et piscine ainsi que des résidences meublées prisées pour les séjours et l’investissement patrimonial.",
    highlights: [
      { label: "Situation côtière", detail: "À quelques minutes à pied de la plage et des aménagements de la Route des Pêches." },
      { label: "Point d’attention technique", detail: "Exposition aux embruns marins : la qualité des menuiseries, peintures et équipements est essentielle." },
      { label: "Usage privilégié", detail: "Résidence principale de standing, pied-à-terre pour la diaspora ou séjour meublé." },
    ],
  },
  "Haie Vive": {
    title: "Haie Vive · Cœur résidentiel et diplomatique",
    vibe: "Quartier central, sécurisé et fortement équipé",
    summary:
      "Référence historique du résidentiel haut de gamme à Cotonou, la Haie Vive concentre ambassades, sièges d’organisations internationales, restaurants, cliniques et immeubles d’appartements modernes à cinq minutes de l’aéroport.",
    highlights: [
      { label: "Environnement immédiat", detail: "Services médicaux, enseignes internationales, écoles et représentations diplomatiques accessibles à pied." },
      { label: "Demande locative", detail: "Forte demande en appartements F3/F4 sécurisés avec groupe électrogène ou autonomie énergétique." },
      { label: "Accessibilité", detail: "Voies pavées et bitumées, connexion fluide vers Ganhi, Cadjèhoun et Fidjrossè." },
    ],
  },
  "Ganhi": {
    title: "Ganhi · Centre d’affaires et pôle tertiaire",
    vibe: "Cœur économique, banques, ministères et commerces majeurs",
    summary:
      "Centre névralgique des affaires à Cotonou, Ganhi regroupe les sièges bancaires, cabinets de conseil, hôtels d’affaires et axes commerciaux à forte visibilité, entre le port autonome et le boulevard de la Marina.",
    highlights: [
      { label: "Vocation principale", detail: "Bureaux, locaux commerciaux en rez-de-chaussée à forte fréquentation et studios d’affaires." },
      { label: "Connectivité", detail: "Accès direct au boulevard de la Marina, au port et aux principaux pôles administratifs." },
      { label: "Critère clé", detail: "Disponibilité du stationnement, visibilité de façade et continuité électrique." },
    ],
  },
  "Akpakpa": {
    title: "Akpakpa · Rive Est de Cotonou",
    vibe: "Secteur résidentiel établi, dynamique et bien relié",
    summary:
      "Situé à l’est du chenal de Cotonou, Akpakpa offre un tissu urbain équilibré mêlant immeubles résidentiels récents, maisons familiales, axes commerçants actifs et accès rapide vers Porto-Novo comme vers le centre de Cotonou.",
    highlights: [
      { label: "Position stratégique", detail: "Relié au centre par les ponts de Cotonou et ouvert sur l’axe routier menant à Sèmè et Porto-Novo." },
      { label: "Rapport surface / budget", detail: "Appartements F3/F4 et maisons familiales offrant des volumes généreux à budget maîtrisé." },
      { label: "Vie de quartier", detail: "Marchés, établissements scolaires, équipements sportifs et services accessibles." },
    ],
  },
  "Cadjèhoun": {
    title: "Cadjèhoun · Secteur institutionnel et résidentiel central",
    vibe: "Proximité administrative, calme résidentiel et mobilité immédiate",
    summary:
      "Au carrefour de l’aéroport, de la Haie Vive et des grands ministères, Cadjèhoun est un quartier central très recherché pour les déplacements professionnels comme pour la location résidentielle de longue durée.",
    highlights: [
      { label: "Centralité", detail: "À moins de dix minutes des ministères, de l’aéroport et du boulevard de la Marina." },
      { label: "Profil des biens", detail: "Appartements meublés ou nus, résidences gardiennées et maisons de ville." },
      { label: "Atout majeur", detail: "Réduction maximale des temps de trajet quotidiens dans Cotonou." },
    ],
  },
  "Tankpè": {
    title: "Tankpè · Abomey-Calavi",
    vibe: "Extension résidentielle dynamique et parcelles familiales",
    summary:
      "Au cœur du développement urbain d’Abomey-Calavi, Tankpè attire à la fois les familles souhaitant construire ou acquérir un duplex sur parcelle titrée et les actifs recherchant des logements récents proches du pôle universitaire.",
    highlights: [
      { label: "Potentiel foncier", detail: "Parcelles loties, villas duplex sur terrains de 400 à 800 m² et résidences neuves." },
      { label: "Voisinage", detail: "Proximité du campus d’Abomey-Calavi, des nouveaux axes routiers et des commerces." },
      { label: "Vigilance HOMERA", detail: "Contrôle systématique du numéro de parcelle, du lotissement et du titre foncier ou ACD." },
    ],
  },
  "Akassato": {
    title: "Akassato · Nord d’Abomey-Calavi",
    vibe: "Nouveaux programmes résidentiels, calme et réserves foncières",
    summary:
      "Sur l’axe nord d’Abomey-Calavi, Akassato connaît une urbanisation structurée portée par des voies élargies, des lotissements récents et des constructions familiales offrant espace, calme et cours arborées.",
    highlights: [
      { label: "Espace & volumes", detail: "Terrains viabilisés, maisons familiales avec cour et duplex contemporains avec terrasse." },
      { label: "Profil acheteur", detail: "Familles béninoises et membres de la diaspora préparant une construction ou une résidence principale." },
      { label: "Point de contrôle", detail: "Vérification de l’état d’avancement de la viabilisation (accès routier, réseau SBEE/SONEB)." },
    ],
  },
  "Zogbadjè": {
    title: "Zogbadjè · Pôle universitaire d’Abomey-Calavi",
    vibe: "Quartier vivant, studios fonctionnels et services de proximité",
    summary:
      "Immédiatement voisin de l’Université d’Abomey-Calavi (UAC) et du centre hospitalier, Zogbadjè concentre une vie locale animée et une demande constante en studios, petits appartements et logements fonctionnels.",
    highlights: [
      { label: "Proximité immédiate", detail: "Accès direct au campus universitaire, aux transports et aux commerces quotidiens." },
      { label: "Usage locatif", detail: "Idéal pour étudiants, jeunes actifs, enseignants et séjours académiques." },
      { label: "Confort recherché", detail: "Alimentation en eau régulière, sécurité des accès et ventilation naturelle." },
    ],
  },
  "Ouando": {
    title: "Ouando · Pôle actif de Porto-Novo",
    vibe: "Carrefour commerçant et résidentiel de la capitale",
    summary:
      "Secteur parmi les plus dynamiques de Porto-Novo, Ouando combine activité commerciale soutenue, nouveaux axes routiers asphaltés et quartiers résidentiels composés de villas familiales et d’immeubles récents.",
    highlights: [
      { label: "Dynamisme urbain", detail: "Proximité du grand marché de Ouando, des banques et des axes de contournement de Porto-Novo." },
      { label: "Biens représentés", detail: "Maisons familiales sur cour, appartements spacieux et locaux professionnels." },
      { label: "Avantage", detail: "Excellent compromis entre vie citadine active et sérénité résidentielle." },
    ],
  },
  "Centre Administratif": {
    title: "Centre Administratif · Porto-Novo",
    vibe: "Institutions nationales, avenues arborées et calme résidentiel",
    summary:
      "Autour des institutions de la capitale administrative du Bénin, ce secteur offre un cadre paisible, verdoyant et ordonné, particulièrement apprécié des cadres, familles et professionnels en mission.",
    highlights: [
      { label: "Environnement", detail: "Avenues larges, bâtiments institutionnels et calme prononcé en soirée." },
      { label: "Typologie", detail: "Villas sur grandes parcelles, appartements de fonction et bureaux." },
      { label: "Sécurité foncière", detail: "Secteur ancien au cadastre structuré, propice aux vérifications documentaires rapides." },
    ],
  },
  "Ouidah Centre": {
    title: "Ouidah Centre · Cité historique et culturelle",
    vibe: "Patrimoine, architecture aérée et douceur de vivre côtière",
    summary:
      "Ville historique majeure du littoral béninois, Ouidah séduit par son calme, ses maisons à vérandas ombragées, ses jardins arborés et sa proximité immédiate avec l’océan et la Route des Pêches.",
    highlights: [
      { label: "Art de vivre", detail: "Rythme apaisé, patrimoine culturel vivant et proximité des plages à quelques minutes." },
      { label: "Architecture", detail: "Maisons basses sur cour, villas de villégiature et terrains résidentiels." },
      { label: "Connexion", detail: "Reliée à Cotonou par la Route Nationale et par l’axe côtier de la Route des Pêches." },
    ],
  },
  "Route des Pêches": {
    title: "Route des Pêches · Axe littoral Cotonou – Ouidah",
    vibe: "Villégiature balnéaire, éco-résidences et horizon océanique",
    summary:
      "Ruban côtier emblématique reliant Cotonou à Ouidah entre océan Atlantique et lagune, la Route des Pêches concentre les projets résidentiels et touristiques les plus prisés du Sud-Bénin.",
    highlights: [
      { label: "Attractivité", detail: "Cadre balnéaire d’exception pour les séjours, les villas secondaires et l’investissement." },
      { label: "Point de vigilance foncier", detail: "Certaines zones faisant l’objet d’aménagements publics, le contrôle du périmètre et du titre est indispensable." },
      { label: "Expérience séjour", detail: "Accès direct à la plage, couchers de soleil et calme absolu à 25 minutes de Cotonou." },
    ],
  },
};

const CITY_FALLBACKS: Record<string, NeighborhoodProfile> = {
  "Cotonou": {
    title: "Cotonou · Métropole économique du Bénin",
    vibe: "Littoral actif, quartiers résidentiels établis et pôle d’affaires",
    summary:
      "Poumon économique du pays, Cotonou concentre les infrastructures aéroportuaires et portuaires, les sièges d’entreprises et les quartiers résidentiels les plus recherchés du littoral béninois.",
    highlights: [
      { label: "Marché immobilier", detail: "Forte demande locative et patrimoniale sur les appartements, villas et locaux professionnels." },
      { label: "Mobilité", detail: "Voirie urbaine modernisée (asphaltage) facilitant la liaison entre les rives ouest et est." },
      { label: "Vérification HOMERA", detail: "Contrôle documentaire systématique du titre, du propriétaire et du mandat." },
    ],
  },
  "Abomey-Calavi": {
    title: "Abomey-Calavi · Grand pôle résidentiel et universitaire",
    vibe: "Croissance urbaine, terrains titrés et maisons familiales",
    summary:
      "Commune limitrophe au nord de Cotonou, Abomey-Calavi offre des surfaces généreuses pour l’acquisition foncière, la construction familiale et l’investissement locatif résidentiel.",
    highlights: [
      { label: "Opportunités", detail: "Parcelles viabilisées, villas duplex neuves et résidences proches du campus." },
      { label: "Sécurité documentaire", detail: "Importance majeure de la vérification de l’ACD ou du Titre Foncier avant tout engagement." },
      { label: "Liaison Cotonou", detail: "Accès direct vers Cotonou par les axes principaux et les voies de contournement." },
    ],
  },
  "Porto-Novo": {
    title: "Porto-Novo · Capitale institutionnelle et culturelle",
    vibe: "Sérénité résidentielle, patrimoine et grands terrains",
    summary:
      "Capitale du Bénin bordée par la lagune, Porto-Novo propose un marché immobilier stable, des propriétés familiales spacieuses et un cadre de vie verdoyant à moins d’une heure de Cotonou.",
    highlights: [
      { label: "Qualité de vie", detail: "Quartiers calmes, avenues aérées et tissu commerçant structuré autour de Ouando." },
      { label: "Typologie", detail: "Villas familiales, immeubles de rapport et parcelles résidentielles." },
      { label: "Traçabilité", detail: "Chaque bien publié dispose d’un dossier de propriété daté et vérifié." },
    ],
  },
  "Ouidah": {
    title: "Ouidah · Littoral historique et balnéaire",
    vibe: "Douceur côtière, maisons à cour et résidences de séjour",
    summary:
      "À l’ouest de Cotonou au bout de la Route des Pêches, Ouidah conjugue mémoire historique, plages préservées et développement résidentiel tourné vers la villégiature et l’investissement durable.",
    highlights: [
      { label: "Cadre naturel", detail: "Entre lagune, cocoteraies et océan Atlantique." },
      { label: "Projets adaptés", detail: "Résidence secondaire, séjour courte durée ou acquisition foncière vérifiée." },
      { label: "Accompagnement", detail: "Visites organisées avec des représentants mandatés et identifiés." },
    ],
  },
};

export function getNeighborhoodContext(city: string, district: string): NeighborhoodProfile {
  return DISTRICT_PROFILES[district] ?? CITY_FALLBACKS[city] ?? CITY_FALLBACKS["Cotonou"];
}

/* ------------------------------------------------------------------
   SYNTHÈSE ÉDITORIALE & REPÈRES FINANCIERS D’UNE FICHE DE BIEN
   ------------------------------------------------------------------ */

export function buildPropertyEditorialSynthesis(property: Property): string[] {
  const paragraphs: string[] = [];
  if (property.description) {
    paragraphs.push(property.description);
  }

  const typeLabel = TYPE_LABELS[property.type].toLowerCase();
  const intentLabel = INTENT_LABELS[property.intent].toLowerCase();
  const featureList = (property.features ?? []).map((f) => FEATURE_LABELS[f].toLowerCase());

  if (property.type === "terrain") {
    const titleStatus = property.landTitle ? LAND_TITLE_LABELS[property.landTitle] : "document foncier déclaré au dossier";
    paragraphs.push(
      `Cette parcelle de ${property.surface} m² située à ${property.district} (${property.city}) est proposée ${intentLabel} avec un dossier reposant sur : ${titleStatus}. ${
        featureList.length > 0
          ? `Le terrain bénéficie notamment des éléments suivants déclarés au dossier : ${featureList.join(", ")}.`
          : "Sa configuration régulière permet d’envisager une construction résidentielle ou patrimoniale après validation technique."
      }`,
    );
  } else if (property.type === "local") {
    paragraphs.push(
      `D’une surface utile de ${property.surface} m²${property.floor ? ` (${property.floor})` : ""}, ce ${typeLabel} implanté à ${property.district} (${property.city}) répond aux besoins d’une activité professionnelle, commerciale ou de services recherchant une adresse lisible et facilement repérable par la clientèle.`,
    );
  } else {
    const roomsPart = property.rooms ? `${property.rooms} pièce${property.rooms > 1 ? "s" : ""}` : `${property.surface} m²`;
    const bedBathPart =
      property.bedrooms > 0
        ? ` comprenant ${property.bedrooms} chambre${property.bedrooms > 1 ? "s" : ""}${
            property.bathrooms > 0 ? ` et ${property.bathrooms} salle${property.bathrooms > 1 ? "s" : ""} d’eau` : ""
          }`
        : "";
    const equipPart =
      featureList.length > 0
        ? ` Les équipements déclarés incluent : ${featureList.slice(0, 5).join(", ")}.`
        : "";
    paragraphs.push(
      `Ce ${typeLabel} développe ${property.surface} m² (${roomsPart}${bedBathPart})${
        property.floor ? `, situé au ${property.floor.toLowerCase()}` : ""
      }, au sein du secteur ${property.district} à ${property.city}.${equipPart} Le dossier a fait l’objet d’un contrôle documentaire HOMERA le ${property.verifiedOn} sous la référence ${property.homeraId}.`,
    );
  }

  return paragraphs;
}

export type PropertyCommitmentGuide = {
  title: string;
  subtitle: string;
  metrics: { label: string; value: string; note: string }[];
  stepsTitle: string;
  steps: { title: string; detail: string }[];
};

export function getPropertyCommitmentGuide(property: Property): PropertyCommitmentGuide {
  const pricePerSqm = property.surface > 0 ? Math.round(property.price / property.surface) : 0;

  if (property.intent === "acheter") {
    const landLabel = property.landTitle ? LAND_TITLE_LABELS[property.landTitle] : "Pièces de propriété au dossier";
    return {
      title: "Repères financiers & cadre d’acquisition",
      subtitle:
        "Acheter au Bénin exige de croiser la réalité physique du bien avec sa situation administrative avant tout versement d’acompte.",
      metrics: [
        {
          label: "Prix affiché",
          value: formatFCFA(property.price),
          note: "Montant déclaré par le propriétaire hors frais d’acte notarié.",
        },
        {
          label: "Valeur indicative au m²",
          value: `${formatFCFA(pricePerSqm)} / m²`,
          note: `Calculée sur une surface déclarée de ${property.surface} m².`,
        },
        {
          label: "Statut foncier déclaré",
          value: landLabel,
          note: `Pièce examinée lors du contrôle HOMERA du ${property.verifiedOn}.`,
        },
      ],
      stepsTitle: "Les 3 étapes indispensables avant tout engagement définitif",
      steps: [
        {
          title: "1. Visite sur place ou inspection représentée",
          detail:
            "Constatez l’état réel du bâti ou des bornes du terrain avec un représentant dont le mandat est actif pour la référence " +
            property.homeraId +
            ".",
        },
        {
          title: "2. Vérification contradictoire auprès de l’ANDF",
          detail:
            "Avant toute signature, le numéro du Titre Foncier, de l’ACD ou du certificat d’appartenance doit être confirmé auprès de l’Agence Nationale du Domaine et du Foncier.",
        },
        {
          title: "3. Transaction exclusivement devant notaire",
          detail:
            "Aucun paiement d’acquisition ne doit être versé de gré à gré sans rédaction d’un acte authentique par une étude notariale au Bénin.",
        },
      ],
    };
  }

  if (property.intent === "louer") {
    return {
      title: "Repères locatifs & conditions d’entrée",
      subtitle:
        "Sur HOMERA, aucune demande de location ne peut être ouverte sans qu’une visite préalable du bien ait été effectuée et marquée comme terminée.",
      metrics: [
        {
          label: "Loyer mensuel",
          value: `${formatFCFA(property.price)} / mois`,
          note: "Loyer de base affiché par le propriétaire bailleur.",
        },
        {
          label: "Ratio surface",
          value: `${formatFCFA(pricePerSqm)} / m²`,
          note: `Pour ${property.surface} m² habitables à ${property.district}.`,
        },
        {
          label: "Condition de candidature",
          value: "Visite préalable requise",
          note: "Protège le locataire contre les réservations à l’aveugle.",
        },
      ],
      stepsTitle: "Ce qu’il faut vérifier lors de la visite et avant le bail",
      steps: [
        {
          title: "1. Compteurs SBEE (électricité) et SONEB (eau)",
          detail:
            "Vérifiez si les compteurs sont individuels ou partagés, à prépaiement ou classiques, et assurez-vous de l’absence d’arriérés avant l’entrée.",
        },
        {
          title: "2. État des lieux contradictoire écrit",
          detail:
            "Fonctionnement de la climatisation, pression d’eau, étanchéité et serrurerie doivent être consignés par écrit avant la remise des clés.",
        },
        {
          title: "3. Bail écrit et quittance claire",
          detail:
            "Le contrat précise le montant du loyer, le dépôt de garantie, les charges éventuelles (gardiennage, entretien) et l’identité du bailleur.",
        },
      ],
    };
  }

  return {
    title: "Repères de séjour & modalités d’accueil",
    subtitle:
      "Pour un séjour de courte durée à Cotonou, Calavi ou sur la côte, la conformité réelle des équipements et l’accueil par un référent identifié font toute la différence.",
    metrics: [
      {
        label: "Tarif par nuitée",
        value: `${formatFCFA(property.price)} / nuit`,
        note: "Tarif affiché pour le logement complet.",
      },
      {
        label: "Durée minimale",
        value: property.minNights ? `${property.minNights} nuit${property.minNights > 1 ? "s" : ""}` : "Flexible",
        note: "Séjour court, mission professionnelle ou vacances.",
      },
      {
        label: "Contrôle du logement",
        value: `Vérifié le ${property.verifiedOn}`,
        note: "Identité du gestionnaire et équipements contrôlés.",
      },
    ],
    stepsTitle: "Comment se déroule la réservation d’un séjour",
    steps: [
      {
        title: "1. Confirmation des dates et des équipements",
        detail:
          "Vérifiez la disponibilité aux dates souhaitées ainsi que les équipements clés (climatisation, connexion, autonomie électrique).",
      },
      {
        title: "2. Interlocuteur identifié à l’arrivée",
        detail:
          "La remise des clés et la présentation du logement sont assurées par un représentant habilité sur la référence " +
          property.homeraId +
          ".",
      },
      {
        title: "3. État d’entrée et assistance",
        detail:
          "Les consignes d’accès, de sécurité et le contact d’assistance pendant le séjour vous sont remis dès l’accueil.",
      },
    ],
  };
}

/* ------------------------------------------------------------------
   GUIDES DE DÉCISION PAR PROJET (/acheter, /louer, /sejour)
   ------------------------------------------------------------------ */

export type ProjectDecisionGuide = {
  title: string;
  intro: string;
  pillars: { badge: string; title: string; body: string }[];
  faqs: { question: string; answer: string }[];
};

export const PROJECT_DECISION_GUIDES: Record<"acheter" | "louer" | "sejour", ProjectDecisionGuide> = {
  acheter: {
    title: "Acheter au Bénin : les repères essentiels avant de vous engager",
    intro:
      "Qu’il s’agisse d’une parcelle à Abomey-Calavi, d’une villa à Fidjrossè ou d’un appartement à la Haie Vive, une acquisition réussie repose sur la clarté documentaire et le respect des étapes légales.",
    pillars: [
      {
        badge: "01 · Foncier & titres",
        title: "Distinguer Titre Foncier, ACD et Convention de vente",
        body:
          "Le Titre Foncier (TF) enregistré à l’ANDF confère une propriété définitive et inattaquable. L’Arrêté de Concession Définitive (ACD) ou l’attestation de recasement constituent des étapes avancées de régularisation, tandis qu’une simple convention de vente affirmée exige une diligence approfondie avant toute mutation.",
      },
      {
        badge: "02 · Acheter depuis la diaspora",
        title: "Décider à distance sans s’en remettre aux rumeurs",
        body:
          "Pour les acquéreurs résidant hors du Bénin, la référence unique HOMERA (HOM-...) permet de désigner exactement le même bien lors des échanges avec votre représentant sur place, votre géomètre et votre notaire, avec un historique de contrôle daté.",
      },
      {
        badge: "03 · Sécurité de la transaction",
        title: "Du contrôle HOMERA à l’acte authentique notarié",
        body:
          "HOMERA effectue un contrôle documentaire amont (cohérence des pièces, identité du déclarant, mandat de commercialisation). La vente définitive et le transfert des fonds doivent systématiquement passer par un notaire béninois après réquisition auprès de l’ANDF.",
      },
    ],
    faqs: [
      {
        question: "Que signifie la mention « Titre foncier » ou « ACD » sur une fiche HOMERA ?",
        answer:
          "Elle indique la nature de la pièce principale présentée par le propriétaire lors du dépôt du dossier et contrôlée par HOMERA à la date affichée. Avant tout compromis, votre notaire procède à la vérification officielle de cette pièce auprès de l’ANDF.",
      },
      {
        question: "Comment organiser une visite si je réside à l’étranger (diaspora) ?",
        answer:
          "Vous pouvez demander une visite depuis la fiche du bien en précisant dans votre message le nom du proche ou du conseil qui vous représentera sur place, ou solliciter un premier échange avec l’agent mandaté en mentionnant la référence HOMERA.",
      },
      {
        question: "HOMERA perçoit-elle des fonds lors d’une demande de visite ou de renseignement ?",
        answer:
          "Non. La consultation des fiches, de l’historique de vérification et l’envoi d’une demande d’information ou de visite via HOMERA sont ouverts et sans paiement en ligne.",
      },
    ],
  },
  louer: {
    title: "Louer au Bénin : un parcours cadré de la visite à la remise des clés",
    intro:
      "Trouver une location à Cotonou, Calavi ou Porto-Novo ne devrait jamais imposer de multiplier les intermédiaires informels ni de payer avant d’avoir vu le logement.",
    pillars: [
      {
        badge: "01 · Règle d’or HOMERA",
        title: "Aucune candidature sans visite terminée",
        body:
          "Sur HOMERA, le dépôt d’un dossier de location ne s’ouvre qu’après une visite effective du bien. Vous constatez d’abord l’état réel du logement, son accès, son voisinage et ses équipements avant de transmettre votre candidature.",
      },
      {
        badge: "02 · Interlocuteur vérifiable",
        title: "Un mandat rattaché à un bien précis",
        body:
          "Chaque agent intervenant sur HOMERA agit dans le cadre d’une autorisation nominative, datée et limitée à la référence exacte du bien. Vous pouvez vérifier son matricule et son habilitation sur la page de vérification publique avant le rendez-vous.",
      },
      {
        badge: "03 · Entrée dans les lieux",
        title: "Compteurs, charges et contrat de bail écrits",
        body:
          "Avant la signature du bail et la remise des clés, vérifiez le fonctionnement des compteurs SBEE et SONEB, le détail des charges (gardiennage, entretien des parties communes, vidange) et exigez un état des lieux contradictoire écrit.",
      },
    ],
    faqs: [
      {
        question: "Pourquoi dois-je d’abord demander une visite avant de déposer un dossier de location ?",
        answer:
          "Cette règle protège à la fois le locataire et le propriétaire : elle évite les engagements sur la seule base de photos et garantit que chaque dossier étudié par le bailleur émane d’un candidat ayant réellement visité les lieux.",
      },
      {
        question: "Comment vérifier que l’agent qui me fait visiter est bien autorisé par le propriétaire ?",
        answer:
          "Sur la fiche du bien ou lors du rendez-vous, utilisez le lien « Vérifier l’agent autorisé » (ou scannez son QR code HOMERA). Le système confirme immédiatement si son matricule détient un mandat actif pour cette référence précise.",
      },
      {
        question: "Quels éléments doivent figurer dans le contrat de location ?",
        answer:
          "Le bail écrit doit mentionner l’identité complète du bailleur, la référence et la description du logement, le loyer mensuel en FCFA, le détail des charges, la durée, les conditions de préavis ainsi que l’état des lieux d’entrée.",
      },
    ],
  },
  sejour: {
    title: "Séjourner au Bénin : logements meublés vérifiés et accueil identifié",
    intro:
      "Pour une mission professionnelle à Cotonou, un retour familial au pays ou quelques jours sur la Route des Pêches et à Ouidah, HOMERA sélectionne des logements meublés dont l’adresse et les équipements sont contrôlés.",
    pillars: [
      {
        badge: "01 · Confort réel",
        title: "Des équipements déclarés et vérifiés sur place",
        body:
          "Climatisation fonctionnelle, literie entretenue, cuisine équipée, alimentation en eau et solution de secours électrique : chaque fiche précise les équipements réellement présents pour éviter tout décalage à l’arrivée.",
      },
      {
        badge: "02 · Accueil & sécurité",
        title: "Un référent identifié pour la remise des clés",
        body:
          "Votre arrivée est coordonnée avec le propriétaire ou un gestionnaire formellement mandaté. Vous connaissez à l’avance le quartier exact, les modalités d’accès et votre interlocuteur sur place.",
      },
      {
        badge: "03 · Lisibilité des tarifs",
        title: "Un prix à la nuitée annoncé clairement",
        body:
          "Le tarif par nuitée en FCFA et la durée minimale de séjour (dès 1, 2 ou 3 nuits selon le bien) sont affichés dès la carte du catalogue, sans frais cachés ajoutés au dernier moment.",
      },
    ],
    faqs: [
      {
        question: "Quelle est la durée minimale pour réserver un logement en court séjour ?",
        answer:
          "La durée minimale varie selon les biens (de 1 à 5 nuits) et figure explicitement sur chaque carte et chaque fiche détaillée. Vous pouvez également filtrer directement par « À la nuitée » ou « Court séjour ».",
      },
      {
        question: "Les logements meublés sont-ils adaptés aux déplacements professionnels ?",
        answer:
          "Oui : la catégorie « Déplacement pro » regroupe des appartements et studios situés à proximité des centres d’affaires (Haie Vive, Ganhi, Cadjèhoun, Centre Administratif) disposant de la climatisation et d’espaces de travail adaptés.",
      },
      {
        question: "Comment organiser un séjour de plusieurs semaines ou combiner avec un déménagement ?",
        answer:
          "Contactez notre équipe depuis la fiche du bien avec sa référence HOMERA : nous vérifions les disponibilités sur la période souhaitée et les conditions tarifaires adaptées aux séjours prolongés.",
      },
    ],
  },
};

/* ------------------------------------------------------------------
   REPÈRES ÉDITORIAUX PAR CATÉGORIE (/acheter/[cat], /louer/[cat], /sejour/[cat])
   ------------------------------------------------------------------ */

export type CategoryVerificationNote = {
  title: string;
  summary: string;
  checkpoints: string[];
};

export const CATEGORY_VERIFICATION_NOTES: Record<string, CategoryVerificationNote> = {
  "acheter/terrains": {
    title: "Points de contrôle pour l’achat d’un terrain ou d’une parcelle",
    summary:
      "L’acquisition foncière au Bénin demande une vigilance particulière sur la chaîne des titres, le lotissement et la viabilisation effective du secteur.",
    checkpoints: [
      "Titre Foncier (TF), ACD ou convention affirmée : vérifiez la pièce exacte mentionnée sur chaque fiche.",
      "Implantation et bornage : contrôlez l’accessibilité routière et le raccordement aux réseaux (SBEE, SONEB).",
      "Confirmation notariale : exigez un état descriptif et une vérification auprès de l’ANDF avant tout compromis.",
    ],
  },
  "acheter/maisons": {
    title: "Repères pour l’acquisition d’une maison ou d’une villa",
    summary:
      "Outre le titre du terrain d’assiette, l’achat d’une villa construite implique de vérifier la qualité du gros œuvre, l’assainissement et les équipements techniques.",
    checkpoints: [
      "Concordance entre le titre foncier de la parcelle et les constructions édifiées.",
      "Qualité structurelle : toiture, étanchéité, évacuation des eaux pluviales et système d’alimentation en eau.",
      "Environnement immédiat : état de la voie d’accès en saison des pluies et sécurité du voisinage.",
    ],
  },
  "acheter/appartements": {
    title: "Repères pour l’achat d’un appartement ou d’un duplex",
    summary:
      "Acquérir un lot en immeuble à Cotonou ou Calavi suppose d’examiner à la fois les volumes privatifs et l’organisation des parties communes.",
    checkpoints: [
      "Gestion des parties communes : gardiennage, entretien, groupe électrogène et réserve d’eau de l’immeuble.",
      "Stationnement et accès : attribution claire des places de parking et sécurité des accès.",
      "Potentiel patrimonial : forte demande locative sur les F3, F4 et duplex à Haie Vive, Fidjrossè et Akpakpa.",
    ],
  },
  "acheter/locaux": {
    title: "Repères pour l’acquisition d’un local professionnel ou commercial",
    summary:
      "Un investissement professionnel réussi repose sur la visibilité de l’adresse, la facilité d’accès pour les clients et la conformité technique du local.",
    checkpoints: [
      "Accessibilité et stationnement : largeur de la voie, linéaire de vitrine et places disponibles devant le bien.",
      "Installations techniques : puissance électrique disponible, climatisation, sanitaires et réserve.",
      "Régularité du titre de propriété et compatibilité de l’immeuble avec une activité commerciale ou tertiaire.",
    ],
  },
  "louer/appartements": {
    title: "Bien choisir votre appartement en location longue durée",
    summary:
      "Du F2 fonctionnel au grand F4 familial, chaque appartement référencé précise son étage, sa surface et ses équipements vérifiés.",
    checkpoints: [
      "Compteurs individuels : vérifiez le mode de facturation de l’électricité (SBEE) et de l’eau (SONEB).",
      "Charges d’immeuble : clarifiez dès la visite ce qui est inclus (gardien, nettoyage des communs, eau).",
      "Visite préalable obligatoire avant l’ouverture de votre dossier de candidature sur HOMERA.",
    ],
  },
  "louer/maisons": {
    title: "Repères pour louer une maison familiale ou une villa",
    summary:
      "Les maisons et villas en location offrent l’indépendance d’une cour privative, d’un jardin ou d’une dépendance pour une vie familiale confortable.",
    checkpoints: [
      "Autonomie et équipements : présence d’un surpresseur ou château d’eau, pré-équipement groupe électrogène et parking interne.",
      "Sécurité du périmètre : clôture, portail, guérite de gardiennage et éclairage extérieur.",
      "État des lieux précis couvrant le bâti principal, les annexes et les espaces extérieurs.",
    ],
  },
  "louer/studios": {
    title: "Repères pour louer un studio fonctionnel et vérifié",
    summary:
      "Que vous soyez étudiant, jeune actif ou professionnel en mobilité, un studio bien choisi doit conjuguer sécurité, aération et maîtrise des charges.",
    checkpoints: [
      "Ventilation, luminosité et bon fonctionnement des équipements sanitaires et électriques.",
      "Sécurité de l’accès : portail fermé, calme de la cour ou de la résidence et proximité des axes de transport.",
      "Clarté du loyer mensuel et des conditions d’entrée sans intermédiaires multiples.",
    ],
  },
  "louer/locaux": {
    title: "Repères pour louer un local commercial ou professionnel",
    summary:
      "Installer une boutique, un cabinet ou des bureaux à Cotonou, Calavi ou Porto-Novo demande de vérifier la visibilité, l’accessibilité et le bail commercial.",
    checkpoints: [
      "Linéaire de vitrine, flux piéton ou routier et facilité de stationnement pour votre clientèle.",
      "Puissance électrique disponible, climatisation, sanitaires privatifs et sécurité des accès.",
      "Clarté du bail professionnel ou commercial : durée, loyer mensuel, charges et conditions d’aménagement.",
    ],
  },
  "louer/meubles": {
    title: "Louer meublé : s’installer immédiatement sans contrainte logistique",
    summary:
      "Les logements meublés permettent une prise de fonction ou une installation rapide avec un inventaire complet annexé au contrat.",
    checkpoints: [
      "Inventaire contradictoire du mobilier, de l’électroménager et de la climatisation avant la remise des clés.",
      "Vérification des services inclus (entretien, connexion internet, gardiennage, maintenance).",
      "Souplesse contractuelle adaptée aux expatriés, cadres en mission et retours de la diaspora.",
    ],
  },
  "sejour/nuitee": {
    title: "Réserver à la nuitée : autonomie, confort et adresse vérifiée",
    summary:
      "Pour un passage de 1 à 2 nuits à Cotonou, Calavi ou Ouidah, ces logements offrent l’indépendance d’un appartement privé avec un accueil ponctuel.",
    checkpoints: [
      "Horaires d’arrivée et de départ coordonnés directement avec le représentant identifié du bien.",
      "Climatisation, eau courante et literie prêtes dès votre arrivée.",
      "Emplacement vérifié à proximité immédiate des axes routiers, de l’aéroport ou du centre d’affaires.",
    ],
  },
  "sejour/quelques-jours": {
    title: "Séjour de quelques jours : le confort d’un vrai logement vérifié",
    summary:
      "Pour un déplacement professionnel ou une visite familiale de 2 à 7 nuits, ces appartements et villas meublés combinent autonomie et équipements complets.",
    checkpoints: [
      "Cuisine équipée, espaces de travail et de repos vérifiés avant votre arrivée.",
      "Tarification claire à la nuitée, sans frais de dossier opaques.",
      "Interlocuteur identifié sur place pour la remise des clés et l’assistance pendant le séjour.",
    ],
  },
  "sejour/courte-periode": {
    title: "Séjour en courte période : s’installer plusieurs semaines en toute sérénité",
    summary:
      "Pour une mission longue, un retour au pays ou une période de transition avant emménagement, ces logements offrent tout l’équipement d’une résidence principale.",
    checkpoints: [
      "Équipements complets pour le quotidien : cuisine, rangements, climatisation et continuité d’eau/électricité.",
      "Cadre résidentiel calme et sécurisé à Cotonou, Abomey-Calavi, Porto-Novo ou Ouidah.",
      "Référence HOMERA unique et accompagnement dédié tout au long de votre séjour.",
    ],
  },
  "sejour/court-sejour": {
    title: "Court séjour : le confort d’un vrai logement pour quelques jours ou semaines",
    summary:
      "À partir de 3 nuits, ces appartements et villas meublés permettent de vivre à votre rythme avec cuisine équipée et espaces de réception.",
    checkpoints: [
      "Cuisine équipée, espaces de rangement et autonomie complète pour les séjours de plusieurs jours.",
      "Tarification claire à la nuitée, sans frais de dossier opaques.",
      "Assistance joignable pendant toute la durée du séjour en cas de besoin technique.",
    ],
  },
  "sejour/vacances": {
    title: "Séjours vacances & littoral : villas et résidences de détente",
    summary:
      "Entre Fidjrossè Plage, la Route des Pêches et Ouidah, profitez de biens avec terrasse, jardin ou piscine pour vos séjours en famille ou entre proches.",
    checkpoints: [
      "Espaces extérieurs entretenus : piscine, jardin tropical, pergola ou terrasse ventilée.",
      "Proximité des plages et des lieux culturels tout en préservant l’intimité résidentielle.",
      "Capacité d’accueil clairement indiquée (nombre de chambres et de salles d’eau).",
    ],
  },
  "sejour/deplacement-pro": {
    title: "Déplacement professionnel : calme, centralité et fiabilité",
    summary:
      "Sélectionnés pour les consultants, cadres et entrepreneurs en mission, ces logements privilégient la proximité des institutions et la tranquillité de travail.",
    checkpoints: [
      "Emplacement stratégique (Haie Vive, Ganhi, Cadjèhoun, Centre Administratif) limitant les temps de trajet.",
      "Environnement calme, climatisation performante et espace permettant de travailler confortablement.",
      "Référence HOMERA unique et récapitulatif clair pour faciliter vos justificatifs de mission.",
    ],
  },
};

export function getCategoryVerificationNote(projectSlug: string, categorySlug: string): CategoryVerificationNote | null {
  return CATEGORY_VERIFICATION_NOTES[`${projectSlug}/${categorySlug}`] ?? null;
}

/* ------------------------------------------------------------------
   GUIDES DÉTAILLÉS DES 4 MÉTIERS (/services/[slug])
   ------------------------------------------------------------------ */

export type ServiceDetailedGuide = {
  audiencesTitle: string;
  audiences: { profile: string; need: string }[];
  scopeTitle: string;
  scopeIntro: string;
  scopes: { step: string; title: string; detail: string }[];
  deliverablesTitle: string;
  deliverables: string[];
  faqs: { question: string; answer: string }[];
};

export const SERVICE_DETAILED_GUIDES: Record<string, ServiceDetailedGuide> = {
  gestion: {
    audiencesTitle: "Pour quels propriétaires la gestion HOMERA est conçue",
    audiences: [
      {
        profile: "Propriétaires de la diaspora",
        need: "Déléguer la mise en location, l’encaissement des loyers et l’entretien d’un bien à Cotonou ou Calavi avec des comptes rendus écrits et photographiques réguliers.",
      },
      {
        profile: "Bailleurs résidents au Bénin",
        need: "Sécuriser la sélection des locataires, formaliser les états des lieux contradictoires et éviter les impayés ou les dégradations non suivies.",
      },
      {
        profile: "Détenteurs de plusieurs lots",
        need: "Centraliser le suivi des baux, des échéances, des interventions techniques et des documents par référence HOMERA unique.",
      },
    ],
    scopeTitle: "Ce que comprend concrètement la gestion locative",
    scopeIntro:
      "Chaque bien confié reçoit son identifiant HOMERA et suit un protocole de gestion structuré en quatre volets complémentaires.",
    scopes: [
      {
        step: "01",
        title: "Mise en marché & sélection du locataire",
        detail: "Vérification documentaire du bien, prises de vues soignées, organisation des visites par un agent mandaté et étude des dossiers de candidature.",
      },
      {
        step: "02",
        title: "Cadrage contractuel & état des lieux",
        detail: "Préparation du bail d’habitation ou professionnel, relevé contradictoire des compteurs SBEE/SONEB et état des lieux d’entrée détaillé avec photos.",
      },
      {
        step: "03",
        title: "Suivi des loyers & quittances",
        detail: "Rappel des échéances, émission des quittances, suivi des charges locatives et versement au propriétaire selon le calendrier convenu.",
      },
      {
        step: "04",
        title: "Veille technique & sortie du locataire",
        detail: "Coordination des réparations nécessaires sur devis préalable, état des lieux de sortie et arrêté des comptes de dépôt de garantie.",
      },
    ],
    deliverablesTitle: "Ce que vous recevez dans votre dossier propriétaire",
    deliverables: [
      "Fiche de vérification initiale et identifiant unique HOMERA du bien",
      "Dossiers de candidature synthétisés après chaque visite terminée",
      "État des lieux d’entrée et de sortie horodaté avec relevé des compteurs",
      "Compte rendu périodique de gestion et historique des interventions",
    ],
    faqs: [
      {
        question: "Puis-je confier un seul appartement ou une seule maison en gestion ?",
        answer:
          "Oui. Notre accompagnement s’adapte aussi bien à un bien unique (appartement, villa) qu’à un portefeuille de plusieurs lots ou à un immeuble entier.",
      },
      {
        question: "Comment sont gérées les réparations en cours de bail ?",
        answer:
          "Aucune dépense n’est engagée sans votre accord : en cas de besoin technique signalé par le locataire, un diagnostic et un devis vous sont transmis pour validation avant intervention.",
      },
    ],
  },
  maintenance: {
    audiencesTitle: "Qui fait appel au service de maintenance HOMERA",
    audiences: [
      {
        profile: "Propriétaires à distance ou sur place",
        need: "Entretenir régulièrement une villa ou un appartement (climatisation, plomberie, étanchéité) afin de préserver sa valeur locative et patrimoniale.",
      },
      {
        profile: "Locataires & occupants",
        need: "Faire intervenir rapidement un technicien qualifié et identifié pour une panne électrique, une fuite ou un entretien d’équipement, avec un tarif annoncé avant déplacement.",
      },
      {
        profile: "Gestionnaires de résidences meublées",
        need: "Garantir le parfait fonctionnement de tous les équipements entre deux séjours (groupe électrogène, surpresseur, serrurerie, climatisation).",
      },
    ],
    scopeTitle: "Domaines d’intervention et méthode de suivi",
    scopeIntro:
      "Nous remplaçons le recours aléatoire à des artisans non référencés par des interventions qualifiées, chiffrées à l’avance et documentées.",
    scopes: [
      {
        step: "01",
        title: "Plomberie, adduction d’eau & assainissement",
        detail: "Réparation de fuites, entretien de surpresseurs, châteaux d’eau, chauffe-eau, robinetterie et réseaux d’évacuation.",
      },
      {
        step: "02",
        title: "Électricité, climatisation & énergie",
        detail: "Diagnostic de tableaux électriques, entretien et recharge de climatiseurs split, vérification d’onduleurs et groupes de secours.",
      },
      {
        step: "03",
        title: "Menuiserie, serrurerie & étanchéité",
        detail: "Ajustement d’ouvertures, remplacement de serrures, reprise d’infiltrations de toiture et petites réparations de maçonnerie ou peinture.",
      },
      {
        step: "04",
        title: "Contrôle de fin d’intervention",
        detail: "Vérification du bon fonctionnement sur place et envoi d’un compte rendu illustré au demandeur.",
      },
    ],
    deliverablesTitle: "Ce qui vous est transmis pour chaque intervention",
    deliverables: [
      "Devis détaillé distinguant main-d’œuvre et fournitures avant le début des travaux",
      "Identité de l’intervenant technique et créneau de passage confirmé",
      "Photos avant / après intervention lorsque la nature de la panne s’y prête",
      "Compte rendu d’exécution rattaché à l’adresse ou à la référence HOMERA du bien",
    ],
    faqs: [
      {
        question: "Intervenez-vous uniquement sur les biens du catalogue HOMERA ?",
        answer:
          "Vous pouvez solliciter une intervention de maintenance aussi bien pour un bien référencé sur HOMERA que pour votre résidence actuelle à Cotonou, Abomey-Calavi, Porto-Novo ou Ouidah.",
      },
      {
        question: "Comment le prix de l’intervention est-il fixé ?",
        answer:
          "Après description de votre besoin (et diagnostic sur place si nécessaire), un devis clair vous est communiqué. Les travaux ne démarrent qu’après votre accord écrit.",
      },
    ],
  },
  demenagement: {
    audiencesTitle: "Pour qui est organisé le service de déménagement",
    audiences: [
      {
        profile: "Locataires et acheteurs emménageant au Bénin",
        need: "Transférer mobilier, électroménager et effets personnels d’un quartier ou d’une commune à l’autre sans casse ni improvisation logistique.",
      },
      {
        profile: "Familles de la diaspora et expatriés",
        need: "Coordonner la réception, la manutention et la mise en place du mobilier dans un nouveau logement avant ou dès leur arrivée.",
      },
      {
        profile: "Entreprises et cabinets professionnels",
        need: "Déménager des bureaux, postes de travail et archives à Cotonou ou Porto-Novo sur un créneau planifié limitant l’interruption d’activité.",
      },
    ],
    scopeTitle: "Organisation d’un déménagement de bout en bout",
    scopeIntro:
      "Chaque déménagement est préparé en amont selon le volume à transporter, les contraintes d’accès (étages, voies d’accès) et la fragilité des biens.",
    scopes: [
      {
        step: "01",
        title: "Estimation du volume & repérage des accès",
        detail: "Évaluation précise du mobilier, du nombre de cartons, des étages et des conditions de stationnement aux adresses de départ et d’arrivée.",
      },
      {
        step: "02",
        title: "Emballage, démontage & protection",
        detail: "Protection sous couvertures et films des meubles, sécurisation de l’électroménager et démontage des éléments volumineux.",
      },
      {
        step: "03",
        title: "Transport sécurisé & manutention",
        detail: "Acheminement par véhicule adapté avec équipe de manutentionnaires encadrée par un chef d’équipe identifié.",
      },
      {
        step: "04",
        title: "Remontage & mise en place par pièce",
        detail: "Installation des meubles dans les pièces désignées, remontage et vérification finale avec vous avant clôture.",
      },
    ],
    deliverablesTitle: "Garanties d’organisation et suivi",
    deliverables: [
      "Devis forfaitaire établi à l’avance selon le volume et la distance (Cotonou, Calavi, Porto-Novo, Ouidah)",
      "Planning horaire précis et coordonnées du responsable d’équipe",
      "Fiche de suivi au départ et à l’arrivée dans le nouveau logement",
      "Possibilité de coupler le déménagement avec le nettoyage ou la remise en état de l’ancien bien",
    ],
    faqs: [
      {
        question: "Combien de temps à l’avance faut-il réserver un déménagement ?",
        answer:
          "Nous recommandons de nous contacter 5 à 10 jours avant la date souhaitée afin d’évaluer sereinement le volume et de bloquer le véhicule et l’équipe adaptés.",
      },
      {
        question: "Fournissez-vous les cartons et le matériel de protection ?",
        answer:
          "Oui, sur demande lors de l’établissement du devis, nous incluons la fourniture des cartons, adhésifs, housses et protections pour la vaisselle et les écrans.",
      },
    ],
  },
  travaux: {
    audiencesTitle: "Qui accompagne le pôle Travaux & Aménagement HOMERA",
    audiences: [
      {
        profile: "Acquéreurs d’une maison ou d’un appartement",
        need: "Rénover, moderniser ou adapter un bien fraîchement acquis (peinture, cuisine, salles d’eau, climatisation) avant d’emménager ou de le louer.",
      },
      {
        profile: "Investisseurs et membres de la diaspora",
        need: "Faire exécuter des travaux d’aménagement ou de remise à neuf au Bénin avec un suivi rigoureux par jalons et des comptes rendus visuels datés.",
      },
      {
        profile: "Propriétaires bailleurs",
        need: "Remettre en état un logement entre deux locations ou valoriser un bien en meublé pour augmenter son attractivité.",
      },
    ],
    scopeTitle: "De la définition du besoin à la réception du chantier",
    scopeIntro:
      "Fini les chantiers sans fin ni visibilité : chaque projet de rénovation ou d’aménagement est découpé en étapes vérifiables.",
    scopes: [
      {
        step: "01",
        title: "Visite technique & cahier des charges",
        detail: "Relevé des surfaces, diagnostic de l’existant et définition précise des matériaux, finitions et équipements souhaités.",
      },
      {
        step: "02",
        title: "Devis ventilé par corps d’état",
        detail: "Chiffrage transparent lot par lot (maçonnerie, carrelage, plomberie, électricité, menuiserie, peinture) et calendrier prévisionnel.",
      },
      {
        step: "03",
        title: "Suivi d’exécution par jalons",
        detail: "Coordination des intervenants sur site et points d’étape illustrés (photos et vidéos datées) à chaque phase clé du chantier.",
      },
      {
        step: "04",
        title: "Réception contradictoire & levée des réserves",
        detail: "Inspection finale point par point avec vous (ou votre représentant) avant validation de la fin de chantier.",
      },
    ],
    deliverablesTitle: "Vos preuves de suivi tout au long du chantier",
    deliverables: [
      "Descriptif technique et devis détaillé par poste avant tout démarrage",
      "Calendrier d’exécution découpé en jalons vérifiables",
      "Comptes rendus d’avancement avec photos datées transmis à chaque étape",
      "Procès-verbal de réception finale en fin d’intervention",
    ],
    faqs: [
      {
        question: "Comment suivre mes travaux si je réside hors du Bénin ?",
        answer:
          "Chaque jalon du chantier fait l’objet d’un compte rendu écrit accompagné de photos et vidéos prises sur place. Aucun jalon suivant n’est engagé sans validation de l’étape précédente.",
      },
      {
        question: "Quels types de travaux prenez-vous en charge ?",
        answer:
          "Nous intervenons sur la rénovation intérieure et extérieure, la réfection de salles d’eau et cuisines, la peinture, le carrelage, l’électricité, la plomberie, l’étanchéité et l’aménagement de cours ou terrasses.",
      },
    ],
  },
};

/* ------------------------------------------------------------------
   CONTENU COMPLÉMENTAIRE POUR /a-propos & /contact
   ------------------------------------------------------------------ */

export const ABOUT_AUDIENCES = {
  title: "À qui s’adresse HOMERA",
  intro:
    "Le marché immobilier béninois réunit quatre acteurs dont les intérêts convergent dès lors que l’information sur le bien est claire, datée et vérifiable.",
  items: [
    {
      role: "Diaspora béninoise & internationale",
      title: "Investir ou préparer son retour sans décider à l’aveugle",
      body:
        "Depuis Paris, Montréal, Bruxelles, Abidjan ou Dakar, la distance amplifie le risque d’intermédiaires informels et de dossiers incomplets. HOMERA fournit une référence unique par bien, la nature exacte des pièces contrôlées et l’identité vérifiable du représentant sur place.",
      ctaLabel: "Explorer les biens à acheter",
      ctaHref: "/acheter",
    },
    {
      role: "Résidents & familles au Bénin",
      title: "Louer ou acheter à Cotonou, Calavi, Porto-Novo et Ouidah",
      body:
        "Fini les déplacements inutiles pour des biens déjà loués ou dont le prix change sur place : chaque fiche indique la disponibilité, la commune, le quartier, les équipements réels et impose une visite effective avant tout dossier de location.",
      ctaLabel: "Parcourir les locations",
      ctaHref: "/louer",
    },
    {
      role: "Propriétaires bailleurs & vendeurs",
      title: "Valoriser un bien en règle auprès d’acquéreurs et locataires qualifiés",
      body:
        "En déposant un dossier structuré (pièces de propriété, photos réelles, conditions claires), le propriétaire distingue immédiatement son bien des annonces informelles et garde la maîtrise sur les mandats accordés.",
      ctaLabel: "Ouvrir un espace propriétaire",
      ctaHref: "/inscription?role=proprietaire",
    },
    {
      role: "Agents & mandataires agréés",
      title: "Prouver son mandat bien par bien grâce à la vérification publique",
      body:
        "Les professionnels sérieux pâtissent des courtiers improvisés. Sur HOMERA, chaque agent habilité dispose d’un matricule et d’une page de vérification QR rattachée à chaque mandat actif, renforçant immédiatement sa crédibilité.",
      ctaLabel: "Tester la vérification d’agent",
      ctaHref: "/verification-agent",
    },
  ],
} as const;

export const ABOUT_VERIFICATION_BOUNDARY = {
  title: "Ce que couvre le contrôle HOMERA — et ce qui relève du notaire",
  intro:
    "La confiance naît de la clarté des rôles : HOMERA structure et vérifie le dossier en amont de votre décision, mais ne se substitue jamais aux autorités foncières et notariales.",
  coveredTitle: "Ce que HOMERA vérifie avant publication",
  covered: [
    "L’existence d’une pièce de propriété ou de gestion déclarée au dossier (Titre Foncier, ACD, convention ou mandat).",
    "L’identification du propriétaire déclarant et, le cas échéant, du mandataire autorisé à faire visiter le bien.",
    "La cohérence entre la localisation annoncée (commune, quartier), la typologie, la surface et les visuels présentés.",
    "La traçabilité datée : chaque contrôle, suspension ou mise à jour est horodaté sous la référence unique HOM-...",
  ],
  notaryTitle: "Ce qui relève exclusivement du notaire et de l’ANDF",
  notary: [
    "La réquisition officielle et le contrôle d’authenticité finale du Titre Foncier auprès de l’ANDF.",
    "La rédaction et la signature de l’acte authentique de vente et le quittancement légal des fonds.",
    "Le bornage contradictoire par un géomètre-expert agréé lors d’une acquisition de parcelle.",
    "La garantie juridique de propriété et la mutation cadastrale définitive au nom de l’acquéreur.",
  ],
} as const;

export const CONTACT_PREPARATION_GUIDES = [
  {
    title: "Visiter ou poser une question sur un bien",
    detail:
      "Indiquez la référence HOMERA (ex. HOM-CTN-000421), vos disponibilités de visite (en personne ou via un proche sur place) et vos questions techniques.",
  },
  {
    title: "Faire vérifier un bien repéré hors HOMERA",
    detail:
      "Précisez la commune, le quartier, la nature du document annoncé par le vendeur (TF, ACD, convention) et votre délai de décision.",
  },
  {
    title: "Confier la gestion ou chiffrer un service",
    detail:
      "Pour la gestion locative, la maintenance, un déménagement ou des travaux, mentionnez l’adresse du bien, sa typologie et le calendrier souhaité.",
  },
] as const;

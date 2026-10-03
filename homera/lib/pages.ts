/* ==================================================================
   HOMERA — TEXTES DES PAGES INSTITUTIONNELLES
   ------------------------------------------------------------------
   Services, À propos, Contact : toute la copie statique de ces pages
   vit ici, et non dans le JSX. Les pages deviennent des mises en page,
   la rédaction devient une donnée — relecture, traduction et
   corrections cessent de passer par du code.

   Règle éditoriale tenue partout : ce qui est vrai est dit, ce qui
   n’existe pas encore est annoncé comme tel (système pilote, données
   de démonstration, demandes envoyées par le client de messagerie).
   ================================================================== */

/* ------------------------------------------------------------------
   /services
   ------------------------------------------------------------------ */

export const SERVICES_PAGE = {
  breadcrumb: "Services",
  hero: {
    eyebrow: "Écosystème HOMERA",
    title: "Les services qui entourent un bien",
    intro:
      "Gestion locative, maintenance, déménagement et travaux : HOMERA intervient après la visite comme après l’installation, avec des interlocuteurs identifiés et des interventions documentées.",
    facts: ["Métiers couverts", "Zones"] as const,
    zones: "Cotonou · Calavi · Porto-Novo · Ouidah",
    primaryAction: "Demander un devis",
    secondaryAction: "Comment ça se passe",
  },
  jumpNav: {
    label: "Sommaire des services",
    href: "#comment",
  },
  serviceAction: (title: string) => `Demander un devis ${title.toLowerCase()}`,
  process: {
    id: "comment",
    title: "Comment une demande est traitée",
    intro: "Trois étapes, les mêmes quel que soit le métier : décrire, chiffrer, documenter.",
    steps: [
      {
        num: "01",
        title: "Vous décrivez le besoin",
        detail: "Le bien, le lieu et le délai : par téléphone, e-mail ou depuis une fiche de bien.",
      },
      {
        num: "02",
        title: "Un devis précède l’intervention",
        detail: "Périmètre, matériel et coût annoncés avant tout déplacement facturé.",
      },
      {
        num: "03",
        title: "L’intervention est documentée",
        detail: "Compte rendu simple, photos à l’appui, transmis au propriétaire ou au locataire.",
      },
    ],
    note: "Les demandes partent par e-mail : aucun envoi automatique n’est simulé.",
  },
} as const;

/* ------------------------------------------------------------------
   /a-propos
   ------------------------------------------------------------------ */

export const ABOUT_PAGE = {
  breadcrumb: "À propos",
  hero: {
    eyebrow: "Notre raison d’être",
    title: "Structurer la confiance, bien par bien",
    intro:
      "HOMERA est née d’un constat simple : au Bénin, chercher un logement ou un terrain coûte trop de temps, d’argent et d’incertitude. Nous répondons par une méthode — un identifiant, un dossier, une vérification datée — plutôt que par des promesses.",
    primaryAction: "Explorer les biens vérifiés",
    secondaryAction: "Nous écrire",
  },
  jumpNavLabel: "Sommaire de la page",
  mission: {
    title: "Notre mission",
    paragraphs: [
      "Nous voulons qu’un bien immobilier au Bénin se lise comme un dossier, pas comme une rumeur. Concrètement : un identifiant unique, des informations confrontées au terrain, un historique de vérification daté, et un accès libre à ces éléments avant toute mise en relation.",
      "Cette approche sert d’abord la diaspora — qui décide souvent à distance — puis les propriétaires, qui gagnent un canal sérieux, et les mandataires autorisés, dont le travail devient vérifiable.",
    ],
    reference: {
      label: "Exemple de référence",
      intro:
        "Le préfixe indique la commune, les chiffres identifient le bien dans le registre. Une référence se recherche, se partage et se retrouve.",
    },
  },
  protocol: {
    title: "Le protocole de vérification, en sept mouvements",
    intro:
      "Le même parcours pour chaque bien, du dépôt du dossier à sa publication. Ce qui a été contrôlé — et ce qui ne l’a pas été — reste lisible sur la fiche.",
    closing: {
      text:
        "Le détail de chaque étape, les documents regardés et les cas de refus sont décrits sur la page Services et dans la fiche de chaque bien.",
      action: "Poser une question sur la méthode",
    },
  },
  pillars: { title: "Nos convictions" },
  stats: {
    title: "Repères",
    notice:
      "Chiffres de démonstration du système pilote HOMERA : ils illustrent la structure du produit tant que l’API ne fournit pas les données réelles.",
  },
} as const;

/* ------------------------------------------------------------------
   /contact
   ------------------------------------------------------------------ */

export const CONTACT_PAGE = {
  breadcrumb: "Contact",
  hero: {
    eyebrow: "Nous joindre",
    title: "Parlons de votre projet",
    intro:
      "Une visite à organiser, une question sur une fiche, un dossier à faire vérifier ou un service à chiffrer : écrivez-nous avec la référence du bien quand vous en avez une.",
    primaryAction: "Explorer les biens",
    secondaryAction: "Voir les services",
  },
  form: {
    title: "Écrire à HOMERA",
    intro:
      "Renseignez votre besoin en quelques lignes. Si vous visez un bien précis, indiquez sa référence HOMERA.",
    introWithReference: (reference: string) =>
      `Votre demande portera sur le bien ${reference}. Complétez puis envoyez : la référence reste attachée au message.`,
  },
  channelsTitle: "Coordonnées",
  channels: [
    { icon: "map-pin", label: "Bureaux", value: "Cotonou & Abomey-Calavi, Bénin" },
    { icon: "phone", label: "Téléphone", value: "+229 01 00 00 00 00", note: "Numéro de démonstration" },
    { icon: "mail", label: "E-mail", value: "contact@homera.bj" },
    { icon: "clock", label: "Horaires", value: "Lundi – samedi · 8 h – 18 h (GMT+1)" },
  ],
  /** Objet du message déduit de `?sujet=` — mêmes clés que la page Services. */
  subjects: {
    gestion: "demande de gestion immobilière",
    maintenance: "demande de maintenance",
    demenagement: "demande de déménagement",
    travaux: "demande de travaux",
  } as Record<string, string>,
  verification: {
    title: "Faire vérifier un bien",
    text:
      "Vous avez repéré un bien ailleurs et vous voulez savoir à quoi vous avez affaire ? Envoyez-nous l’adresse, le nom du vendeur et les documents dont vous disposez : nous vous dirons ce qui est contrôlable, dans quel délai et à quel coût.",
    action: "Lire le protocole de vérification",
    href: "/a-propos#protocole",
  },
  honesty:
    "Les coordonnées affichées appartiennent au système pilote : le numéro de téléphone est un exemple et les demandes ne sont pas encore enregistrées dans une base.",
} as const;

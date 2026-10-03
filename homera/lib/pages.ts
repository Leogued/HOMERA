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

/* ------------------------------------------------------------------
   /connexion, /inscription, /mot-de-passe-oublie,
   /reinitialisation, /verification-email
   ------------------------------------------------------------------
   La copie des cinq écrans de compte. Elle assume une position claire,
   répétée partout : phase 4 ouvre réellement les comptes — création,
   connexion, rôles, confirmation d’adresse, mot de passe oublié — mais
   aucun serveur ne les reçoit encore. Ce qui est vrai est dit ; le
   reste est annoncé comme à venir, jamais simulé.
   ------------------------------------------------------------------ */

export const AUTH_PAGE = {
  connexion: {
    breadcrumb: "Se connecter",
    eyebrow: "Espace personnel",
    title: "Se connecter à votre espace",
    intro:
      "Votre compte reprend vos favoris, vos recherches enregistrées et vos dossiers en cours. Le pilote n’ayant pas encore de serveur de comptes, il vit dans ce navigateur — et il reste facultatif pour consulter le catalogue.",
    facts: [
      { label: "Compte requis", value: "Aucun" },
      { label: "Stockage", value: "Navigateur" },
      { label: "Rôles", value: "3" },
    ],
    asideTitle: "Ce qu’ouvre un compte",
    asidePoints: [
      "Favoris et recherches enregistrées, réunis sous un même compte",
      "Rôle déclaré (client, propriétaire, agent) et informations associées",
      "Confirmation d’adresse et code de secours pour le mot de passe",
    ],
    asideNote:
      "Vous n’avez pas encore de compte ? L’inscription prend une minute et demande des informations différentes selon votre rôle.",
  },
  inscription: {
    breadcrumb: "Créer un compte",
    eyebrow: "Ouvrir un compte",
    title: "Créer un compte HOMERA",
    intro:
      "Trois rôles, trois dossiers : client, propriétaire ou agent. Choisissez le vôtre — les informations demandées s’adaptent à ce que vous venez faire ici, et rien de superflu ne vous sera demandé.",
    facts: [
      { label: "Rôles", value: "3" },
      { label: "Champs", value: "Adaptés" },
      { label: "Confirmation", value: "Par code" },
    ],
    asideTitle: "Ce qu’ouvre un compte",
    asidePoints: [
      "Favoris et recherches enregistrées, retrouvés à chaque visite",
      "Suivi des demandes de visite et des dossiers, référence du bien à l’appui",
      "Alertes sur vos critères, dès qu’un bien vérifié correspond",
    ],
    asideNote:
      "Un compte n’est jamais nécessaire pour consulter le catalogue : les fiches, les filtres et le contact restent ouverts à tous.",
  },
  motDePasseOublie: {
    breadcrumb: "Mot de passe oublié",
    eyebrow: "Accès au compte",
    title: "Mot de passe oublié",
    intro:
      "Indiquez l’adresse du compte : HOMERA prépare un lien de réinitialisation et un code de secours, valables trente minutes. Sans serveur d’envoi, ils s’affichent à l’écran — et fonctionnent réellement.",
    facts: [
      { label: "Validité", value: "30 minutes" },
      { label: "Essais", value: "5" },
      { label: "Envoi d’e-mail", value: "Aucun" },
    ],
    asideTitle: "Comment ça marche",
    asidePoints: [
      "Le lien et le code ne concernent qu’un seul compte, celui de l’adresse saisie",
      "Ils expirent au bout de trente minutes et ne servent qu’une fois",
      "Le mot de passe n’est jamais stocké en clair : l’empreinte est recalculée",
    ],
    asideNote:
      "Adresse inconnue dans ce navigateur ? Le pilote ne partage pas encore les comptes entre appareils : créez le compte ici ou vérifiez l’adresse saisie.",
  },
  reinitialisation: {
    breadcrumb: "Réinitialisation",
    eyebrow: "Nouveau mot de passe",
    title: "Choisir un nouveau mot de passe",
    intro:
      "Le lien reçu à l’étape précédente ouvre cet écran — un code à six chiffres fait la même chose. La robustesse affichée correspond exactement aux règles appliquées pour accepter le mot de passe.",
    facts: [
      { label: "Longueur minimale", value: "10 caractères" },
      { label: "Validité du lien", value: "30 minutes" },
      { label: "Usage du lien", value: "Une fois" },
    ],
    asideTitle: "Un mot de passe solide",
    asidePoints: [
      "Dix caractères minimum, une majuscule, une minuscule et un chiffre",
      "Ni votre prénom, ni votre nom, ni votre adresse e-mail",
      "Un caractère spécial et quatorze caractères ou plus le renforcent encore",
    ],
    asideNote:
      "L’ancien mot de passe cesse immédiatement de fonctionner : HOMERA ne conserve qu’une empreinte, jamais le mot de passe lui-même.",
  },
  verification: {
    breadcrumb: "Vérification de l’adresse",
    eyebrow: "Confirmation d’adresse",
    title: "Confirmer votre adresse e-mail",
    intro:
      "Le code à six chiffres protège votre adresse : quinze minutes de validité, cinq essais au total. Le pilote n’envoyant aucun e-mail, il s’affiche directement sur cette page — et vous pouvez le renvoyer à tout moment.",
    facts: [
      { label: "Validité", value: "15 minutes" },
      { label: "Essais", value: "5" },
      { label: "Envoi d’e-mail", value: "Aucun" },
    ],
    asideTitle: "Pourquoi confirmer",
    asidePoints: [
      "L’adresse identifie le compte : elle sert aux alertes et aux échanges",
      "Une adresse confirmée évite les comptes ouverts par erreur de frappe",
      "Confirmer n’est pas obligatoire pour explorer le catalogue",
    ],
    asideNote:
      "Vous pouvez changer d’adresse avant de confirmer : un nouveau code est émis, l’ancien cesse d’être valable.",
  },
} as const;

/* ------------------------------------------------------------------
   /legal — trois textes courts, honnêtes sur leur statut
   ------------------------------------------------------------------ */

export const LEGAL_PAGE = {
  breadcrumb: "Informations légales",
  hero: {
    eyebrow: "Informations légales",
    title: "Mentions, confidentialité et conditions",
    intro:
      "Ces textes décrivent le fonctionnement du système pilote HOMERA. Ils seront complétés par les mentions de la société d’exploitation avant l’ouverture commerciale et l’ouverture des comptes.",
  },
  jumpNavLabel: "Sommaire légal",
  sections: [
    {
      id: "mentions",
      label: "Mentions légales",
      title: "Mentions légales",
      paragraphs: [
        "HOMERA est un projet de plateforme immobilière destiné au marché béninois. À ce stade, le site constitue un système pilote : les biens, chiffres et coordonnées présentés sont des données de démonstration et ne constituent pas des offres commerciales.",
        "Les informations d’identification de la société d’exploitation (dénomination, immatriculation RCCM, adresse du siège, contact du responsable de publication, hébergeur) seront publiées ici avant l’ouverture commerciale.",
        "Les visuels du catalogue sont des illustrations générées pour le système pilote ; ils ne représentent pas des biens réels.",
      ],
    },
    {
      id: "confidentialite",
      label: "Confidentialité",
      title: "Politique de confidentialité",
      paragraphs: [
        "Navigation publique : aucune donnée personnelle n’est collectée, aucun cookie de mesure d’audience ni traceur publicitaire n’est déposé, et aucune requête n’est faite vers un serveur d’analyse.",
        "Stockage local : trois choses seulement sont conservées dans votre navigateur, jamais transmises à HOMERA — votre préférence de thème (clair ou sombre), les biens que vous mettez en favori et les recherches que vous enregistrez depuis l’explorateur. Effacer les données du site dans les réglages de votre navigateur les supprime définitivement.",
        "Recherche : les critères que vous saisissez restent dans l’adresse de la page (paramètres d’URL) afin que vous puissiez la partager ou revenir en arrière. Ils ne sont envoyés à aucun serveur d’analyse.",
        "Prise de contact : le formulaire de la page Contact ne transmet rien automatiquement — il prépare un e-mail dans votre logiciel de messagerie. Les informations que vous choisissez d’envoyer sont alors traitées par échange de courrier.",
        "Lorsque l’espace personnel ouvrira, une politique complète (données traitées, finalités, durées de conservation, droits d’accès et de suppression) sera publiée et devra être acceptée avant toute création de compte.",
      ],
    },
    {
      id: "cgu",
      label: "Conditions générales",
      title: "Conditions générales d’utilisation",
      paragraphs: [
        "Le statut « Vérifié HOMERA » atteste d’un contrôle documentaire réalisé à la date indiquée sur la fiche : il ne constitue ni un titre de propriété, ni une garantie juridique, ni un conseil. Toute transaction relève du notaire et des autorités compétentes.",
        "Les informations publiées proviennent des propriétaires et de leurs mandataires autorisés ; elles sont confrontées aux pièces fournies et peuvent évoluer. Un bien peut être retiré de la publication à tout moment.",
        "L’utilisation du site implique le respect de ces règles, l’interdiction d’extraire massivement les contenus et l’usage loyal des outils de recherche et de prise de contact.",
      ],
    },
  ],
  /** La clé de stockage local citée dans la politique de confidentialité. */
  storageKey: "homera.visiteur.v1",
  closing: "Une question sur ces documents ?",
  closingAction: "Écrivez-nous",
} as const;

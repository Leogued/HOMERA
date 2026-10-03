import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/catalog/PageHero";

export type LegalDocumentSlug = "confidentialite" | "conditions-generales" | "mentions-legales" | "cookies" | "regles-visite" | "regles-location" | "politique-verification";
type LegalDocument = { title: string; eyebrow: string; intro: string; sections: { title: string; paragraphs: string[] }[] };

export const LEGAL_DOCUMENTS: Record<LegalDocumentSlug, LegalDocument> = {
  confidentialite: {
    title: "Politique de confidentialité",
    eyebrow: "Vos données",
    intro: "Cette politique décrit ce qui est réellement conservé par le prototype HOMERA, ce qui ne quitte pas votre appareil et les protections nécessaires avant une ouverture commerciale.",
    sections: [
      { title: "1. Responsable et périmètre", paragraphs: ["HOMERA est ici un prototype d’interface. Aucun service serveur de compte, de réservation, de messagerie ou de stockage documentaire n’est connecté.", "Les informations saisies dans les parcours interactifs sont conservées dans le stockage local du navigateur utilisé pour la démonstration. Elles ne sont pas transmises à un serveur par HOMERA."] },
      { title: "2. Données conservées localement", paragraphs: ["Le navigateur peut conserver un compte de démonstration, des favoris, recherches, préférences, demandes de visite, dossiers de location, conversations et états de formulaire. Le stockage peut être supprimé par l’utilisateur depuis les réglages du navigateur.", "Ne saisissez pas de données sensibles, de justificatif d’identité ou de document original dans le prototype. Le wizard de dépôt n’enregistre que le nom des fichiers sélectionnés, jamais le fichier lui-même."] },
      { title: "3. Cookies et traceurs", paragraphs: ["Aucun outil publicitaire ni mesure d’audience tiers n’est installé dans le parcours pilote. Le thème peut utiliser le stockage local pour mémoriser une préférence.", "Lors de l’ouverture du service réel, les traceurs strictement nécessaires et les outils de mesure feront l’objet d’une information et, lorsque requis, d’un consentement séparé."] },
      { title: "4. Vos choix", paragraphs: ["Vous pouvez retirer vos favoris, effacer les données locales du site ou supprimer le stockage du domaine dans votre navigateur. Ces opérations ne sont pas synchronisées entre appareils.", "Les demandes d’accès, de rectification, d’opposition ou de suppression devront être adressées au responsable légal de la plateforme dès qu’il sera nommé pour le service commercial."] },
      { title: "5. Avant la mise en production", paragraphs: ["Cette notice devra être revue par le responsable du traitement et complétée avec les durées de conservation, les destinataires, les bases juridiques, les sous-traitants, les coordonnées de contact et les droits applicables au Bénin et dans les pays desservis."] },
    ],
  },
  "conditions-generales": {
    title: "Conditions générales d’utilisation",
    eyebrow: "Cadre d’utilisation",
    intro: "Ces conditions sont une base de lecture du prototype HOMERA; elles ne constituent pas un contrat commercial final.",
    sections: [
      { title: "1. Nature du service", paragraphs: ["HOMERA présente un parcours immobilier de démonstration : recherche, fiches de biens, gestion de favoris et maquettes d’espaces personnels.", "Les annonces et données chiffrées visibles sont illustratives. Elles ne valent ni offre ferme, ni garantie de disponibilité, ni constat juridique."] },
      { title: "2. Comptes et sécurité", paragraphs: ["Les comptes du pilote sont stockés dans le navigateur et ne sont pas partagés entre appareils. Le mot de passe est haché localement, mais ce mécanisme ne remplace pas un service d’identité de production.", "L’utilisateur reste responsable de la confidentialité de son appareil et ne doit pas y saisir de pièces sensibles dans le cadre de cette démonstration."] },
      { title: "3. Biens, visites et demandes", paragraphs: ["Une demande de visite ou de location enregistrée dans l’interface n’est pas transmise à un propriétaire ou à un agent. Aucun rendez-vous n’est confirmé et aucune candidature n’est juridiquement déposée.", "Tout prix, mandat, statut de vérification et document doit être vérifié directement auprès des parties et des autorités compétentes."] },
      { title: "4. Responsabilité et évolution", paragraphs: ["Les contenus, parcours et fonctionnalités peuvent évoluer. Avant ouverture commerciale, les conditions devront préciser l’identité de l’exploitant, le droit applicable, les responsabilités, les frais, les modalités de réclamation et de résiliation."] },
    ],
  },
  "mentions-legales": {
    title: "Mentions légales",
    eyebrow: "Éditeur du service",
    intro: "Les mentions ci-dessous indiquent honnêtement le statut du pilote. Les coordonnées de l’entité d’exploitation devront être ajoutées avant toute ouverture au public.",
    sections: [
      { title: "Éditeur", paragraphs: ["HOMERA est une plateforme immobilière en cours de conception, présentée ici dans un environnement de démonstration.", "Raison sociale, adresse du siège, forme juridique, numéro d’immatriculation, responsable de publication et coordonnées de contact : à compléter par l’entité exploitante avant mise en production."] },
      { title: "Hébergement", paragraphs: ["Ce déploiement de démonstration est hébergé dans un environnement technique de prévisualisation. Les informations définitives sur l’hébergeur, son adresse et ses coordonnées seront publiées pour le service commercial."] },
      { title: "Contenus", paragraphs: ["Les textes, identifiants, photographies et indicateurs du pilote peuvent être fictifs ou illustratifs. Ils ne constituent ni une offre immobilière réelle, ni un avis juridique."] },
    ],
  },
  cookies: {
    title: "Politique relative aux cookies",
    eyebrow: "Stockage du navigateur",
    intro: "Le prototype limite les traceurs et utilise le stockage local uniquement pour conserver l’état de démonstration et quelques préférences.",
    sections: [
      { title: "1. Stockage local fonctionnel", paragraphs: ["Les favoris et recherches peuvent être conservés dans localStorage sous la clé homera.visiteur.v1. Le thème, le compte de démonstration, les dossiers, visites et demandes utilisent des clés homera.* propres au navigateur.", "Ces entrées ne sont pas des cookies HTTP et ne sont pas envoyées automatiquement à un serveur. Elles peuvent être effacées depuis les réglages du navigateur."] },
      { title: "2. Mesure d’audience et publicité", paragraphs: ["Aucune mesure d’audience ni publicité ciblée n’est activée dans ce prototype.", "Toute technologie non strictement nécessaire devra être documentée et recueillir le consentement requis avant son activation."] },
      { title: "3. Paramétrage", paragraphs: ["Vous pouvez bloquer ou supprimer le stockage local depuis le navigateur. Certaines fonctions de démonstration (connexion, favoris, brouillons) ne pourront alors plus conserver leur état."] },
    ],
  },
  "regles-visite": {
    title: "Règles de visite",
    eyebrow: "Préparer un rendez-vous",
    intro: "Les règles ci-dessous sont des principes de sécurité proposés pour la future expérience. Dans le prototype, la demande n’est pas envoyée et aucun rendez-vous n’est réellement confirmé.",
    sections: [
      { title: "1. Confirmation préalable", paragraphs: ["Une date et un créneau saisis constituent une préférence. Attendez une confirmation explicite du représentant avant de vous déplacer.", "Vérifiez que l’agent possède une autorisation active pour la référence exacte du bien et demandez à consulter l’original du mandat."] },
      { title: "2. Frais et sécurité", paragraphs: ["Aucun frais de déplacement ou de visite ne doit être demandé sans information préalable, claire et vérifiable.", "Ne communiquez pas de code bancaire, mot de passe, document original ou acompte avant d’avoir identifié le propriétaire et les conditions écrites."] },
      { title: "3. Annulation et retour", paragraphs: ["Prévenez le représentant si vous ne pouvez plus vous présenter. Après la visite, le parcours HOMERA prévoit une notation et un commentaire sur le bien et l’accueil reçu."] },
    ],
  },
  "regles-location": {
    title: "Règles de location",
    eyebrow: "Candidature & bail",
    intro: "Ces repères décrivent le parcours souhaité de location; ils ne remplacent pas la réglementation applicable ni les conseils d’un professionnel.",
    sections: [
      { title: "1. Après la visite", paragraphs: ["La candidature intervient après une visite terminée. Le propriétaire étudie les informations déclarées et communique sa décision par un canal confirmé.", "Ne transmettez que les pièces nécessaires, par un canal sécurisé. Le prototype ne permet aucun téléversement de justificatif."] },
      { title: "2. Contrat et signature", paragraphs: ["Le contrat doit identifier les parties, le logement, le montant, les charges, la durée, les conditions de dépôt, l’état des lieux et la date d’entrée.", "Le document affiché dans le pilote est un exemple non valable. La signature électronique réelle nécessitera un prestataire conforme et une vérification d’identité."] },
      { title: "3. Clés et entrée", paragraphs: ["La remise des clés doit être accompagnée d’un état des lieux daté et signé, après vérification du contrat et des conditions d’entrée."] },
    ],
  },
  "politique-verification": {
    title: "Politique de vérification HOMERA",
    eyebrow: "Confiance & traçabilité",
    intro: "Le statut « Vérifié HOMERA » décrit un contrôle documentaire daté. Il ne constitue ni un titre foncier ni une garantie de propriété ou de disponibilité.",
    sections: [
      { title: "1. Pièces et identité", paragraphs: ["Le contrôle prévu rapproche l’identité du propriétaire déclaré, les pièces de propriété, les informations de l’annonce et les éléments de localisation.", "Le processus doit déterminer l’autorité émettrice, la validité, la concordance et les limites des documents présentés."] },
      { title: "2. Représentant autorisé", paragraphs: ["Un agent ne doit accéder qu’aux biens pour lesquels un mandat écrit est enregistré. Le mandat précise le bien, le périmètre d’action, la date de début et l’expiration.", "Une vérification publique doit porter sur le matricule d’agent et la référence exacte du bien; toute révocation doit être propagée sans délai."] },
      { title: "3. Décisions et historique", paragraphs: ["L’administrateur peut valider, demander une modification, refuser ou suspendre. Chaque action devra être journalisée avec son auteur, sa date, son motif et les pièces examinées.", "Le contrôle HOMERA ne remplace pas l’examen d’un notaire, du cadastre, de l’administration ou d’un autre professionnel compétent."] },
      { title: "4. Limites du pilote", paragraphs: ["Les pièces, statuts, dates, identifiants et autorisations affichés dans le prototype sont des exemples. Aucune vérification foncière réelle n’a été réalisée par cette maquette."] },
    ],
  },
};

export function LegalDocument({ slug }: { slug: LegalDocumentSlug }) {
  const document = LEGAL_DOCUMENTS[slug];
  return <>
    <PageHero crumbs={[{ label: "Accueil", href: "/" }, { label: "Informations légales", href: "/legal" }, { label: document.title }]} eyebrow={document.eyebrow} title={document.title} intro={document.intro} facts={[{ label: "Version", value: "Prototype HOMERA" }, { label: "Mise à jour", value: "3 octobre 2026" }, { label: "Statut", value: "À compléter avant ouverture" }]} />
    <main className="mx-auto max-w-3xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">{document.sections.map((section, index) => <section key={section.title} className="scroll-mt-28"><h2 className="font-serif text-display-xs">{section.title}</h2><div className="mt-4 space-y-4 text-body-sm leading-relaxed text-muted">{section.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}</div>{index === 0 && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-info/25 bg-info/[0.05] p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" /><p className="text-caption leading-relaxed text-muted">Document de travail pour la phase pilote. Les mentions d’entreprise, délais, procédures et coordonnées doivent être validés par l’exploitant et un conseil juridique.</p></div>}</section>)}<nav aria-label="Autres pages légales" className="border-t border-border pt-6"><p className="text-caption font-semibold uppercase tracking-[0.15em] text-muted">Informations liées</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries(LEGAL_DOCUMENTS).filter(([key]) => key !== slug).map(([key, entry]) => <Link key={key} href={legalHref(key as LegalDocumentSlug)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-caption font-medium hover:border-homera-terracotta hover:text-homera-terracotta">{entry.title}<ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>)}</div></nav></main>
  </>;
}

export function legalHref(slug: LegalDocumentSlug): string {
  if (slug === "mentions-legales") return "/mentions-legales";
  if (slug === "cookies") return "/cookies";
  if (slug === "regles-visite") return "/regles-visite";
  if (slug === "regles-location") return "/regles-location";
  if (slug === "politique-verification") return "/politique-verification";
  return `/legal/${slug}`;
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/catalog/PageHero";
/* ================================================================== /legal — MENTIONS, CONFIDENTIALITÉ, CONDITIONS ------------------------------------------------------------------ Trois textes courts, honnêtes sur leur statut : le système pilote n’enregistre aujourd’hui aucune donnée personnelle (pas de compte, pas de formulaire serveur, pas de mesure d’audience). Les mentions décrivent ce qui existe réellement, et annoncent ce qui devra être rédigé avant l’ouverture de l’espace connecté. ================================================================== */ export const metadata: Metadata =
  {
    title: "Mentions légales, confidentialité et conditions | HOMERA",
    description:
      "Mentions légales, politique de confidentialité et conditions générales d’utilisation de la plateforme HOMERA (système pilote).",
  };
const SECTIONS = [
  { id: "mentions", label: "Mentions légales" },
  { id: "confidentialite", label: "Confidentialité" },
  { id: "cgu", label: "Conditions générales" },
];
export default function LegalPage() {
  return (
    <>
      {" "}
      <PageHero
        crumbs={[{ label: "Accueil", href: "/" }, { label: "Informations légales" }]}
        eyebrow="Informations légales"
        title="Mentions, confidentialité et conditions"
        intro="Ces textes décrivent le fonctionnement du système pilote HOMERA. Ils seront complétés par les mentions de la société d’exploitation avant l’ouverture commerciale et l’ouverture des comptes."
      />{" "}
      <nav aria-label="Sommaire légal" className="border-b border-border bg-card/40">
        {" "}
        <ul className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 py-5 sm:px-6 lg:px-8">
          {" "}
          {SECTIONS.map((section) => (
            <li key={section.id}>
              {" "}
              <a
                href={`#${section.id}`}
                className="homera-press inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
              >
                {" "}
                {section.label}{" "}
              </a>{" "}
            </li>
          ))}{" "}
        </ul>{" "}
      </nav>{" "}
      <div className="mx-auto max-w-3xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
        {" "}
        <section id="mentions" aria-labelledby="mentions-titre" className="scroll-mt-28">
          {" "}
          <h2 id="mentions-titre" className="font-serif text-display-sm">
            Mentions légales
          </h2>{" "}
          <div className="mt-5 space-y-4 text-body-sm leading-relaxed text-muted">
            {" "}
            <p>
              {" "}
              HOMERA est un projet de plateforme immobilière destiné au marché béninois. À ce stade, le site constitue
              un système pilote : les biens, chiffres et coordonnées présentés sont des données de démonstration et ne
              constituent pas des offres commerciales.{" "}
            </p>{" "}
            <p>
              {" "}
              Les informations d’identification de la société d’exploitation (dénomination, immatriculation RCCM,
              adresse du siège, contact du responsable de publication, hébergeur) seront publiées ici avant
              l’ouverture commerciale.{" "}
            </p>{" "}
            <p>
              {" "}
              Les visuels du catalogue sont des illustrations générées pour le système pilote ; ils ne représentent
              pas des biens réels.{" "}
            </p>{" "}
          </div>{" "}
        </section>{" "}
        <section id="confidentialite" aria-labelledby="confidentialite-titre" className="scroll-mt-28">
          {" "}
          <h2 id="confidentialite-titre" className="font-serif text-display-sm">
            Politique de confidentialité
          </h2>{" "}
          <div className="mt-5 space-y-4 text-body-sm leading-relaxed text-muted">
            {" "}
            <p>
              {" "}
              Navigation publique : aucune donnée personnelle n’est collectée, aucun cookie de mesure d’audience n’est
              déposé. Seul un stockage local du navigateur conserve votre préférence de thème (clair ou sombre).{" "}
            </p>{" "}
            <p>
              {" "}
              Recherche : les critères que vous saisissez restent dans l’adresse de la page (paramètres d’URL) afin
              que vous puissiez la partager ou revenir en arrière. Ils ne sont envoyés à aucun serveur d’analyse.{" "}
            </p>{" "}
            <p>
              {" "}
              Prise de contact : le formulaire de la page Contact ne transmet rien automatiquement — il prépare un
              e-mail dans votre logiciel de messagerie. Les informations que vous choisissez d’envoyer sont alors
              traitées par échange de courrier.{" "}
            </p>{" "}
            <p>
              {" "}
              Lorsque l’espace personnel ouvrira, une politique complète (données traitées, finalités, durées de
              conservation, droits d’accès et de suppression) sera publiée et devra être acceptée avant toute création
              de compte.{" "}
            </p>{" "}
          </div>{" "}
        </section>{" "}
        <section id="cgu" aria-labelledby="cgu-titre" className="scroll-mt-28">
          {" "}
          <h2 id="cgu-titre" className="font-serif text-display-sm">
            Conditions générales d’utilisation
          </h2>{" "}
          <div className="mt-5 space-y-4 text-body-sm leading-relaxed text-muted">
            {" "}
            <p>
              {" "}
              Le statut « Vérifié HOMERA » atteste d’un contrôle documentaire réalisé à la date indiquée sur la fiche
              : il ne constitue ni un titre de propriété, ni une garantie juridique, ni un conseil. Toute transaction
              relève du notaire et des autorités compétentes.{" "}
            </p>{" "}
            <p>
              {" "}
              Les informations publiées proviennent des propriétaires et de leurs mandataires autorisés ; elles sont
              confrontées aux pièces fournies et peuvent évoluer. Un bien peut être retiré de la publication à tout
              moment.{" "}
            </p>{" "}
            <p>
              {" "}
              L’utilisation du site implique le respect de ces règles, l’interdiction d’extraire massivement les
              contenus et l’usage loyal des outils de recherche et de prise de contact.{" "}
            </p>{" "}
          </div>{" "}
        </section>{" "}
        <p className="border-t border-border pt-8 text-note leading-relaxed text-muted">
          {" "}
          Une question sur ces documents ?{" "}
          <Link href="/contact" className="homera-underline font-medium homera-accent-ink">
            {" "}
            Écrivez-nous{" "}
          </Link>{" "}
          .{" "}
        </p>{" "}
      </div>{" "}
    </>
  );
}

import Link from "next/link";
import { ArrowRight, Compass, FileSearch } from "lucide-react";
import { Breadcrumbs } from "@/components/catalog/PageHero";
import { PROJECT_PAGES } from "@/lib/nav";
/* ================================================================== HOMERA — CONTENU DE LA PAGE INTROUVABLE ------------------------------------------------------------------ Un lien mort ne doit pas être une impasse : on rappelle où l’on est, on propose les destinations réellement utiles, et on laisse le pied de page (déjà présent sur les pages publiques) jouer son rôle. Deux contextes, un seul texte honnête : • « page » — l’adresse ne correspond à aucune route ; • « fiche » — le bien demandé n’existe pas ou n’est plus publié. ================================================================== */ const CONTEXTS =
  {
    page: {
      eyebrow: "Erreur 404",
      title: "Cette page n’existe pas — ou n’existe plus.",
      intro: "Le lien est peut-être incomplet, ou la page a été remplacée depuis. Voici par où continuer :",
      note: "Vous cherchiez un bien précis ?",
    },
    fiche: {
      eyebrow: "Fiche introuvable",
      title: "Ce bien n’est pas — ou n’est plus — publié au catalogue.",
      intro:
        "La référence est peut-être erronée, ou le bien a été retiré de la publication après vérification. Rien n’est laissé en ligne « au cas où » : voici les biens réellement publiés aujourd’hui.",
      note: "Vous détenez une référence HOMERA ?",
    },
  } as const;
export function NotFoundView({ context = "page" }: { context?: keyof typeof CONTEXTS }) {
  const copy = CONTEXTS[context];
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      {" "}
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: context === "fiche" ? "Fiche introuvable" : "Page introuvable" },
        ]}
      />{" "}
      <p className="mt-8 inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.24em] homera-accent-ink">
        {" "}
        {context === "fiche" ? (
          <FileSearch className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Compass className="h-4 w-4" aria-hidden="true" />
        )}{" "}
        {copy.eyebrow}{" "}
      </p>{" "}
      <h1 className="mt-4 font-serif text-display-md sm:text-display-lg">{copy.title}</h1>{" "}
      <p className="mt-4 max-w-xl text-body-sm leading-relaxed text-muted sm:text-body">{copy.intro}</p>{" "}
      <ul className="mt-8 flex flex-wrap gap-3">
        {" "}
        <li>
          {" "}
          <Link
            href="/explorer"
            className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white transition-colors "
          >
            {" "}
            Explorer tous les biens <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
          </Link>{" "}
        </li>{" "}
        {PROJECT_PAGES.map((project) => (
          <li key={project.slug}>
            {" "}
            <Link
              href={`/${project.slug}`}
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-border bg-card px-5 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              {" "}
              {project.navLabel}{" "}
            </Link>{" "}
          </li>
        ))}{" "}
      </ul>{" "}
      <p className="mt-8 text-note text-muted">
        {" "}
        {copy.note}{" "}
        <Link href="/contact" className="homera-underline font-medium homera-accent-ink">
          {" "}
          Indiquez-nous sa référence{" "}
        </Link>{" "}
        — nous vous dirons s’il est toujours publié.{" "}
      </p>{" "}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AuthAsideTitle, AuthBenefits, AuthShell, AuthLink } from "@/components/auth/AuthPanel";
import { ConnexionView } from "@/components/auth/ConnexionView";
import { PilotNote, type StatusTone } from "@/components/auth/StatusNote";
import { AUTH_PAGE } from "@/lib/pages";
import { FORGOT_HREF, safeReturnTo, SIGNUP_HREF } from "@/lib/nav";

/* ==================================================================
   /connexion — SE CONNECTER
   ------------------------------------------------------------------
   L’écran a deux visages : le formulaire quand aucune session n’existe,
   la fiche du compte quand une session est ouverte. Le tout est rendu
   côté client (la session vit dans le navigateur), mais la page reste
   servie par le serveur avec sa copie, son fil d’Ariane et ses liens.

   `?etat=` transporte le résultat d’une étape précédente — mot de passe
   réinitialisé, adresse confirmée, session fermée — plutôt que de le
   perdre en chemin. Aucun texte n’est affiché sans qu’un état réel y
   corresponde : une adresse inconnue n’affiche rien.
   ================================================================== */

export const metadata: Metadata = {
  title: "Se connecter — HOMERA",
  description:
    "Connectez-vous à votre espace HOMERA : favoris, recherches enregistrées, rôle et confirmation d’adresse. Le compte du pilote est conservé dans votre navigateur.",
  robots: { index: false, follow: true },
};

const COPY = AUTH_PAGE.connexion;

/** Résultats d’étape acceptés en paramètre — tout le reste est ignoré. */
const NOTICES: Record<string, { tone: StatusTone; title: string; body: string }> = {
  reinitialise: {
    tone: "success",
    title: "Mot de passe modifié",
    body:
      "Le nouveau mot de passe est actif et l’ancien lien de réinitialisation a été consommé. Connectez-vous avec ce mot de passe.",
  },
  verifie: {
    tone: "success",
    title: "Adresse confirmée",
    body:
      "Votre adresse e-mail est vérifiée : le compte est complet du point de vue du pilote. Vos favoris et recherches sont inchangés.",
  },
  deconnecte: {
    tone: "info",
    title: "Session fermée",
    body:
      "Vous avez été déconnecté de ce navigateur. Vos favoris et vos recherches enregistrées, eux, restent en place.",
  },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.etat;
  const key = Array.isArray(raw) ? raw[0] : raw;
  const notice = key && NOTICES[key] ? NOTICES[key] : null;
  const redirectTo = safeReturnTo(params.next);

  return (
    <AuthShell
      crumb={COPY.breadcrumb}
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      intro={COPY.intro}
      facts={[...COPY.facts]}
      aside={
        <div className="space-y-8">
          <div>
            <AuthAsideTitle>{COPY.asideTitle}</AuthAsideTitle>
            <AuthBenefits items={COPY.asidePoints} />
          </div>
          <div className="rounded-card border border-border bg-card/60 p-4">
            <p className="text-note leading-relaxed text-muted">{COPY.asideNote}</p>
            <div className="mt-3 flex flex-wrap gap-x-6">
              <AuthLink href={SIGNUP_HREF}>Créer un compte</AuthLink>
              <Link
                href={FORGOT_HREF}
                className="homera-underline inline-flex min-h-10 items-center gap-1.5 text-note font-medium homera-accent-ink"
              >
                Mot de passe oublié
              </Link>
            </div>
          </div>
          <PilotNote />
        </div>
      }
    >
      <ConnexionView notice={notice} redirectTo={redirectTo} />
    </AuthShell>
  );
}

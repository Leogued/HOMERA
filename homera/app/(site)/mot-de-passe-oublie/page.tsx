import type { Metadata } from "next";
import { AuthAsideTitle, AuthBenefits, AuthLink, AuthShell } from "@/components/auth/AuthPanel";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PilotNote } from "@/components/auth/StatusNote";
import { AUTH_PAGE } from "@/lib/pages";
import { RESET_HREF } from "@/lib/nav";

/* ==================================================================
   /mot-de-passe-oublie — DEMANDER UN LIEN
   ------------------------------------------------------------------
   Un seul champ, puis un lien et un code réellement créés. Aucun
   e-mail ne part (le pilote n’a pas de serveur d’envoi) : les deux
   s’affichent à l’écran, avec leur durée de validité.
   ================================================================== */

export const metadata: Metadata = {
  title: "Mot de passe oublié — HOMERA",
  description:
    "Préparez la réinitialisation du mot de passe de votre compte HOMERA : un lien et un code à six chiffres, valables trente minutes, affichés à l’écran.",
  robots: { index: false, follow: true },
};

const COPY = AUTH_PAGE.motDePasseOublie;

export default function MotDePasseOubliePage() {
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
            <div className="mt-3">
              <AuthLink href={RESET_HREF}>J’ai déjà un lien ou un code</AuthLink>
            </div>
          </div>
          <PilotNote>
            Un pilote sans serveur ne peut pas envoyer d’e-mail — et ne fait pas semblant. Le lien affiché est le
            vrai lien : il ouvre /reinitialisation avec un jeton vérifié.
          </PilotNote>
        </div>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

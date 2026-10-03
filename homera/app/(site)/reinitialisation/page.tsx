import type { Metadata } from "next";
import Link from "next/link";
import { AuthAsideTitle, AuthBenefits, AuthShell } from "@/components/auth/AuthPanel";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { StatusNote } from "@/components/auth/StatusNote";
import { AUTH_PAGE } from "@/lib/pages";
import { FORGOT_HREF } from "@/lib/nav";
import { RESET_PARAM } from "@/lib/accounts";

/* ==================================================================
   /reinitialisation — CHOISIR UN NOUVEAU MOT DE PASSE
   ------------------------------------------------------------------
   Le jeton arrive par l’adresse (`?jeton=…`), comme dans un vrai
   parcours : la page le transmet au formulaire, qui le fait vérifier
   contre le compte concerné. Sans jeton, le code à six chiffres prend
   le relais — c’est la voie de secours quand l’onglet a été fermé.
   ================================================================== */

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe — HOMERA",
  description:
    "Choisissez un nouveau mot de passe pour votre compte HOMERA : lien à usage unique, code à six chiffres en secours, robustesse vérifiée avant enregistrement.",
  robots: { index: false, follow: true },
};

const COPY = AUTH_PAGE.reinitialisation;

export default async function ReinitialisationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params[RESET_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const token = typeof value === "string" && /^[a-f0-9]{16,64}$/i.test(value) ? value : undefined;

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
          </div>
          {!token && (
            <StatusNote tone="warning" title="Aucun lien dans l’adresse">
              <span>
                Cette page a été ouverte sans jeton. Saisissez le code à six chiffres préparé à l’étape
                précédente, ou{" "}
                <Link href={FORGOT_HREF} className="homera-underline font-medium homera-accent-ink">
                  demandez un nouveau lien
                </Link>
                .
              </span>
            </StatusNote>
          )}
        </div>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}

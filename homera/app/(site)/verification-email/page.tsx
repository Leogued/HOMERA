import type { Metadata } from "next";
import { AuthAsideTitle, AuthBenefits, AuthShell } from "@/components/auth/AuthPanel";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { PilotNote } from "@/components/auth/StatusNote";
import { AUTH_PAGE } from "@/lib/pages";
import { safeReturnTo } from "@/lib/nav";

/* ==================================================================
   /verification-email — CONFIRMER L’ADRESSE DU COMPTE
   ------------------------------------------------------------------
   Le code est émis à l’inscription (et à chaque renvoi), il expire au
   bout de quinze minutes et tolère cinq essais. Comme aucun e-mail ne
   peut partir, il s’affiche sur cette page : c’est la seule concession
   du pilote, et elle est écrite noir sur crème.
   ================================================================== */

export const metadata: Metadata = {
  title: "Vérification de l’adresse — HOMERA",
  description:
    "Confirmez l’adresse e-mail de votre compte HOMERA avec un code à six chiffres : quinze minutes de validité, cinq essais, renvoi immédiat du code.",
  robots: { index: false, follow: true },
};

const COPY = AUTH_PAGE.verification;

export default async function VerificationEmailPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
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
          </div>
          <PilotNote>
            Le jour où HOMERA disposera d’un service d’envoi, cet encadré disparaîtra et le code partira par
            e-mail. La vérification, sa durée et son compteur d’essais, ne changeront pas.
          </PilotNote>
        </div>
      }
    >
      <VerifyEmailForm redirectTo={redirectTo} />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import { AuthAsideTitle, AuthBenefits, AuthShell } from "@/components/auth/AuthPanel";
import { SignUpAside, SignUpForm } from "@/components/auth/SignUpForm";
import { PilotNote } from "@/components/auth/StatusNote";
import { roleFromParam, type AccountRole } from "@/lib/auth";
import { AUTH_PAGE } from "@/lib/pages";

/* ==================================================================
   /inscription — OUVRIR UN COMPTE
   ------------------------------------------------------------------
   Le rôle se choisit dans l’adresse (`?role=proprietaire`) : un lien
   d’inscription peut donc être partagé en visant directement le bon
   dossier, et le rechargement de la page conserve le choix.

   Les informations demandées changent réellement selon le rôle — le
   formulaire est construit à partir des mêmes descriptions de champs
   que celles qui servent à valider (lib/auth.ts).
   ================================================================== */

export const metadata: Metadata = {
  title: "Créer un compte — HOMERA",
  description:
    "Ouvrez un compte client, propriétaire ou agent sur HOMERA : le formulaire s’adapte au rôle choisi et la confirmation d’adresse se fait par code.",
  robots: { index: false, follow: true },
};

const COPY = AUTH_PAGE.inscription;

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.role) ? params.role[0] : params.role;
  const initialRole: AccountRole = roleFromParam(requested) ?? "client";

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
          <SignUpAside />
          <PilotNote>
            Le compte créé ici ne quitte pas ce navigateur : ni base de données, ni envoi d’e-mail. Le mot de passe
            y est conservé sous forme d’empreinte PBKDF2-SHA-256, jamais en clair.
          </PilotNote>
        </div>
      }
    >
      <SignUpForm initialRole={initialRole} />
    </AuthShell>
  );
}

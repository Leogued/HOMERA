"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, MailPlus, RefreshCw } from "lucide-react";
import { AuthLink, AuthPanel } from "@/components/auth/AuthPanel";
import { CodeField } from "@/components/auth/CodeField";
import { Field } from "@/components/auth/Field";
import { PilotCode, PilotNote, StatusNote } from "@/components/auth/StatusNote";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { VERIFICATION_TTL_MINUTES, maskEmail, rolesLabel } from "@/lib/auth";

/* ==================================================================
   HOMERA — VÉRIFICATION DE L’ADRESSE E-MAIL
   ------------------------------------------------------------------
   Le code existe vraiment, il expire au bout de quinze minutes et cinq
   essais sont comptés. Ce qui change par rapport à une plateforme
   classique : personne ne peut l’envoyer, donc il s’affiche à l’écran —
   et l’écran le dit. Le jour où un serveur d’envoi existe, seul cet
   encadré disparaît ; la vérification, elle, ne bouge pas.
   ================================================================== */

export function VerifyEmailForm({ redirectTo }: { redirectTo?: string | null }) {
  const { ready, account, pendingCode, verifyEmail, resendVerification, changeEmail } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<{ tone: "error" | "success" | "warning"; title: string; body: string } | null>(
    null,
  );
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();

  useEffect(() => {
    if (ready && redirectTo && (account?.emailVerified || verified)) router.replace(redirectTo);
  }, [account?.emailVerified, ready, redirectTo, router, verified]);

  if (!ready) {
    return (
      <AuthPanel title="Confirmer votre adresse">
        <div aria-busy="true" aria-live="polite" className="space-y-4">
          <p className="sr-only">Lecture de la session en cours…</p>
          <div className="homera-skeleton h-14 w-full" />
          <div className="homera-skeleton h-12 w-2/3" />
        </div>
      </AuthPanel>
    );
  }

  if (!account) {
    return (
      <AuthPanel
        title="Confirmer votre adresse"
        intro="Cette étape concerne le compte connecté dans ce navigateur."
      >
        <div className="space-y-6">
          <StatusNote tone="info" title="Aucun compte connecté">
            Ouvrez votre session pour confirmer l’adresse du compte, ou créez un compte si vous n’en avez pas
            encore.
          </StatusNote>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <AuthLink href={redirectTo ? `/connexion?next=${encodeURIComponent(redirectTo)}` : "/connexion"}>Se connecter</AuthLink>
            <AuthLink href="/inscription">Créer un compte</AuthLink>
          </div>
        </div>
      </AuthPanel>
    );
  }

  if (account.emailVerified || verified) {
    return (
      <AuthPanel
        title="Adresse confirmée"
        intro={`${account.email} a bien été confirmée. Le compte est complet du point de vue du pilote.`}
      >
        <div className="space-y-6">
          <StatusNote tone="success" title="Vérification terminée">
            Votre espace reprend désormais tout : favoris, recherches enregistrées et vos rôles —{" "}
            <strong className="font-semibold">{rolesLabel(account.roles)}</strong>.
          </StatusNote>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <AuthLink href={redirectTo ?? "/connexion?etat=verifie"}>Voir mon espace</AuthLink>
            <AuthLink href="/explorer">Explorer les biens</AuthLink>
          </div>
          <PilotNote />
        </div>
      </AuthPanel>
    );
  }

  const activeCode = pendingCode?.email === account.email ? pendingCode : null;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(undefined);
    setPending(true);
    const outcome = await verifyEmail(code);
    setPending(false);
    if (!outcome.ok) {
      setError(outcome.fields?.code);
      setStatus({ tone: "error", title: "Adresse non confirmée.", body: outcome.message });
      document.getElementById("verification-code")?.focus();
      return;
    }
    if (redirectTo) router.replace(redirectTo);
    else setVerified(true);
  };

  const resend = async () => {
    setStatus(null);
    setCode("");
    const outcome = await resendVerification();
    if (!outcome.ok) {
      setStatus({ tone: "warning", title: "Nouveau code impossible", body: outcome.message });
      return;
    }
    setStatus({
      tone: "success",
      title: "Nouveau code émis",
      body: `Un code frais vient d’être créé pour ${maskEmail(account.email)} : il remplace le précédent et reste valable ${VERIFICATION_TTL_MINUTES} minutes.`,
    });
    document.getElementById("verification-code")?.focus();
  };

  const submitNewEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError(undefined);
    const outcome = await changeEmail(newEmail);
    if (!outcome.ok) {
      setEmailError(outcome.fields?.email);
      setStatus({ tone: "error", title: "Adresse inchangée.", body: outcome.message });
      return;
    }
    setStatus({
      tone: "success",
      title: "Adresse mise à jour",
      body: `Le compte utilise maintenant ${newEmail}. Le code affiché correspond à cette nouvelle adresse.`,
    });
    setNewEmail("");
    setChanging(false);
    setCode("");
    document.getElementById("verification-code")?.focus();
  };

  return (
    <AuthPanel
      title="Confirmer votre adresse e-mail"
      intro={`Un code à six chiffres protège l’adresse ${maskEmail(account.email)}. Saisissez-le pour terminer l’ouverture du compte.`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <AuthLink href={redirectTo ?? "/connexion"}>Aller à mon espace</AuthLink>
          <AuthLink href="/explorer">Explorer sans attendre</AuthLink>
        </div>
      }
    >
      <div className="space-y-6">
        {activeCode ? (
          <PilotCode code={activeCode.code} />
        ) : (
          <PilotNote>
            Le code n’est plus affiché sur cet écran — un code se périme, et l’affichage disparaît avec lui.
            Demandez un nouveau code ci-dessous : il s’affichera immédiatement.
          </PilotNote>
        )}

        {status && (
          <StatusNote tone={status.tone} title={status.title}>
            {status.body}
          </StatusNote>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <CodeField
            id="verification-code"
            label="Code de confirmation"
            value={code}
            error={error}
            hint={`Six chiffres, valables ${VERIFICATION_TTL_MINUTES} minutes, cinq essais au total.`}
            onChange={setCode}
          />
          <SubmitButton
            label="Confirmer mon adresse"
            pendingLabel="Vérification…"
            pending={pending}
            icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={resend}
            className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Renvoyer un code
          </button>
          <button
            type="button"
            onClick={() => setChanging((current) => !current)}
            aria-expanded={changing}
            aria-controls="verification-nouvelle-adresse"
            className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            <MailPlus className="h-4 w-4" aria-hidden="true" />
            Changer d’adresse
          </button>
        </div>

        {changing && (
          <form id="verification-nouvelle-adresse" onSubmit={submitNewEmail} noValidate className="space-y-5">
            <Field id="verification-email" label="Nouvelle adresse e-mail" error={emailError} required>
              {(describedBy) => (
                <input
                  id="verification-email"
                  name="email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="nouvelle@adresse.com"
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={describedBy}
                  className={`h-12 w-full rounded-input border bg-background px-4 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-light ${
                    emailError
                      ? "border-error/70"
                      : "border-border hover:border-homera-terracotta/50 focus:border-homera-terracotta/70"
                  }`}
                />
              )}
            </Field>
            <SubmitButton label="Utiliser cette adresse" pendingLabel="Mise à jour…" variant="outline" />
            <p className="text-caption leading-relaxed text-muted">
              Le changement d’adresse remet la vérification à zéro : un nouveau code est émis pour la nouvelle
              adresse, et l’ancien cesse d’être valable.
            </p>
          </form>
        )}

        <p className="text-caption leading-relaxed text-muted">
          Vous pouvez continuer à utiliser le catalogue sans confirmer tout de suite.{" "}
          <Link href="/explorer" className="homera-underline font-medium homera-accent-ink">
            Explorer les biens vérifiés
          </Link>
          .
        </p>
      </div>
    </AuthPanel>
  );
}

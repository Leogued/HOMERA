"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { AuthLink, AuthPanel } from "@/components/auth/AuthPanel";
import { Field } from "@/components/auth/Field";
import { PilotCode, PilotNote, StatusNote } from "@/components/auth/StatusNote";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { RESET_TTL_MINUTES, maskEmail } from "@/lib/auth";

/* ==================================================================
   HOMERA — MOT DE PASSE OUBLIÉ
   ------------------------------------------------------------------
   Un seul champ. Ce qui se passe ensuite est vrai et vérifiable : un
   jeton et un code sont créés, valables trente minutes, et ils sont
   affichés ici — parce qu’aucun e-mail ne peut être envoyé tant que le
   pilote n’a pas de serveur d’envoi. Le lien affiché fonctionne.
   ================================================================== */

export function ForgotPasswordForm() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<{ title: string; body: string } | null>(null);
  const [issued, setIssued] = useState<{ token: string; code: string } | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(undefined);
    setIssued(null);
    setPending(true);
    const outcome = await requestPasswordReset(email);
    setPending(false);

    if (!outcome.ok) {
      setError(outcome.fields?.email);
      setStatus({ title: "La demande n’a pas abouti.", body: outcome.message });
      document.getElementById("oublie-email")?.focus();
      return;
    }

    setIssued({ token: outcome.data.token, code: outcome.data.code });
  };

  return (
    <AuthPanel
      title="Réinitialiser votre mot de passe"
      intro="Indiquez l’adresse du compte : HOMERA prépare un lien de réinitialisation et un code de secours."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <AuthLink href="/connexion">Revenir à la connexion</AuthLink>
          <AuthLink href="/inscription">Créer un compte</AuthLink>
        </div>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {status && (
          <StatusNote tone="error" title={status.title}>
            {status.body}
          </StatusNote>
        )}

        <Field id="oublie-email" label="Adresse e-mail du compte" error={error} required>
          {(describedBy) => (
            <input
              id="oublie-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="vous@exemple.com"
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className={`h-12 w-full rounded-input border bg-background px-4 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-light ${
                error
                  ? "border-error/70"
                  : "border-border hover:border-homera-terracotta/50 focus:border-homera-terracotta/70"
              }`}
            />
          )}
        </Field>

        <SubmitButton
          label="Préparer la réinitialisation"
          pendingLabel="Préparation…"
          pending={pending}
          icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
        />

        {issued && (
          <div className="space-y-5">
            <StatusNote tone="success" title="Réinitialisation prête">
              Le lien et le code ci-dessous sont actifs {RESET_TTL_MINUTES} minutes. Ils ne concernent que le compte{" "}
              {maskEmail(email)} et ne quittent pas ce navigateur.
            </StatusNote>

            <PilotCode
              code={issued.code}
              purpose="reset"
              label="Code de secours"
            />

            <div className="rounded-card border border-border bg-card/60 p-4">
              <p className="text-caption uppercase tracking-[0.14em] text-muted">Lien de réinitialisation</p>
              <p className="mt-2 break-all font-mono text-caption text-foreground">
                /reinitialisation?jeton={issued.token}
              </p>
              <div className="mt-3">
                <AuthLink href={`/reinitialisation?jeton=${issued.token}`}>
                  Choisir un nouveau mot de passe
                </AuthLink>
              </div>
            </div>
          </div>
        )}

        <PilotNote>
          Aucun e-mail n’est envoyé : le pilote n’a pas encore de serveur d’envoi. Le lien et le code s’affichent
          donc ici, à vous — c’est le seul endroit où ils apparaissent.
        </PilotNote>
      </form>
    </AuthPanel>
  );
}

"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AuthLink, AuthPanel } from "@/components/auth/AuthPanel";
import { CodeField } from "@/components/auth/CodeField";
import { PasswordField } from "@/components/auth/PasswordField";
import { PilotCode, PilotNote, StatusNote } from "@/components/auth/StatusNote";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { RESET_TTL_MINUTES } from "@/lib/auth";

/* ==================================================================
   HOMERA — RÉINITIALISATION
   ------------------------------------------------------------------
   Deux entrées possibles, un seul écran :
   • le lien reçu à l’étape précédente (paramètre `jeton` de l’adresse) ;
   • le code à six chiffres, pour qui a fermé l’onglet entre-temps.
   Dans les deux cas, le jeton est réellement vérifié, il expire, et il
   est consommé une fois le mot de passe changé.
   ================================================================== */

export function ResetPasswordForm({ token }: { token?: string }) {
  const { pendingCode, resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState(token ? "" : (pendingCode?.purpose === "reset" ? pendingCode.code : ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: "error" | "success"; title: string; body: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setPending(true);
    const outcome = await resetPassword({ token, code, password, confirmation });
    setPending(false);

    if (!outcome.ok) {
      setErrors(outcome.fields ?? {});
      setStatus({ tone: "error", title: "Le mot de passe n’a pas été modifié.", body: outcome.message });
      const first = outcome.fields?.motDePasse
        ? "reinit-motDePasse"
        : outcome.fields?.confirmation
          ? "reinit-confirmation"
          : "reinit-code";
      document.getElementById(first)?.focus();
      return;
    }

    setErrors({});
    setDone(outcome.data.email);
  };

  if (done) {
    return (
      <AuthPanel
        title="Mot de passe modifié"
        intro={`Le nouveau mot de passe du compte ${done} est actif, et le lien de réinitialisation a été consommé.`}
      >
        <div className="space-y-6">
          <StatusNote tone="success" title="Tout est en ordre">
            Vous pouvez vous connecter dès maintenant avec ce mot de passe. Les favoris et les recherches
            enregistrées dans ce navigateur n’ont pas bougé.
          </StatusNote>
          <AuthLink href="/connexion?etat=reinitialise">Aller à la connexion</AuthLink>
          <PilotNote />
        </div>
      </AuthPanel>
    );
  }

  const activeCode = pendingCode?.purpose === "reset" ? pendingCode : null;

  return (
    <AuthPanel
      title="Choisir un nouveau mot de passe"
      intro={
        token
          ? "Le lien reçu à l’étape précédente a été reconnu. Choisissez le mot de passe qui remplacera l’ancien."
          : "Saisissez le code à six chiffres préparé à l’étape précédente, puis le mot de passe qui remplacera l’ancien."
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <AuthLink href="/mot-de-passe-oublie">Demander un nouveau lien</AuthLink>
          <AuthLink href="/connexion">Revenir à la connexion</AuthLink>
        </div>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {status && (
          <StatusNote tone={status.tone} title={status.title}>
            {status.body}
          </StatusNote>
        )}

        {activeCode && !token ? (
          <PilotCode code={activeCode.code} purpose="reset" label="Code de secours" />
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {!token ? (
            <div className="sm:col-span-2">
              <CodeField
                id="reinit-code"
                label="Code à six chiffres"
                value={code}
                error={errors.code}
                hint={`Le code reste valable ${RESET_TTL_MINUTES} minutes après sa création.`}
                onChange={setCode}
                autoFocus
              />
            </div>
          ) : null}

          <PasswordField
            id="reinit-motDePasse"
            label="Nouveau mot de passe"
            value={password}
            error={errors.motDePasse}
            withMeter
            onChange={setPassword}
            autoFocus={Boolean(token)}
          />
          <PasswordField
            id="reinit-confirmation"
            label="Confirmer le nouveau mot de passe"
            value={confirmation}
            error={errors.confirmation}
            onChange={setConfirmation}
          />
        </div>

        <SubmitButton
          label="Enregistrer le mot de passe"
          pendingLabel="Enregistrement…"
          pending={pending}
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        />

        <PilotNote>
          Le nouveau mot de passe remplace l’ancien dans ce navigateur : l’empreinte est recalculée, l’ancienne
          n’est conservée nulle part. Aucun e-mail de confirmation n’est envoyé.
        </PilotNote>
      </form>
    </AuthPanel>
  );
}

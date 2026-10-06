"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { AuthLink, AuthPanel } from "@/components/auth/AuthPanel";
import { Field } from "@/components/auth/Field";
import { PasswordField } from "@/components/auth/PasswordField";
import { StatusNote, type StatusTone } from "@/components/auth/StatusNote";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { DEMO_LOGIN_CREDENTIALS, demoEmailForUsername } from "@/lib/demo-accounts";
import { validateSignIn } from "@/lib/auth";

/* ==================================================================
   HOMERA — CONNEXION
   ------------------------------------------------------------------
   Deux champs, un seul envoi, et des messages qui disent exactement ce
   qui s’est passé. Quand l’adresse est inconnue dans ce navigateur, la
   réponse le dit — dans un pilote sans serveur, prétendre à un « identi-
   fiants incorrects » générique serait seulement plus obscur.
   ================================================================== */

export const SIGNIN_FORM_ID = "connexion";

export type AuthNotice = { tone: StatusTone; title: string; body: string };

export function SignInForm({ notice, redirectTo }: { notice?: AuthNotice | null; redirectTo?: string | null }) {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<AuthNotice | null>(notice ?? null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const signInEmail = demoEmailForUsername(email) ?? email;
    const validation = validateSignIn({ email: signInEmail, motDePasse: password });
    if (!validation.ok) {
      setErrors(validation.fields);
      setStatus({
        tone: "error",
        title: "Connexion impossible en l’état.",
        body: validation.form ?? "Vérifiez l’adresse et le mot de passe.",
      });
      const first = validation.fields.email ? `${SIGNIN_FORM_ID}-email` : `${SIGNIN_FORM_ID}-motDePasse`;
      document.getElementById(first)?.focus();
      return;
    }

    setPending(true);
    const outcome = await signIn({ email: signInEmail, password, remember });
    setPending(false);

    if (!outcome.ok) {
      setErrors(outcome.fields ?? {});
      setStatus({ tone: "error", title: "Connexion refusée.", body: outcome.message });
      const first = outcome.fields?.email
        ? `${SIGNIN_FORM_ID}-email`
        : outcome.fields?.motDePasse
          ? `${SIGNIN_FORM_ID}-motDePasse`
          : null;
      if (first) document.getElementById(first)?.focus();
      return;
    }

    setErrors({});
    // Adresse non confirmée : la confirmation passe avant tout le reste.
    if (outcome.data.needsVerification) {
      router.push(redirectTo ? `/verification-email?next=${encodeURIComponent(redirectTo)}` : "/verification-email");
      return;
    }
    if (redirectTo) router.replace(redirectTo);
    // Sans destination, le contexte prévient l’écran : le panneau « connecté » prend la suite.
  };

  return (
    <AuthPanel
      title="Se connecter"
      intro="Votre espace reprend vos favoris, vos recherches enregistrées et vos dossiers en cours."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <AuthLink href={redirectTo ? `/inscription?next=${encodeURIComponent(redirectTo)}` : "/inscription"}>Créer un compte</AuthLink>
          <AuthLink href="/mot-de-passe-oublie">Mot de passe oublié</AuthLink>
        </div>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {status && (
          <StatusNote tone={status.tone} title={status.title}>
            {status.body}
          </StatusNote>
        )}

        <section aria-labelledby="demo-accounts-title" className="rounded-card border border-border bg-card/60 p-4">
          <h2 id="demo-accounts-title" className="text-note font-semibold">Accès de démonstration</h2>
          <p className="mt-1 text-caption leading-relaxed text-muted">Choisissez un profil pour remplir les identifiants de test.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_LOGIN_CREDENTIALS.map((credential) => <li key={credential.username}>
              <button type="button" onClick={() => { setEmail(credential.username); setPassword(credential.password); setErrors({}); setStatus(null); }} aria-label={`Utiliser le profil ${credential.label}, identifiant ${credential.username}, mot de passe ${credential.password}`} className="flex min-h-14 w-full flex-col items-start justify-center rounded-xl border border-border bg-background px-3 py-2 text-left transition-colors hover:border-homera-terracotta/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-terracotta">
                <span className="text-caption font-semibold">{credential.label}</span>
                <span className="mt-0.5 font-mono text-caption text-muted">{credential.username} / {credential.password}</span>
              </button>
            </li>)}
          </ul>
          <p className="mt-3 text-caption leading-relaxed text-muted">Ces comptes et mots de passe sont publics et réservés à la démonstration locale, jamais à la production.</p>
        </section>

        <Field id={`${SIGNIN_FORM_ID}-email`} label="Adresse e-mail ou identifiant démo" error={errors.email} required hint="Identifiants disponibles : admin, user, agent ou prop.">
          {(describedBy) => (
            <input
              id={`${SIGNIN_FORM_ID}-email`}
              name="email"
              type="text"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => {
                  if (!current.email) return current;
                  const next = { ...current };
                  delete next.email;
                  return next;
                });
              }}
              autoComplete="username"
              placeholder="vous@exemple.com ou admin"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy}
              className={`w-full rounded-input border bg-background px-4 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-light ${
                errors.email
                  ? "border-error/70"
                  : "border-border hover:border-homera-terracotta/50 focus:border-homera-terracotta/70"
              } h-12`}
            />
          )}
        </Field>

        <PasswordField
          id={`${SIGNIN_FORM_ID}-motDePasse`}
          label="Mot de passe"
          value={password}
          error={errors.motDePasse}
          autoComplete="current-password"
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => {
              if (!current.motDePasse) return current;
              const next = { ...current };
              delete next.motDePasse;
              return next;
            });
          }}
        />

        <div className="rounded-card border border-border bg-card/60 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <input
              id={`${SIGNIN_FORM_ID}-rester`}
              name="rester"
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--homera-terracotta-dark)]"
            />
            <div>
              <label htmlFor={`${SIGNIN_FORM_ID}-rester`} className="text-note text-foreground">
                Rester connecté sur cet appareil
              </label>
              <p className="mt-1 text-caption leading-relaxed text-muted">
                Décochez pour une connexion qui s’efface à la fermeture de l’onglet. Dans les deux cas, la session
                ne quitte pas ce navigateur.
              </p>
            </div>
          </div>
        </div>

        <SubmitButton
          label="Se connecter"
          pendingLabel="Connexion…"
          pending={pending}
          icon={<LogIn className="h-4 w-4" aria-hidden="true" />}
        />

        <p className="text-caption leading-relaxed text-muted">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="homera-underline font-medium homera-accent-ink">
            Créer un compte client, propriétaire ou agent
          </Link>
          .
        </p>
      </form>
    </AuthPanel>
  );
}

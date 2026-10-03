"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, UserPlus } from "lucide-react";
import { AuthAsideTitle, AuthBenefits, AuthLink, AuthPanel } from "@/components/auth/AuthPanel";
import { FieldRenderer } from "@/components/auth/Field";
import { PasswordField } from "@/components/auth/PasswordField";
import { RoleChoice } from "@/components/auth/RoleChoice";
import { StatusNote } from "@/components/auth/StatusNote";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { VERIFY_HREF } from "@/lib/nav";
import {
  emptyValues,
  formatPhone,
  groupFields,
  roleDefinition,
  roleFields,
  validateSignUp,
  type AccountRole,
  type FieldSpec,
  type FormValues,
} from "@/lib/auth";

/* ==================================================================
   HOMERA — INSCRIPTION
   ------------------------------------------------------------------
   Le rôle précède la saisie : il décide des champs demandés, et ces
   champs changent réellement quand on change de rôle (les informations
   d’identité déjà saisies sont conservées, le reste est réinitialisé
   plutôt que mélangé).

   Aucune validation native n’est laissée au navigateur (`noValidate`) :
   les messages sont les nôtres, dans la langue du site, et le premier
   champ fautif reçoit le focus — c’est la seule façon d’être sûr que
   l’erreur est vue et entendue.
   ================================================================== */

export const SIGNUP_FORM_ID = "inscription";

export function SignUpForm({ initialRole }: { initialRole: AccountRole }) {
  const { account, signUp } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState<AccountRole>(initialRole);
  const [values, setValues] = useState<FormValues>(() => emptyValues(initialRole));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: "error" | "warning" | "info"; title: string; body: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  const definition = roleDefinition(role);
  const identity = useMemo(() => groupFields(role, "identite"), [role]);
  const profile = useMemo(() => groupFields(role, "profil"), [role]);
  const security = useMemo(
    () => groupFields(role, "securite").filter((field) => field.name !== "conditions"),
    [role],
  );
  const terms = useMemo(
    () => roleFields(role).find((field) => field.name === "conditions"),
    [role],
  );
  const passwordContext = useMemo(
    () => ({
      prenom: String(values.prenom ?? ""),
      nom: String(values.nom ?? ""),
      email: String(values.email ?? ""),
    }),
    [values.prenom, values.nom, values.email],
  );

  const update = useCallback((name: string, value: string | boolean) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  /* Changer de rôle garde l’identité, remet à zéro ce qui dépend du rôle. */
  const switchRole = useCallback(
    (next: AccountRole) => {
      if (next === role) return;
      const kept: FormValues = emptyValues(next);
      for (const field of groupFields(next, "identite")) {
        kept[field.name] = values[field.name] ?? "";
      }
      setRole(next);
      setValues(kept);
      setErrors({});
      setStatus(null);
      router.replace(`${pathname}?role=${next}`, { scroll: false });
    },
    [pathname, role, router, values],
  );

  const focusFirstError = (fields: Record<string, string>) => {
    const order = roleFields(role).map((field) => field.name);
    const first = order.find((name) => name in fields);
    if (!first) return;
    document.getElementById(`${SIGNUP_FORM_ID}-${first}`)?.focus();
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const validation = validateSignUp(role, values);
    if (!validation.ok) {
      setErrors(validation.fields);
      setStatus({
        tone: "error",
        title: "Le compte n’a pas encore été créé.",
        body: validation.form ?? "Corrigez les champs signalés, puis validez à nouveau.",
      });
      focusFirstError(validation.fields);
      return;
    }

    setPending(true);
    const outcome = await signUp({ role, values });
    setPending(false);

    if (!outcome.ok) {
      setErrors(outcome.fields ?? {});
      setStatus({ tone: "error", title: "Le compte n’a pas été créé.", body: outcome.message });
      if (outcome.fields) focusFirstError(outcome.fields);
      return;
    }

    router.push("/verification-email");
  };

  const renderField = (field: FieldSpec) => {
    const id = `${SIGNUP_FORM_ID}-${field.name}`;
    if (field.kind === "password") {
      return (
        <PasswordField
          key={`${role}-${field.name}`}
          id={id}
          label={field.label}
          value={String(values[field.name] ?? "")}
          error={errors[field.name]}
          context={field.name === "motDePasse" ? passwordContext : {}}
          withMeter={field.name === "motDePasse"}
          autoComplete="new-password"
          onChange={(value) => update(field.name, value)}
        />
      );
    }
    return (
      <FieldRenderer
        key={`${role}-${field.name}`}
        id={id}
        spec={field}
        value={values[field.name] ?? ""}
        error={errors[field.name]}
        onBlur={() => {
          if (field.kind === "tel") update(field.name, formatPhone(String(values[field.name] ?? "")));
        }}
        onChange={(value) => update(field.name, value)}
      />
    );
  };

  return (
    <AuthPanel
      title="Ouvrir un compte"
      intro="Choisissez votre rôle, puis renseignez ce que HOMERA a réellement besoin de savoir pour ce rôle. Tout le reste se complète plus tard, dans votre espace."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {account && (
          <StatusNote tone="info" title={`Vous êtes connecté avec ${account.email}`}>
            Créer un nouveau compte <em>remplacera</em> cette session dans ce navigateur : les favoris et les
            recherches enregistrées restent, eux, inchangés.
          </StatusNote>
        )}

        {status && (
          <StatusNote tone={status.tone} title={status.title}>
            {status.body}
          </StatusNote>
        )}

        <RoleChoice value={role} onChange={switchRole} />

        {/* Ce que le rôle choisi change, dit sans détour */}
        <div className="rounded-card border border-border bg-card/60 p-4">
          <p className="text-note leading-relaxed text-foreground">
            <span className="font-semibold">{definition.label}.</span> {definition.promise}
          </p>
          <p className="mt-2 text-caption leading-relaxed text-muted">{definition.verification}</p>
        </div>

        {/* ---------------- Identité et contact ---------------- */}
        <fieldset className="space-y-5">
          <legend className="text-label uppercase text-muted">Votre identité</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{identity.map(renderField)}</div>
        </fieldset>

        {/* ---------------- Ce que le rôle ajoute ---------------- */}
        <fieldset className="space-y-5">
          <legend className="text-label uppercase text-muted">
            {`Votre profil · ${definition.label}`}
          </legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{profile.map(renderField)}</div>
        </fieldset>

        {/* ---------------- Sécurité et consentements ---------------- */}
        <fieldset className="space-y-5">
          <legend className="text-label uppercase text-muted">Sécurité et accords</legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {security.map(renderField)}
            {terms && renderField(terms)}
          </div>
          <p className="text-caption leading-relaxed text-muted">
            Les conditions complètes se lisent sur la page{" "}
            <Link href="/legal" className="homera-underline font-medium homera-accent-ink">
              mentions, conditions et confidentialité
            </Link>
            .
          </p>
        </fieldset>

        <div className="space-y-4">
          <SubmitButton
            label="Créer mon compte"
            pendingLabel="Création du compte…"
            pending={pending}
            icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
          />
          <p className="text-caption leading-relaxed text-muted">
            La création du compte ouvre une confirmation d’adresse e-mail : sans e-mail envoyé par le pilote, le
            code s’affiche à l’écran suivant — il reste valable quinze minutes.
          </p>
        </div>
      </form>
    </AuthPanel>
  );
}

/** Colonne latérale de l’inscription : ce que le compte ouvre, et ce qu’il ne fait pas. */
export function SignUpAside() {
  return (
    <div className="space-y-8">
      <div>
        <AuthAsideTitle>Ce qu’ouvre un compte</AuthAsideTitle>
        <AuthBenefits
          items={[
            "Favoris et recherches enregistrées, retrouvés à chaque visite",
            "Suivi des demandes de visite et des dossiers, avec la référence du bien",
            "Alertes sur vos critères, dès qu’un bien vérifié correspond",
          ]}
        />
      </div>
      <div className="rounded-card border border-border bg-card/60 p-4">
        <p className="text-note leading-relaxed text-muted">
          Un compte n’est pas nécessaire pour consulter le catalogue : les fiches, les filtres et le contact
          restent ouverts à tous, sans inscription.
        </p>
        <div className="mt-3">
          <AuthLink href="/explorer">Continuer sans compte</AuthLink>
        </div>
      </div>
      <div className="rounded-card border border-border bg-card/60 p-4">
        <p className="text-note leading-relaxed text-muted">
          Un compte attend la confirmation de son adresse ?{" "}
          <Link href={VERIFY_HREF} className="homera-underline font-medium homera-accent-ink">
            Saisir le code reçu
          </Link>
          .
        </p>
        <p className="mt-3 text-note leading-relaxed text-muted">
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="homera-underline font-medium homera-accent-ink">
            Se connecter
          </Link>
          . Mot de passe perdu ?{" "}
          <Link href="/mot-de-passe-oublie" className="homera-underline font-medium homera-accent-ink">
            Le réinitialiser
          </Link>
          .
        </p>
      </div>
      <p className="flex items-start gap-2 text-caption leading-relaxed text-muted">
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-homera-terracotta" aria-hidden="true" />
        Vous pourrez changer de rôle plus tard : un client qui devient propriétaire garde son historique.
      </p>
    </div>
  );
}

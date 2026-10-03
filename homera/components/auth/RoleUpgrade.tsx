"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { FieldRenderer } from "@/components/auth/Field";
import { RoleChoice } from "@/components/auth/RoleChoice";
import { StatusNote } from "@/components/auth/StatusNote";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  ROLES,
  emptyProfileValues,
  missingRoles,
  roleDefinition,
  upgradeFields,
  validateRoleUpgrade,
  type AccountRole,
  type FieldSpec,
  type FormValues,
} from "@/lib/auth";

/* ==================================================================
   HOMERA — AJOUTER UN RÔLE À SON COMPTE
   ------------------------------------------------------------------
   Un propriétaire cherche aussi un logement, un agent achète aussi pour
   lui-même : un compte ne se limite donc pas à son rôle d’inscription.
   Le socle client reste acquis ; ce formulaire ajoute un rôle **sans
   redemander** l’identité, le mot de passe ni les consentements déjà
   donnés — uniquement ce que le nouveau rôle exige.

   Le rôle principal du compte ne change pas : l’historique reste lisible.
   ================================================================== */

export const ROLE_UPGRADE_FORM_ID = "ajout-role";

export function RoleUpgrade() {
  const { roles, addRole } = useAuth();
  const available = useMemo(() => {
    const missing = missingRoles(roles);
    return ROLES.filter((role) => missing.includes(role.id));
  }, [roles]);

  const [role, setRole] = useState<AccountRole>(available[0]?.id ?? "proprietaire");
  const [values, setValues] = useState<FormValues>(() => emptyProfileValues(available[0]?.id ?? "proprietaire"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: "error" | "success"; title: string; body: string } | null>(null);
  const [pending, setPending] = useState(false);

  if (available.length === 0) {
    return (
      <StatusNote tone="success" title="Tous les rôles HOMERA sont déjà rattachés à ce compte">
        Client, propriétaire et agent : vous détenez l’ensemble des capacités proposées par le pilote. Rien
        d’autre à ajouter pour l’instant.
      </StatusNote>
    );
  }

  const definition = roleDefinition(role);
  const fields = upgradeFields(role);

  const switchRole = (next: AccountRole) => {
    setRole(next);
    setValues(emptyProfileValues(next));
    setErrors({});
    setStatus(null);
  };

  const focusFirstError = (list: Record<string, string>) => {
    const first = upgradeFields(role)
      .map((field) => field.name)
      .find((name) => name in list);
    if (first) document.getElementById(`${ROLE_UPGRADE_FORM_ID}-${first}`)?.focus();
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const validation = validateRoleUpgrade(role, values);
    if (!validation.ok) {
      setErrors(validation.fields);
      setStatus({
        tone: "error",
        title: "Le rôle n’a pas été ajouté.",
        body: validation.form ?? "Complétez les champs signalés, puis validez à nouveau.",
      });
      focusFirstError(validation.fields);
      return;
    }

    setPending(true);
    const outcome = await addRole({ role, values });
    setPending(false);

    if (!outcome.ok) {
      setErrors(outcome.fields ?? {});
      setStatus({ tone: "error", title: "Le rôle n’a pas été ajouté.", body: outcome.message });
      if (outcome.fields) focusFirstError(outcome.fields);
      return;
    }

    setErrors({});
    setValues(emptyProfileValues(role));
    setStatus({
      tone: "success",
      title: `Rôle « ${definition.label} » ajouté`,
      body: `Votre compte cumule désormais : ${outcome.data.account.roles
        .map((entry) => roleDefinition(entry).label)
        .join(" · ")}. Tout ce qui existait avant est conservé — favoris, recherches enregistrées et rôle principal.`,
    });
  };

  const renderField = (field: FieldSpec) => (
    <FieldRenderer
      key={`${role}-${field.name}`}
      id={`${ROLE_UPGRADE_FORM_ID}-${field.name}`}
      spec={field}
      value={values[field.name] ?? ""}
      error={errors[field.name]}
      onChange={(value) => {
        setValues((current) => ({ ...current, [field.name]: value }));
        setErrors((current) => {
          if (!(field.name in current)) return current;
          const next = { ...current };
          delete next[field.name];
          return next;
        });
      }}
    />
  );

  return (
    <div className="space-y-6">
      {status && (
        <StatusNote tone={status.tone} title={status.title}>
          {status.body}
        </StatusNote>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {available.length > 1 ? (
          <RoleChoice
            value={role}
            onChange={switchRole}
            name="ajout-role"
            roles={available}
            legend="Le rôle à ajouter"
            intro="Choisissez le rôle que vous voulez ajouter. Votre compte client reste acquis : ce sont les mêmes identifiants, les mêmes favoris, la même adresse."
          />
        ) : (
          <div className="rounded-card border border-homera-terracotta/35 bg-homera-terracotta/6 px-4 py-3.5">
            <p className="text-note leading-relaxed text-foreground">
              <span className="font-semibold">{definition.oneLine}</span> {definition.promise}
            </p>
          </div>
        )}

        <p className="text-caption leading-relaxed text-muted">{definition.verification}</p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{fields.map(renderField)}</div>

        <SubmitButton
          label={`Ajouter le rôle ${definition.label}`}
          pendingLabel="Ajout du rôle…"
          pending={pending}
          icon={<Plus className="h-4 w-4" aria-hidden="true" />}
        />

        <p className="flex items-start gap-2 text-caption leading-relaxed text-muted">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-homera-terracotta" aria-hidden="true" />
          Vous pouvez ajouter les deux autres rôles, à votre rythme : chacun garde son dossier, et rien de ce que
          vous avez déjà saisi n’est redemandé.
        </p>
      </form>
    </div>
  );
}

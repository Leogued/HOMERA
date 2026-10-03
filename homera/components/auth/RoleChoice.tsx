"use client";

import { Check, KeyRound, Layers, Search, ShieldCheck } from "lucide-react";
import { ROLES, type AccountRole, type RoleDefinition, type RoleIconKey } from "@/lib/auth";

/* ==================================================================
   HOMERA — CHOIX DU RÔLE
   ------------------------------------------------------------------
   Trois rôles, trois dossiers différents : le choix se fait avant toute
   saisie, et il change réellement les informations demandées ensuite.
   Les boutons radio restent natifs (flèches du clavier, lecteur d’écran
   annonce « 2 sur 3 ») — seule leur présentation est dessinée.
   ================================================================== */

const ICONS: Record<RoleIconKey, typeof Search> = {
  search: Search,
  key: KeyRound,
  shield: ShieldCheck,
};

export function RoleChoice({
  value,
  onChange,
  name = "role",
  roles = ROLES,
  legend = "Votre profil",
  intro,
  showIncludes = true,
}: {
  value: AccountRole;
  onChange: (role: AccountRole) => void;
  name?: string;
  /** Sous-ensemble de rôles à proposer (ajout d’un rôle à un compte existant). */
  roles?: readonly RoleDefinition[];
  /** Affiche « inclut le compte client » sous les rôles qui le reprennent. */
  showIncludes?: boolean;
  legend?: string;
  intro?: string;
}) {
  return (
    <fieldset>
      <legend className="text-label uppercase text-muted">{legend}</legend>
      <p className="mt-2 text-note leading-relaxed text-muted">
        {intro ??
          "Le compte s’adapte au rôle choisi : les informations demandées ne sont pas les mêmes pour un client, un propriétaire et un agent."}
      </p>

      <div
        className={`mt-4 grid grid-cols-1 gap-3 ${
          roles.length === 3 ? "sm:grid-cols-3" : roles.length === 2 ? "sm:grid-cols-2" : ""
        }`}
      >
        {roles.map((role) => {
          const Icon = ICONS[role.icon];
          const active = role.id === value;
          return (
            <label
              key={role.id}
              className={`homera-press relative flex cursor-pointer flex-col gap-2 rounded-card border p-4 transition-colors ${
                active
                  ? "border-homera-terracotta bg-homera-terracotta/8"
                  : "border-border bg-card hover:border-homera-terracotta/60"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={role.id}
                checked={active}
                onChange={() => onChange(role.id)}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-2">
                <Icon
                  className={`h-4 w-4 ${active ? "text-homera-terracotta" : "text-muted"}`}
                  aria-hidden="true"
                />
                {active ? (
                  <span className="inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] homera-accent-ink">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Choisi
                  </span>
                ) : null}
              </span>
              <span className="font-serif text-display-xs text-foreground">{role.label}</span>
              <span className="text-caption leading-relaxed text-muted">{role.oneLine}</span>
              {showIncludes && role.id !== "client" ? (
                <span className="mt-1 flex items-start gap-1.5 text-micro leading-relaxed text-muted">
                  <Layers className="mt-[0.15rem] h-3 w-3 shrink-0 text-homera-terracotta" aria-hidden="true" />
                  {role.includes}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

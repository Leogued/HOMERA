import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

/* ==================================================================
   HOMERA — REFUS D’ACCÈS RENDU PAR LE SERVEUR
   ------------------------------------------------------------------
   Ce refus n’est pas un message d’erreur déguisé : il est produit
   avant le rendu de l’espace, parce que le serveur a comparé les rôles
   réels du compte avec l’espace demandé. Rien de l’espace concerné
   n’est chargé, donc rien n’est exposé.
   ================================================================== */

const SPACE_LABEL: Record<string, string> = {
  client: "l’espace client",
  proprietaire: "l’espace propriétaire",
  agent: "l’espace agent",
  admin: "l’administration",
};

const ROLE_HINT: Record<string, string> = {
  client: "Votre compte HOMERA est actif : l’espace client vous est ouvert.",
  proprietaire: "Le dépôt et le suivi d’un bien demandent le rôle propriétaire, à ajouter depuis votre compte.",
  agent: "Les mandats et les visites terrain demandent le rôle agent, à ajouter depuis votre compte.",
  admin: "L’administration est réservée aux comptes habilités par HOMERA.",
};

export function WorkspaceRefusal({ role }: { role: "client" | "proprietaire" | "agent" | "admin" }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.16em] text-homera-terracotta">
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        Accès refusé
      </p>
      <h1 className="mt-4 font-serif text-display-sm leading-tight text-foreground">
        Votre compte n’ouvre pas {SPACE_LABEL[role] ?? "cet espace"}.
      </h1>
      <p className="mt-4 text-body leading-relaxed text-muted">
        {ROLE_HINT[role] ??
          "L’accès à cet espace est conditionné aux rôles attribués à votre compte par HOMERA."}
      </p>
      <p className="mt-3 text-note leading-relaxed text-muted">
        Si vous pensez qu’il s’agit d’une erreur, contactez l’équipe HOMERA : la demande est instruite et
        la réponse est tracée.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/client"
          className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn bg-homera-terracotta px-5 text-note font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Ouvrir mon espace
        </Link>
        <Link
          href="/contact"
          className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-5 text-note font-semibold text-foreground"
        >
          Demander l’accès
        </Link>
      </div>
    </main>
  );
}

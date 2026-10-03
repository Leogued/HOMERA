"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Check,
  Clock,
  Heart,
  KeyRound,
  LogOut,
  MailCheck,
  Search,
  ShieldAlert,
} from "lucide-react";
import { AuthAsideTitle, AuthBenefits, AuthPanel } from "@/components/auth/AuthPanel";
import { RoleUpgrade } from "@/components/auth/RoleUpgrade";
import { SignInForm, type AuthNotice } from "@/components/auth/SignInForm";
import { PilotNote, StatusNote } from "@/components/auth/StatusNote";
import { useAuth } from "@/components/providers/AuthProvider";
import { CLIENT_HREF } from "@/lib/nav";
import {
  capabilitiesByRole,
  describeProfile,
  initials,
  maskPhone,
  missingRoles,
  roleDefinition,
  rolesLabel,
} from "@/lib/auth";

/* ==================================================================
   HOMERA — /connexion : DEUX ÉTATS, AUCUN MENSONGE
   ------------------------------------------------------------------
   Avant lecture du stockage : un squelette qui garde la place. Sans
   compte : le formulaire. Avec compte : la fiche du compte connecté —
   ce qui existe aujourd’hui, ce que le pilote ne fait pas encore, et
   la sortie de session.
   ================================================================== */

const COMING_UP = [
  { icon: Bell, title: "Alertes", detail: "Être prévenu dès qu’un bien vérifié correspond à vos critères." },
  { icon: CalendarCheck, title: "Visites et dossiers", detail: "Suivre vos demandes et leurs pièces au même endroit." },
  { icon: KeyRound, title: "Dépôt de bien", detail: "Propriétaires et agents déposeront un dossier complet." },
] as const;

export function ConnexionView({ notice }: { notice?: AuthNotice | null }) {
  const { ready, account } = useAuth();

  if (!ready) {
    return (
      <AuthPanel title="Votre espace">
        <div aria-busy="true" aria-live="polite" className="space-y-4">
          <p className="sr-only">Lecture de la session en cours…</p>
          <div className="homera-skeleton h-12 w-full" />
          <div className="homera-skeleton h-12 w-full" />
          <div className="homera-skeleton h-12 w-2/3" />
        </div>
      </AuthPanel>
    );
  }

  if (!account) return <SignInForm notice={notice} />;
  return <SignedInPanel notice={notice} />;
}

export function SignedInPanel({ notice }: { notice?: AuthNotice | null }) {
  const { account, signOut, accountsCount } = useAuth();
  const router = useRouter();
  if (!account) return null;

  const profile = describeProfile(account.roles, account.profile);
  const groups = capabilitiesByRole(account.roles);
  const missing = missingRoles(account.roles);
  const memberSince = new Date(account.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <AuthPanel
        title={`Bonjour ${account.prenom}`.trim()}
        intro={
          account.roles.length > 1
            ? `Vous êtes connecté avec l’adresse ${account.email}, et votre compte cumule ${rolesLabel(account.roles)}.`
            : `Vous êtes connecté avec l’adresse ${account.email}.`
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={CLIENT_HREF}
              className="homera-press inline-flex min-h-10 items-center gap-1.5 rounded-btn homera-cta px-4 text-note font-semibold text-white"
            >
              Ouvrir mon espace client
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/favoris"
              className="homera-underline inline-flex min-h-10 items-center gap-1.5 text-note font-medium homera-accent-ink"
            >
              Voir mes favoris et mes recherches
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.refresh();
              }}
              className="homera-press inline-flex min-h-10 items-center gap-2 rounded-btn border border-border px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Se déconnecter
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {notice && (
            <StatusNote tone={notice.tone} title={notice.title}>
              {notice.body}
            </StatusNote>
          )}

          {account.emailVerified ? (
            <StatusNote tone="success" title="Adresse e-mail confirmée">
              Le compte est complet du point de vue du pilote : session, rôle et code de confirmation fonctionnent.
            </StatusNote>
          ) : (
            <StatusNote tone="warning" title="Adresse e-mail à confirmer">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span>
                  Un code à six chiffres attend d’être saisi pour cette adresse. Tant qu’il ne l’est pas, le compte
                  reste marqué « à vérifier ».
                </span>
                <Link
                  href="/verification-email"
                  className="homera-underline inline-flex items-center gap-1.5 font-medium homera-accent-ink"
                >
                  <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Confirmer maintenant
                </Link>
              </span>
            </StatusNote>
          )}

          {/* --- Identité du compte --- */}
          <div className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card/60 p-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full homera-cta font-serif text-display-xs text-white"
            >
              {initials(account.prenom, account.nom)}
            </span>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-foreground">
                {account.prenom} {account.nom}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-muted">
                {account.roles.map((entry) => (
                  <span
                    key={entry}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold uppercase tracking-[0.12em] ${
                      entry === account.role
                        ? "border-homera-terracotta/40 homera-accent-ink"
                        : "border-border text-muted"
                    }`}
                  >
                    {roleDefinition(entry).label}
                    {entry === account.role ? <span className="sr-only"> (rôle principal)</span> : null}
                  </span>
                ))}
                <span className="homera-num">{account.id}</span>
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-caption uppercase tracking-[0.14em] text-muted">Adresse e-mail</dt>
              <dd className="mt-1 text-note text-foreground">{account.email}</dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-[0.14em] text-muted">Téléphone</dt>
              <dd className="homera-num mt-1 text-note text-foreground">{maskPhone(account.telephone)}</dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-[0.14em] text-muted">Compte ouvert le</dt>
              <dd className="mt-1 text-note text-foreground">{memberSince}</dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-[0.14em] text-muted">Conservé dans ce navigateur</dt>
              <dd className="mt-1 text-note text-foreground">
                {accountsCount} compte{accountsCount > 1 ? "s" : ""}
              </dd>
            </div>
            {profile.map((line) => (
              <div key={line.name}>
                <dt className="text-caption uppercase tracking-[0.14em] text-muted">{line.label}</dt>
                <dd className="mt-1 text-note text-foreground">{line.value}</dd>
              </div>
            ))}
          </dl>

          {/* --- Ce que ce compte ouvre, rôle par rôle --- */}
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.scope}>
                <h3 className="text-label uppercase text-muted">{group.title}</h3>
                <ul className="mt-3 space-y-2.5">
                  {group.capabilities.map((capability) => (
                    <li key={capability.id} className="flex items-start gap-2.5">
                      {capability.available ? (
                        <Check className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <Clock className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                      )}
                      <span className="min-w-0 text-note leading-relaxed text-foreground">
                        {capability.label}
                        <span className="ml-2 inline-flex rounded-full border border-border px-2 py-0.5 align-middle text-micro font-semibold uppercase tracking-[0.1em] text-muted">
                          {capability.available ? "Ouvert" : "Avec l’API"}
                        </span>
                        <span className="mt-0.5 block text-caption text-muted">{capability.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-caption leading-relaxed text-muted">
              Le socle client est inclus dans tous les rôles : un propriétaire cherche aussi, un agent achète
              aussi. Les fonctions marquées « avec l’API » demandent un serveur : elles sont annoncées, jamais
              présentées comme ouvertes.
            </p>
          </div>

          {(account.roles.includes("proprietaire") || account.roles.includes("agent")) && (
            <StatusNote
              tone="info"
              title={account.roles.includes("agent") ? "Dépôt de biens et vérification" : "Dossier propriétaire"}
            >
              Le dépôt commencera par la vérification {account.roles.includes("agent") ? "de votre structure (RCCM ou IFU, carte professionnelle)" : "de vos pièces de propriété ou de votre mandat"}, puis
              de chaque bien. Ces fonctions s’ouvriront avec le serveur ; le compte, lui, est déjà utilisable.
            </StatusNote>
          )}
        </div>
      </AuthPanel>

      <div className="rounded-card border border-border bg-card/60 p-5">
        <AuthAsideTitle>Déjà disponible</AuthAsideTitle>
        <AuthBenefits
          items={[
            `Vos rôles : ${rolesLabel(account.roles)} — et tout ce que le socle client apporte`,
            "Vos favoris et vos recherches enregistrées, conservés dans ce navigateur",
            "La confirmation de votre adresse, avec un code qui expire réellement",
          ]}
        />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/favoris"
            className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            Mes favoris
          </Link>
          <Link
            href="/explorer"
            className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Explorer les biens
          </Link>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-card border border-border bg-card/60 p-5">
          <AuthAsideTitle>
            {missing.length === 2 ? "Ajouter un autre rôle" : "Ajouter le rôle restant"}
          </AuthAsideTitle>
          <p className="mt-3 text-note leading-relaxed text-muted">
            {`Ce compte détient ${rolesLabel(account.roles)}. Un propriétaire cherche aussi un logement, un agent achète aussi parfois pour lui-même : l’ajout se fait avec les mêmes identifiants, sans reperdre l’identité ni le mot de passe.`}
          </p>
          <div className="mt-5">
            <RoleUpgrade />
          </div>
        </div>
      )}

      <div className="rounded-card border border-border bg-card/60 p-5">
        <AuthAsideTitle>En préparation</AuthAsideTitle>
        <ul className="mt-4 space-y-4">
          {COMING_UP.map((entry) => (
            <li key={entry.title} className="flex items-start gap-3">
              <entry.icon className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />
              <div>
                <p className="text-note font-semibold text-foreground">{entry.title}</p>
                <p className="mt-0.5 text-caption leading-relaxed text-muted">{entry.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2 text-caption leading-relaxed text-muted">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-homera-terracotta" aria-hidden="true" />
          Ces fonctions demandent un serveur : elles s’ouvriront avec l’API, pas avant.
        </p>
      </div>

      <PilotNote />
    </div>
  );
}

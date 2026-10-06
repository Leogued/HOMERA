"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, LogOut, MailCheck, Search, UserRound, UserRoundPlus } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { initials, roleDefinition, rolesLabel } from "@/lib/auth";
import { AUTH_HREF, CLIENT_HREF, SIGNUP_HREF, VERIFY_HREF } from "@/lib/nav";
import type { PublicAccount } from "@/lib/accounts";

/* ==================================================================
   HOMERA — COMMANDE DE COMPTE DANS L’EN-TÊTE
   ------------------------------------------------------------------
   Avant la lecture du stockage, la commande affiche « Se connecter » :
   c’est l’action la plus probable, et la page de connexion sait déjà
   quoi montrer à quelqu’un qui serait en fait connecté. Aucun état
   inventé, donc, et aucun décalage de mise en page au montage.

   Une fois la session lue, la pastille devient le compte : initiales,
   rôle, et un panneau qui donne accès aux pages réellement existantes.
   ================================================================== */

type Tone = "light" | "night";

const PILL: Record<Tone, string> = {
  light:
    "border border-border bg-card text-foreground hover:border-homera-terracotta hover:text-homera-terracotta",
  night:
    "border border-white/15 bg-white/8 text-white backdrop-blur-sm hover:bg-white/14",
};

function accountProfileHref(account: Pick<PublicAccount, "roles">): string {
  if (account.roles.includes("proprietaire")) return "/proprietaire/profil";
  if (account.roles.includes("agent")) return "/agent/profil";
  return "/client/profil";
}

export function AccountControl({ tone = "light" }: { tone?: Tone }) {
  const { ready, account, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (!ready || !account) {
    return (
      <Link
        href={AUTH_HREF}
        className={`homera-press inline-flex h-10 items-center gap-2 rounded-full px-4 text-note font-medium transition-colors ${PILL[tone]}`}
      >
        <UserRound className="h-4 w-4" aria-hidden="true" />
        <span className="hidden xl:inline">Se connecter</span>
      </Link>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="homera-account-menu"
        aria-label={`Mon compte — ${rolesLabel(account.roles)}`}
        className={`homera-press inline-flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3 text-note font-medium transition-colors ${PILL[tone]}`}
      >
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 items-center justify-center rounded-full font-serif text-caption ${
            tone === "night" ? "bg-white/15 text-white" : "homera-cta text-white"
          }`}
        >
          {initials(account.prenom, account.nom)}
        </span>
        <span className="hidden max-w-[9rem] truncate xl:inline">{account.prenom}</span>
        {!account.emailVerified ? (
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              tone === "night" ? "bg-homera-amber" : "bg-warning"
            }`}
            role="img"
            aria-label="Adresse e-mail à confirmer"
          />
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id="homera-account-menu"
        inert={!open}
        className={`absolute right-0 top-full z-50 w-[19rem] pt-2 transition-all duration-[220ms] ease-standard ${
          open ? "pointer-events-auto visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1.5 opacity-0"
        }`}
      >
        <div className="overflow-hidden rounded-menu border border-border bg-card text-foreground shadow-[var(--shadow-card-hover)]">
          <div className="border-b border-border px-4 py-3.5">
            <p className="text-note font-semibold">
              {account.prenom} {account.nom}
            </p>
            <p className="mt-0.5 truncate text-caption text-muted">{account.email}</p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5">
              {account.roles.map((entry) => (
                <span
                  key={entry}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-micro font-semibold uppercase tracking-[0.12em] ${
                    entry === account.role
                      ? "border-homera-terracotta/40 homera-accent-ink"
                      : "border-border text-muted"
                  }`}
                >
                  {roleDefinition(entry).label}
                </span>
              ))}
            </p>
          </div>

          {!account.emailVerified ? (
            <Link
              href={VERIFY_HREF}
              className="flex items-start gap-2.5 border-b border-border bg-warning/8 px-4 py-3 text-caption text-foreground transition-colors hover:bg-warning/12"
            >
              <MailCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
              <span>Adresse à confirmer — saisir le code à six chiffres.</span>
            </Link>
          ) : null}

          <nav aria-label="Compte" className="py-1.5">
            <Link
              href={CLIENT_HREF}
              className="flex items-center gap-2.5 px-4 py-2.5 text-note transition-colors hover:bg-surface-hover"
            >
              <UserRound className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
              Mon espace client
            </Link>
            <Link
              href={accountProfileHref(account)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-note transition-colors hover:bg-surface-hover"
            >
              <UserRound className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
              Mon profil
            </Link>
            {account.profile.demoRole === "admin" && <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-note transition-colors hover:bg-surface-hover"><UserRound className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />Administration</Link>}
            <Link
              href="/client/favoris"
              className="flex items-center gap-2.5 px-4 py-2.5 text-note transition-colors hover:bg-surface-hover"
            >
              <Heart className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
              Favoris et recherches
            </Link>
            {account.roles.includes("proprietaire") && <Link href="/proprietaire" className="flex items-center gap-2.5 px-4 py-2.5 text-note transition-colors hover:bg-surface-hover"><UserRound className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />Espace propriétaire</Link>}
            {account.roles.includes("agent") && <Link href="/agent" className="flex items-center gap-2.5 px-4 py-2.5 text-note transition-colors hover:bg-surface-hover"><UserRound className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />Espace agent</Link>}
            <Link
              href="/explorer"
              className="flex items-center gap-2.5 px-4 py-2.5 text-note transition-colors hover:bg-surface-hover"
            >
              <Search className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
              Explorer les biens
            </Link>
          </nav>

          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-btn px-2.5 py-2.5 text-note transition-colors hover:bg-surface-hover"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Entrées de compte des menus mobiles — mêmes états, présentation de liste. */
export function AccountMobileLinks({
  tone = "night",
  onNavigate,
}: {
  tone?: Tone;
  onNavigate?: () => void;
}) {
  const { ready, account, signOut } = useAuth();
  const dark = tone === "night";

  if (!ready || !account) {
    return (
      <>
        <Link
          href={AUTH_HREF}
          onClick={onNavigate}
          className={`homera-press flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-body-sm font-medium ${
            dark ? "border border-white/15 text-white" : "border border-border text-foreground"
          }`}
        >
          <UserRound className="h-4 w-4" aria-hidden="true" />
          Se connecter
        </Link>
        <Link
          href={SIGNUP_HREF}
          onClick={onNavigate}
          className={`homera-press flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-body-sm font-medium ${
            dark ? "homera-cta-night text-white" : "homera-cta text-white"
          }`}
        >
          <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
          Créer un compte
        </Link>
      </>
    );
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        dark ? "border-white/12 bg-white/[0.04] text-white" : "border-border bg-card text-foreground"
      }`}
    >
      <p className="text-body-sm font-semibold">
        {account.prenom} {account.nom}
      </p>
      <p className={`mt-0.5 truncate text-caption ${dark ? "text-white/60" : "text-muted"}`}>{account.email}</p>
      <p className="mt-2 flex flex-wrap gap-1.5">
        {account.roles.map((entry) => (
          <span
            key={entry}
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-micro font-semibold uppercase tracking-[0.12em] ${
              entry === account.role
                ? dark
                  ? "border-homera-amber/50 text-homera-amber"
                  : "border-homera-terracotta/40 homera-accent-ink"
                : dark
                  ? "border-white/20 text-white/70"
                  : "border-border text-muted"
            }`}
          >
            {roleDefinition(entry).label}
          </span>
        ))}
      </p>
      <ul className="mt-3 space-y-1">
        {[
          { href: CLIENT_HREF, label: "Mon espace client" },
          { href: accountProfileHref(account), label: "Mon profil" },
          ...(account.profile.demoRole === "admin" ? [{ href: "/admin", label: "Administration" }] : []),
          { href: "/client/favoris", label: "Favoris et recherches" },
          ...(account.roles.includes("proprietaire") ? [{ href: "/proprietaire", label: "Espace propriétaire" }] : []),
          ...(account.roles.includes("agent") ? [{ href: "/agent", label: "Espace agent" }] : []),
          ...(account.emailVerified ? [] : [{ href: VERIFY_HREF, label: "Confirmer mon adresse" }]),
        ].map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              onClick={onNavigate}
              className={`block rounded-xl px-3 py-2 text-body-sm transition-colors ${
                dark ? "text-white/85 hover:bg-white/8" : "text-foreground hover:bg-surface-hover"
              }`}
            >
              {entry.label}
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => {
              signOut();
              onNavigate?.();
            }}
            className={`block w-full rounded-xl px-3 py-2 text-left text-body-sm transition-colors ${
              dark ? "text-white/85 hover:bg-white/8" : "text-foreground hover:bg-surface-hover"
            }`}
          >
            Se déconnecter
          </button>
        </li>
      </ul>
    </div>
  );
}

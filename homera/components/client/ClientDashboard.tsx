"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Heart,
  House,
  Info,
  LayoutDashboard,
  LogOut,
  MailCheck,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useVisitor } from "@/components/providers/VisitorProvider";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import { PropertyCard } from "@/components/catalog/PropertyCard";
import { PROPERTIES, type Property, type PropertyIntent, type PropertyType } from "@/lib/content";
import { CAPABILITIES, describeProfile, initials, maskPhone, roleDefinition, rolesLabel } from "@/lib/auth";
import type { PublicAccount } from "@/lib/accounts";
import { countLabel } from "@/lib/format";
import { parseCatalogQuery } from "@/lib/properties";
import { StatusBadge } from "@/components/workspace/Primitives";
import type { SavedSearch } from "@/lib/persistence";

const AUTOMATIC_ALERTS_CAPABILITY = CAPABILITIES.find((entry) => entry.id === "alertes");
const PROPERTY_TYPES: readonly PropertyType[] = ["villa", "appartement", "studio", "terrain", "local"];
const PROPERTY_INTENTS: readonly PropertyIntent[] = ["acheter", "louer", "sejour"];

type ClientNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

type ClientNavGroup = {
  label: string;
  items: ClientNavItem[];
};

const CLIENT_NAV: ClientNavGroup[] = [
  {
    label: "Espace personnel",
    items: [{ id: "accueil", label: "Accueil", href: "/client", icon: LayoutDashboard }],
  },
  {
    label: "Découvrir",
    items: [
      { id: "explorer", label: "Explorer", href: "/explorer", icon: Search },
      { id: "favoris", label: "Favoris", href: "/client/favoris", icon: Heart },
    ],
  },
  {
    label: "Mon suivi",
    items: [
      { id: "visites", label: "Mes visites", href: "/client/visites", icon: CalendarDays },
      { id: "demandes", label: "Mes demandes", href: "/client/demandes", icon: ClipboardList },
      { id: "locations", label: "Mes locations", href: "/client/contrats", icon: House },
    ],
  },
  {
    label: "Échanges",
    items: [
      { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
      { id: "messages", label: "Messages", href: "/messages", icon: MessageCircle },
    ],
  },
  {
    label: "Mon compte",
    items: [
      { id: "profil", label: "Profil", href: "/client/profil", icon: UserRound },
      { id: "parametres", label: "Paramètres", href: "/client/parametres", icon: Settings2 },
    ],
  },
];

export function ClientDashboard() {
  const { ready, account, signOut } = useAuth();
  const visitor = useVisitor();
  const workflow = useWorkflow();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  const favoriteProperties = useMemo(
    () => visitor.favorites.map((id) => PROPERTIES.find((property) => property.id === id)).filter(isProperty),
    [visitor.favorites],
  );
  const recommendations = useMemo(
    () =>
      account && visitor.ready
        ? selectRecommendations(account, visitor.favorites, visitor.searches)
        : [],
    [account, visitor.favorites, visitor.ready, visitor.searches],
  );
  const profileLines = useMemo(
    () => (account ? describeProfile(account.roles, account.profile) : []),
    [account],
  );
  const recentVisits = useMemo(() => [...workflow.data.visits].sort((a, b) => `${a.date} ${a.slot}`.localeCompare(`${b.date} ${b.slot}`)).slice(0, 3), [workflow.data.visits]);
  const recentApplications = useMemo(() => [...workflow.data.applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 3), [workflow.data.applications]);
  const activeRentals = workflow.data.applications.filter((application) => application.stage === "active");
  const recentMessages = useMemo(() => [...workflow.data.messages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3), [workflow.data.messages]);
  const unreadWorkflowNotifications = useMemo(
    () => (workflow.ready ? workflow.data.notifications.filter((entry) => !entry.read) : []),
    [workflow.data.notifications, workflow.ready],
  );
  const pendingActions = (account && !account.emailVerified ? 1 : 0) + unreadWorkflowNotifications.length;
  const currentThemeIsDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileNavOpen(false);
      mobileMenuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  const handleNavigation = () => setMobileNavOpen(false);

  if (!ready) return <ClientLoading />;
  if (!account) return <ClientSignIn />;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <aside
        aria-label="Navigation de l’espace client"
        className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-homera-night text-homera-paper lg:flex"
      >
        <div className="px-6 pb-5 pt-7">
          <Link href="/" className="inline-flex flex-col" aria-label="HOMERA — retourner à l’accueil public">
            <span className="homera-brand text-brand text-white">Homera</span>
            <span className="mt-1 text-micro font-semibold uppercase tracking-[0.22em] text-homera-amber">
              Espace client
            </span>
          </Link>
        </div>

        <DashboardNavigation
          currentPath={pathname}
          favoriteCount={visitor.ready ? visitor.favorites.length : 0}
          notificationCount={pendingActions}
          onNavigate={handleNavigation}
          tone="night"
        />

        <div className="mt-auto border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-serif text-body-sm text-homera-amber">
              {initials(account.prenom, account.nom)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-note font-semibold text-white">
                {account.prenom} {account.nom}
              </p>
              <p className="truncate text-caption text-white/65">{rolesLabel(account.roles)}</p>
            </div>
            <Link
              href="/client/profil"
              aria-label="Ouvrir mon profil"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-note text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Se déconnecter
          </button>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-10 items-center gap-2 px-3 text-caption text-white/55 transition-colors hover:text-homera-amber"
          >
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            Retour au site HOMERA
          </Link>
        </div>
      </aside>

      <div className="min-h-svh lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex h-[4.5rem] max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={mobileMenuButtonRef}
                type="button"
                aria-expanded={mobileNavOpen}
                aria-controls="client-mobile-navigation"
                aria-label={mobileNavOpen ? "Fermer la navigation" : "Ouvrir la navigation"}
                onClick={() => setMobileNavOpen((open) => !open)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta lg:hidden"
              >
                {mobileNavOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
              </button>
              <Link href="/" className="flex flex-col lg:hidden" aria-label="HOMERA, accueil">
                <span className="homera-brand text-brand-sm text-foreground">Homera</span>
                <span className="-mt-0.5 text-micro font-semibold uppercase tracking-[0.16em] homera-accent-ink">
                  Espace client
                </span>
              </Link>
              <div className="hidden min-w-0 lg:block">
                <p className="text-caption font-semibold uppercase tracking-[0.16em] text-muted">Espace client</p>
                <p className="mt-0.5 truncate text-note text-foreground">
                  Accueil <span className="px-1 text-muted-light">/</span> Bonjour {account.prenom}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/explorer"
                className="homera-press hidden min-h-10 items-center gap-2 rounded-btn homera-cta px-4 text-note font-medium text-white sm:inline-flex"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                Nouvelle recherche
              </Link>
              <Link
                href="/notifications"
                aria-label={
                  pendingActions > 0
                    ? `Notifications, ${pendingActions} action à traiter`
                    : "Notifications"
                }
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
              >
                <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
                {pendingActions > 0 && (
                  <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-homera-terracotta px-1 text-micro font-semibold leading-none text-white">
                    {pendingActions}
                  </span>
                )}
              </Link>
              <div className="hidden items-center gap-2.5 pl-1 sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-homera-cream-dark text-note font-semibold text-homera-brown">
                  {initials(account.prenom, account.nom)}
                </span>
                <span className="hidden max-w-28 truncate text-note font-semibold md:block">{account.prenom}</span>
              </div>
            </div>
          </div>
        </header>

        {mobileNavOpen && (
          <>
            <button
              type="button"
              aria-label="Fermer la navigation"
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-homera-night/35 lg:hidden"
            />
            <div
              id="client-mobile-navigation"
              className="fixed inset-x-3 top-[4.75rem] z-50 max-h-[calc(100svh-5.5rem)] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-card-hover)] lg:hidden"
            >
              <DashboardNavigation
                currentPath={pathname}
                favoriteCount={visitor.ready ? visitor.favorites.length : 0}
                notificationCount={pendingActions}
                onNavigate={handleNavigation}
                tone="light"
              />
              <div className="mt-2 border-t border-border px-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setMobileNavOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-note text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Se déconnecter
                </button>
              </div>
            </div>
          </>
        )}

        <main id="contenu-client" className="mx-auto max-w-[1500px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8 xl:px-9">
          <section
            id="accueil"
            aria-labelledby="client-welcome-title"
            className="scroll-mt-24 overflow-hidden rounded-3xl bg-homera-night text-white"
          >
            <div className="relative isolate">
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_14%,rgba(224,164,94,.22),transparent_25%),radial-gradient(circle_at_70%_100%,rgba(179,80,44,.42),transparent_36%),linear-gradient(120deg,var(--homera-night)_0%,var(--homera-night-soft)_68%,var(--homera-brown)_100%)]"
              />
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:p-10">
                <div>
                  <p className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.2em] text-homera-amber">
                    <span className="h-1.5 w-1.5 rounded-full bg-homera-amber" aria-hidden="true" />
                    Votre espace personnel
                  </p>
                  <h1 id="client-welcome-title" className="mt-4 max-w-2xl font-serif text-display-lg text-white sm:text-display-xl">
                    Bonjour, {account.prenom}.
                  </h1>
                  <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-white/75 sm:text-body">
                    Vos recherches, vos biens favoris et les prochaines étapes de votre projet immobilier, réunis au même endroit.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/explorer"
                      className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn homera-cta-night px-4 text-note font-semibold text-white"
                    >
                      Explorer les biens
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                      href="/client/favoris"
                      className="inline-flex min-h-11 items-center gap-2 rounded-btn border border-white/20 bg-white/[0.06] px-4 text-note font-medium text-white transition-colors hover:bg-white/[0.12]"
                    >
                      <Heart className="h-4 w-4 text-homera-amber" aria-hidden="true" />
                      Voir mes favoris
                    </Link>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-caption font-semibold uppercase tracking-[0.16em] text-white/60">Votre projet</p>
                      <p className="mt-2 font-serif text-display-xs text-white">
                        {projectLabel(account.profile.projet) || "À préciser"}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-homera-amber/15 text-homera-amber">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-caption text-white/75">
                    {account.emailVerified ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-homera-amber" aria-hidden="true" />
                    ) : (
                      <MailCheck className="h-4 w-4 shrink-0 text-homera-amber" aria-hidden="true" />
                    )}
                    <span>{account.emailVerified ? "Adresse e-mail confirmée" : "Adresse e-mail à confirmer"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-info/20 bg-info/[0.06] px-4 py-3.5 text-note leading-relaxed text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
            <p>
              <span className="font-semibold">Mode pilote local.</span> Vos favoris et recherches restent dans ce navigateur. Les visites, demandes, locations, messages et alertes automatiques seront reliés à l’API avant d’être présentés comme actifs.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <OverviewMetric
              href="/client/favoris"
              icon={Heart}
              label="Biens favoris"
              value={visitor.ready ? String(favoriteProperties.length) : "—"}
              hint="Dans ce navigateur"
            />
            <OverviewMetric
              href="/client/favoris"
              icon={Search}
              label="Recherches récentes"
              value={visitor.ready ? String(visitor.searches.length) : "—"}
              hint="Enregistrées ici"
            />
            <OverviewMetric
              href="/client/profil"
              icon={ShieldCheck}
              label="État du compte"
              value={account.emailVerified ? "Confirmé" : "À vérifier"}
              hint={rolesLabel(account.roles)}
            />
            <OverviewMetric
              href="/notifications"
              icon={BellRing}
              label="Notifications"
              value={pendingActions > 0 ? `${pendingActions} non lue${pendingActions > 1 ? "s" : ""}` : "À venir"}
              hint={
                !account.emailVerified
                  ? "Confirmez votre adresse"
                  : unreadWorkflowNotifications.length > 0
                    ? "Activité de votre espace"
                    : "Alertes automatiques non actives"
              }
            />
          </div>

          <div className="mt-7 grid gap-5 xl:grid-cols-12">
            <DashboardPanel
              id="recherches"
              icon={Search}
              eyebrow="À reprendre"
              title="Recherches récentes"
              description="Retrouvez les critères que vous avez enregistrés."
              action={{ href: "/explorer", label: "Explorer", external: true }}
              className="xl:col-span-7"
            >
              {!visitor.ready ? (
                <PanelLoading label="Lecture de vos recherches…" />
              ) : visitor.searches.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="Aucune recherche enregistrée"
                  description="Lancez une recherche dans le catalogue, puis enregistrez vos critères pour les retrouver ici."
                  action={{ href: "/explorer", label: "Commencer une recherche" }}
                />
              ) : (
                <ul className="space-y-2.5">
                  {visitor.searches.slice(0, 3).map((search) => (
                    <li key={search.id}>
                      <Link
                        href={search.href}
                        className="group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-border bg-background/65 px-3.5 py-3 transition-colors hover:border-homera-terracotta/40 hover:bg-surface-hover sm:px-4"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta">
                          <Search className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-note font-semibold text-foreground">{search.label}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-muted">
                            <span>{countLabel(safeCount(search.count))}</span>
                            {search.savedAt && <span>· Enregistrée le {formatDay(search.savedAt)}</span>}
                          </span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-homera-terracotta" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>

            <DashboardPanel
              id="notifications"
              icon={BellRing}
              eyebrow="Centre de notifications"
              title="Notifications"
              description={pendingActions > 0 ? `${pendingActions} action à traiter sur votre compte.` : "Votre point de contact pour les alertes HOMERA."}
              action={{ href: "/client/parametres", label: "Préférences" }}
              className="xl:col-span-5"
            >
              <div className="space-y-3">
                {!account.emailVerified && (
                  <div className="rounded-2xl border border-warning/30 bg-warning/[0.08] p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                        <MailCheck className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-note font-semibold text-foreground">Adresse e-mail à confirmer</p>
                        <p className="mt-1 text-caption leading-relaxed text-muted">
                          Le code de vérification du pilote s’affiche dans votre espace de confirmation — aucun e-mail automatique n’est envoyé.
                        </p>
                        <Link
                          href="/verification-email"
                          className="homera-underline mt-2 inline-flex min-h-8 items-center gap-1.5 text-caption font-semibold homera-accent-ink"
                        >
                          Saisir le code <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {unreadWorkflowNotifications.slice(0, 2).map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href || "/notifications"}
                    className="block rounded-2xl border border-homera-terracotta/25 bg-homera-terracotta/[0.05] p-3.5 transition-colors hover:border-homera-terracotta/45"
                  >
                    <p className="text-note font-semibold text-foreground">{notification.title}</p>
                    <p className="mt-1 text-caption leading-relaxed text-muted">{notification.body}</p>
                  </Link>
                ))}

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info/[0.08] text-info">
                      <Info className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-note font-semibold text-foreground">
                        {AUTOMATIC_ALERTS_CAPABILITY?.available ? "Alertes automatiques" : "Alertes automatiques à venir"}
                      </p>
                      <p className="mt-1 text-caption leading-relaxed text-muted">
                        {AUTOMATIC_ALERTS_CAPABILITY?.detail ?? "Les alertes de nouvelles annonces seront disponibles avec l’API."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-caption">
                  <span className="text-muted">Votre préférence à l’inscription</span>
                  <span className="font-semibold text-foreground">
                    {account.notify ? "Accord donné pour les alertes" : "Alertes non demandées"}
                  </span>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel
              id="favoris"
              icon={Heart}
              eyebrow="Votre sélection"
              title="Biens favoris"
              description="Les biens mis de côté pendant votre exploration."
              action={{ href: "/client/favoris", label: "Tout voir", external: true }}
              className="xl:col-span-7"
            >
              {!visitor.ready ? (
                <PanelLoading label="Lecture de vos favoris…" />
              ) : favoriteProperties.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="Votre sélection est encore vide"
                  description="Ajoutez un bien à vos favoris avec le cœur sur sa fiche ou sa carte."
                  action={{ href: "/explorer", label: "Découvrir les biens" }}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {favoriteProperties.slice(0, 2).map((property) => (
                    <PropertyCard key={property.id} property={property} layout="grid" />
                  ))}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              id="visites"
              icon={CalendarDays}
              eyebrow="Votre agenda"
              title="Prochaines visites"
              description="Les rendez-vous liés à votre projet immobilier."
              badge={<AvailabilityBadge>Prototype local</AvailabilityBadge>}
              className="xl:col-span-5"
            >
              {!workflow.ready ? <PanelLoading label="Lecture de votre agenda…" /> : recentVisits.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Aucune visite programmée"
                  description="Demandez une date et un créneau, puis suivez la réponse de l’agent dans votre agenda local."
                  action={{ href: "/client/visites/nouvelle", label: "Demander une visite" }}
                />
              ) : <div className="space-y-3">{recentVisits.map((visit) => <Link key={visit.id} href="/client/visites" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3 transition-colors hover:border-homera-terracotta/35"><span className="min-w-0"><span className="block truncate text-note font-semibold text-foreground">{visit.propertyTitle}</span><span className="mt-1 block text-caption text-muted">{formatDay(visit.date)} · {visit.slot} · {visit.propertyRef}</span></span><StatusBadge status={visit.status} /></Link>)}<Link href="/client/visites" className="inline-flex min-h-9 items-center text-caption font-semibold text-homera-terracotta hover:underline">Toutes mes visites <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" /></Link></div>}
            </DashboardPanel>

            <DashboardPanel
              id="demandes"
              icon={ClipboardList}
              eyebrow="En cours de traitement"
              title="Mes demandes"
              description="Demandes d’information et dossiers rattachés à votre compte."
              badge={<AvailabilityBadge>Prototype local</AvailabilityBadge>}
              className="xl:col-span-6"
            >
              {!workflow.ready ? <PanelLoading label="Lecture de vos demandes…" /> : recentApplications.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Aucune demande en cours"
                  description="Après une visite terminée, déposez une candidature et suivez l’étude du dossier jusqu’à la remise des clés."
                  action={{ href: "/client/demandes", label: "Mes demandes" }}
                />
              ) : <div className="space-y-3">{recentApplications.map((application) => <Link key={application.id} href="/client/demandes" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3 transition-colors hover:border-homera-terracotta/35"><span className="min-w-0"><span className="block truncate text-note font-semibold text-foreground">{application.propertyTitle}</span><span className="mt-1 block text-caption text-muted">Dossier {application.id} · {formatDay(application.submittedAt)}</span></span><StatusBadge status={application.stage} /></Link>)}<Link href="/client/demandes" className="inline-flex min-h-9 items-center text-caption font-semibold text-homera-terracotta hover:underline">Toutes mes demandes <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" /></Link></div>}
            </DashboardPanel>

            <DashboardPanel
              id="locations"
              icon={House}
              eyebrow="Mon logement"
              title="Location active"
              description="Contrat, échéances et informations de votre logement."
              badge={<AvailabilityBadge>Prototype local</AvailabilityBadge>}
              className="xl:col-span-6"
            >
              {!workflow.ready ? <PanelLoading label="Lecture de vos contrats…" /> : activeRentals.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Aucune location active"
                  description="Après acceptation et signature, les informations de votre logement apparaîtront ici."
                  action={{ href: "/client/contrats", label: "Mes contrats" }}
                />
              ) : <div className="space-y-3">{activeRentals.map((application) => <Link key={application.id} href="/client/contrats" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-4 transition-colors hover:border-homera-terracotta/35"><span className="min-w-0"><span className="block truncate text-note font-semibold text-foreground">{application.propertyTitle}</span><span className="mt-1 block text-caption text-muted">{application.propertyRef} · depuis {formatDay(application.submittedAt)}</span></span><StatusBadge status={application.stage} /></Link>)}</div>}
            </DashboardPanel>

            <DashboardPanel
              id="recommandations"
              icon={Sparkles}
              eyebrow="Sélection HOMERA"
              title="Recommandations pour vous"
              description="Une sélection du catalogue selon votre projet déclaré, vos recherches récentes et vos favoris."
              action={{ href: "/explorer", label: "Tout explorer", external: true }}
              className="xl:col-span-12"
            >
              {!visitor.ready ? (
                <PanelLoading label="Préparation de vos recommandations…" />
              ) : recommendations.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="Votre sélection est complète"
                  description="Tous les biens du catalogue sont déjà dans vos favoris. Revenez explorer les nouvelles annonces dès leur publication."
                  action={{ href: "/explorer", label: "Revoir le catalogue" }}
                />
              ) : (
                <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {recommendations.map((property) => (
                    <li key={property.id} className="h-full">
                      <PropertyCard property={property} layout="grid" />
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>

            <DashboardPanel
              id="messages"
              icon={MessageCircle}
              eyebrow="Échanges"
              title="Messages"
              description="Retrouvez ici les échanges liés à vos biens et à vos demandes."
              badge={<AvailabilityBadge>Prototype local</AvailabilityBadge>}
              className="xl:col-span-5"
            >
              {!workflow.ready ? <PanelLoading label="Lecture de vos échanges…" /> : recentMessages.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title="Aucun échange dans cet espace"
                  description="Créez une conversation rattachée à un bien et à sa référence HOMERA. Les messages de démonstration restent locaux."
                  action={{ href: "/messages", label: "Ouvrir la messagerie" }}
                />
              ) : <div className="space-y-2">{recentMessages.map((thread) => { const lastMessage = thread.messages[thread.messages.length - 1]; return <Link key={thread.id} href="/messages" className="block rounded-2xl border border-border bg-background/60 p-3 transition-colors hover:border-homera-terracotta/35"><span className="flex items-center justify-between gap-3"><span className="truncate text-note font-semibold text-foreground">{thread.propertyTitle}</span><span className="shrink-0 text-micro text-muted">{formatDay(thread.updatedAt)}</span></span><span className="mt-1 block truncate text-caption text-muted">{lastMessage?.body ?? "Conversation créée"}</span></Link>; })}<Link href="/messages" className="inline-flex min-h-9 items-center text-caption font-semibold text-homera-terracotta hover:underline">Ouvrir la messagerie <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" /></Link></div>}
            </DashboardPanel>

            <DashboardPanel
              id="profil"
              icon={UserRound}
              eyebrow="Identité et projet"
              title="Mon profil"
              description="Les informations enregistrées pour ce compte dans ce navigateur."
              action={{ href: "/client/profil", label: "Modifier mon profil", external: true }}
              className="xl:col-span-7"
            >
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background/60 p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full homera-cta font-serif text-display-xs text-white">
                  {initials(account.prenom, account.nom)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-foreground">
                    {account.prenom} {account.nom}
                  </p>
                  <p className="mt-0.5 truncate text-caption text-muted">{account.email}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-semibold ${
                    account.emailVerified
                      ? "border-success/25 bg-success/[0.08] text-success"
                      : "border-warning/30 bg-warning/[0.08] text-warning"
                  }`}
                >
                  {account.emailVerified ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                  {account.emailVerified ? "Adresse confirmée" : "À confirmer"}
                </span>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <ProfileItem label="Téléphone" value={maskPhone(account.telephone)} />
                <ProfileItem label="Rôles du compte" value={rolesLabel(account.roles)} />
                <ProfileItem label="Rôle principal" value={roleDefinition(account.role).label} />
                {profileLines.map((line) => (
                  <ProfileItem key={line.name} label={line.label} value={line.value} />
                ))}
              </dl>
              <p className="mt-4 border-t border-border pt-3 text-caption leading-relaxed text-muted">
                Compte créé le {formatDay(account.createdAt)}. Les changements de profil seront éditables depuis cet espace avec l’API.
              </p>
            </DashboardPanel>

            <DashboardPanel
              id="parametres"
              icon={Settings2}
              eyebrow="Préférences"
              title="Paramètres"
              description="Quelques réglages disponibles dès maintenant dans le pilote."
              className="xl:col-span-12"
            >
              <div className="grid gap-3 md:grid-cols-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4">
                  <div>
                    <p className="text-note font-semibold text-foreground">Thème d’affichage</p>
                    <p className="mt-1 text-caption text-muted">
                      {resolvedTheme ? (currentThemeIsDark ? "Mode sombre" : "Mode clair") : "Thème du système"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTheme(currentThemeIsDark ? "light" : "dark")}
                    aria-label={currentThemeIsDark ? "Passer au mode clair" : "Passer au mode sombre"}
                    aria-pressed={currentThemeIsDark}
                    className="homera-press inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 text-caption font-semibold text-foreground hover:border-homera-terracotta hover:text-homera-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-terracotta"
                  >
                    {currentThemeIsDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                    {currentThemeIsDark ? "Clair" : "Sombre"}
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-note font-semibold text-foreground">Alertes de nouvelles annonces</p>
                  <p className="mt-1 text-caption leading-relaxed text-muted">
                    {account.notify
                      ? "Vous avez donné votre accord à l’inscription. Les envois automatiques ne sont pas actifs dans le pilote."
                      : "Vous n’avez pas demandé d’alertes à l’inscription. Leur gestion sera disponible avec l’API."}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-note font-semibold text-foreground">Données et confidentialité</p>
                  <p className="mt-1 text-caption leading-relaxed text-muted">
                    Comptes, favoris et recherches sont conservés dans ce navigateur, sans synchronisation serveur.
                  </p>
                  <Link
                    href="/legal"
                    className="homera-underline mt-2 inline-flex min-h-8 items-center gap-1.5 text-caption font-semibold homera-accent-ink"
                  >
                    Lire les informations légales <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </DashboardPanel>
          </div>

        </main>
      </div>
    </div>
  );
}

function DashboardNavigation({
  currentPath,
  favoriteCount,
  notificationCount,
  onNavigate,
  tone,
}: {
  currentPath: string;
  favoriteCount: number;
  notificationCount: number;
  onNavigate: () => void;
  tone: "light" | "night";
}) {
  const dark = tone === "night";
  return (
    <nav aria-label="Navigation de l’espace client" className={`min-h-0 flex-1 overflow-y-auto px-3 ${dark ? "pb-4" : "pb-2"}`}>
      {CLIENT_NAV.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          <p className={`mb-2 px-3 text-micro font-semibold uppercase tracking-[0.18em] ${dark ? "text-white/55" : "text-muted"}`}>
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
              const count = item.id === "favoris" ? favoriteCount : item.id === "notifications" ? notificationCount : 0;
              const className = `group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-note font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                dark
                  ? active
                    ? "bg-homera-paper text-homera-brown focus-visible:ring-homera-amber"
                    : "text-white/75 hover:bg-white/[0.07] hover:text-white focus-visible:ring-homera-amber"
                  : active
                    ? "bg-homera-terracotta/[0.09] text-homera-terracotta focus-visible:ring-homera-terracotta"
                    : "text-foreground hover:bg-surface-hover focus-visible:ring-homera-terracotta"
              }`;
              const content = (
                <>
                  <Icon
                    className={`h-[17px] w-[17px] shrink-0 ${
                      active
                        ? dark
                          ? "text-homera-terracotta"
                          : "text-homera-terracotta"
                        : dark
                          ? "text-white/60 group-hover:text-homera-amber"
                          : "text-muted group-hover:text-homera-terracotta"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                  {count > 0 && (
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-micro font-semibold tabular-nums ${
                        item.id === "notifications"
                          ? dark
                            ? "bg-homera-amber text-homera-night"
                            : "bg-warning text-white"
                          : dark
                            ? "bg-white/12 text-white/80"
                            : "bg-homera-terracotta/[0.1] homera-accent-ink"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                  {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />}
                </>
              );
              return (
                <li key={item.id}>
                  <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={className}>
                    {content}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function OverviewMetric({
  href,
  icon: Icon,
  label,
  value,
  hint,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group min-h-[7.2rem] rounded-2xl border border-border bg-card p-4 transition-colors hover:border-homera-terracotta/35 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-medium text-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta transition-colors group-hover:bg-homera-terracotta group-hover:text-white">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 truncate font-serif text-display-xs text-foreground sm:text-display-sm">{value}</p>
      <p className="mt-0.5 truncate text-micro text-muted sm:text-caption">{hint}</p>
    </Link>
  );
}

function DashboardPanel({
  id,
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  badge,
  className = "",
  children,
}: {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  action?: { href: string; label: string; external?: boolean };
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-24 min-w-0 rounded-card border border-border bg-card p-4 shadow-[0_4px_18px_rgba(62,36,24,0.035)] sm:p-5 xl:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta">
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-micro font-semibold uppercase tracking-[0.17em] homera-accent-ink">{eyebrow}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2 id={`${id}-title`} className="font-serif text-display-xs text-foreground">{title}</h2>
              {badge}
            </div>
            <p className="mt-1 text-caption leading-relaxed text-muted">{description}</p>
          </div>
        </div>
        {action && (
          <Link
            href={action.href}
            aria-label={action.label}
            className="homera-press inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-caption font-semibold text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            <span className="hidden sm:inline">{action.label}</span>
            <span className="sm:hidden" aria-hidden="true">{action.external ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}</span>
            <span className="hidden sm:inline" aria-hidden="true">
              {action.external ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </span>
          </Link>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AvailabilityBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-warning/25 bg-warning/[0.07] px-2 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-warning">
      {children}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-5 sm:px-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-homera-cream text-homera-brown">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-note font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-caption leading-relaxed text-muted">{description}</p>
          <Link
            href={action.href}
            className="homera-underline mt-2 inline-flex min-h-8 items-center gap-1.5 text-caption font-semibold homera-accent-ink"
          >
            {action.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="rounded-2xl border border-dashed border-border bg-background/50 p-5">
      <p className="sr-only">{label}</p>
      <div className="homera-skeleton h-10 w-full" />
      <div className="homera-skeleton mt-3 h-10 w-4/5" />
    </div>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-micro font-semibold uppercase tracking-[0.15em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-note font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ClientLoading() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 text-foreground">
      <div aria-busy="true" aria-live="polite" className="w-full max-w-md rounded-card border border-border bg-card p-7 text-center">
        <p className="sr-only">Lecture de votre espace client…</p>
        <div className="homera-brand text-brand-sm homera-accent-ink">Homera</div>
        <h1 className="mt-6 font-serif text-display-xs text-foreground">Votre espace client</h1>
        <div className="homera-skeleton mx-auto mt-4 h-8 w-2/3" />
        <div className="homera-skeleton mx-auto mt-3 h-4 w-full" />
        <div className="homera-skeleton mx-auto mt-2 h-4 w-4/5" />
      </div>
    </main>
  );
}

function ClientSignIn() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border bg-background/90 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex flex-col" aria-label="HOMERA, accueil">
            <span className="homera-brand text-brand-sm text-foreground">Homera</span>
            <span className="-mt-0.5 text-micro font-semibold uppercase tracking-[0.16em] homera-accent-ink">Espace client</span>
          </Link>
          <Link href="/explorer" className="homera-underline inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink">
            Explorer le catalogue <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main className="grid flex-1 place-items-center px-4 py-12">
        <section className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)] sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-homera-terracotta/[0.08] text-homera-terracotta">
            <UserRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-5 text-caption font-semibold uppercase tracking-[0.2em] homera-accent-ink">Votre espace personnel</p>
          <h1 className="mt-3 font-serif text-display-md sm:text-display-lg">Connectez-vous à votre espace client.</h1>
          <p className="mx-auto mt-4 max-w-xl text-body-sm leading-relaxed text-muted">
            Retrouvez vos favoris et vos recherches enregistrées. Le compte du pilote est conservé dans ce navigateur ; les autres services s’ouvriront avec l’API.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/connexion" className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn homera-cta px-5 text-note font-semibold text-white">
              Se connecter <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/inscription?role=client" className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-background px-5 text-note font-semibold text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta">
              Créer un compte
            </Link>
          </div>
          <p className="mt-6 border-t border-border pt-4 text-caption leading-relaxed text-muted">
            Vos favoris restent aussi consultables sans compte sur <Link href="/favoris" className="homera-underline font-semibold homera-accent-ink">la page Favoris</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}

function isProperty(property: Property | undefined): property is Property {
  return Boolean(property);
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function formatDay(value: string): string {
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function projectLabel(value: string | undefined): string {
  if (value === "investir") return "Investir";
  if (value === "acheter" || value === "louer" || value === "sejour") {
    return value === "sejour" ? "Séjourner" : value[0].toUpperCase() + value.slice(1);
  }
  return "";
}

function queryFromSavedSearch(search: SavedSearch | undefined) {
  if (!search) return null;
  const question = search.href.indexOf("?");
  return parseCatalogQuery(question < 0 ? "" : search.href.slice(question + 1));
}

function budgetLimit(budget: string | undefined): number | null {
  switch (budget) {
    case "location-100":
      return 100_000;
    case "location-500":
      return 500_000;
    case "achat-25":
      return 25_000_000;
    case "achat-75":
      return 75_000_000;
    default:
      return null;
  }
}

function selectRecommendations(account: PublicAccount, favoriteIds: string[], searches: SavedSearch[]): Property[] {
  const recentQuery = queryFromSavedSearch(searches[0]);
  const declaredProject = account.profile.projet;
  const declaredIntent: PropertyIntent | null =
    declaredProject === "investir"
      ? "acheter"
      : PROPERTY_INTENTS.includes(declaredProject as PropertyIntent)
        ? (declaredProject as PropertyIntent)
        : null;
  const preferredIntent = declaredIntent ?? recentQuery?.intent ?? null;
  const declaredType = account.profile.bienRecherche;
  const preferredTypes: PropertyType[] = PROPERTY_TYPES.includes(declaredType as PropertyType)
    ? [declaredType as PropertyType]
    : recentQuery?.types ?? [];
  const preferredCity = recentQuery?.cities[0] ?? "";
  const maxPrice = budgetLimit(account.profile.budget);

  return PROPERTIES.filter((property) => !favoriteIds.includes(property.id))
    .map((property) => {
      let score = 0;
      if (preferredIntent && property.intent === preferredIntent) score += 6;
      if (preferredTypes.includes(property.type)) score += 4;
      if (preferredCity && property.city === preferredCity) score += 2;
      if (maxPrice !== null) score += property.price <= maxPrice ? 1 : -1;
      return { property, score };
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.property.publishedAt.localeCompare(first.property.publishedAt) ||
        first.property.title.localeCompare(second.property.title, "fr"),
    )
    .slice(0, 3)
    .map(({ property }) => property);
}

"use client";

import { useId, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Headphones,
  Heart,
  House,
  Info,
  LayoutDashboard,
  MailCheck,
  MessageCircle,
  Search,
  Settings2,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useVisitor } from "@/components/providers/VisitorProvider";
import { PropertyCard } from "@/components/catalog/PropertyCard";
import { Visual } from "@/components/ui/Visual";
import { PROPERTIES, type Property } from "@/lib/content";
import { CAPABILITIES, initials } from "@/lib/auth";
import { countLabel } from "@/lib/format";
import { selectRecommendations } from "@/lib/recommendations";
import { useServerResource } from "@/lib/use-server-resource";
import { VISIT_LABELS } from "@/components/workspace/VisitsSections";
import { APPLICATION_STATUS_LABELS } from "@/components/workspace/ApplicationSections";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import {
  isActiveApplication,
  isUpcomingVisit,
  todayISO,
} from "@/lib/client-badges";

const AUTOMATIC_ALERTS_CAPABILITY = CAPABILITIES.find((entry) => entry.id === "alertes");
/* Fonds décoratifs du tableau de bord : photos réelles du catalogue. */
const HERO_MEDIA = PROPERTIES.find((property) => property.type === "villa")?.media ?? "page-cotonou";
const BANNER_MEDIA =
  PROPERTIES.find((property) => property.type === "appartement")?.media ?? HERO_MEDIA;

type ServerVisit = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  status: string;
  date: string;
  time: string;
};

type ServerApplication = {
  id: string;
  reference: string;
  propertyTitle: string;
  propertyReference: string;
  status: string;
  createdAt: string;
};

type ServerConversation = {
  id: string;
  propertyTitle: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
};

type ServerNotification = {
  id: string;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
};

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

export const CLIENT_NAV: ClientNavGroup[] = [
  {
    label: "Espace personnel",
    items: [{ id: "accueil", label: "Tableau de bord", href: "/client", icon: LayoutDashboard }],
  },
  {
    label: "Découvrir",
    items: [
      { id: "explorer", label: "Explorer", href: "/explorer", icon: Search },
      { id: "favoris", label: "Mes favoris", href: "/client/favoris", icon: Heart },
    ],
  },
  {
    label: "Mon suivi",
    items: [
      { id: "visites", label: "Mes visites", href: "/client/visites", icon: CalendarDays },
      { id: "demandes", label: "Mes demandes", href: "/client/demandes", icon: ClipboardList },
      { id: "locations", label: "Mes locations", href: "/client/contrats", icon: House },
      { id: "paiements", label: "Mes paiements", href: "/client/paiements", icon: WalletCards },
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

const SHORTCUTS: { id?: string; label: string; href: string; icon: LucideIcon }[] = [
  { label: "Rechercher un bien", href: "/explorer", icon: Search },
  { label: "Déposer une demande", href: "/client/demandes/nouvelle", icon: ClipboardList },
  { label: "Mes favoris", href: "/client/favoris", icon: Heart },
  { id: "locations", label: "Mes locations", href: "/client/contrats", icon: House },
  { label: "Contacter un conseiller", href: "/contact", icon: Headphones },
  { id: "parametres", label: "Paramètres", href: "/client/parametres", icon: Settings2 },
];

const VISIT_TONE: Record<string, string> = {
  confirmee: "border-success/30 bg-success/[0.08] text-success",
  reprogrammee: "border-info/30 bg-info/[0.08] text-info",
  demandee: "border-warning/30 bg-warning/[0.08] text-warning",
  "en-attente": "border-warning/30 bg-warning/[0.08] text-warning",
  effectuee: "border-border bg-background text-muted",
  annulee: "border-error/25 bg-error/[0.06] text-error",
  refusee: "border-error/25 bg-error/[0.06] text-error",
  absence: "border-error/25 bg-error/[0.06] text-error",
};

type ActivityItem = {
  id: string;
  kind: "notification" | "message" | "demande";
  title: string;
  subtitle: string;
  at: string;
  href: string;
};

export function ClientDashboard() {
  return (
    <WorkspaceShell role="client" section="dashboard">
      <ClientDashboardContent />
    </WorkspaceShell>
  );
}

function ClientDashboardContent() {
  const { account } = useAuth();
  const visitor = useVisitor();

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
  /* Visites, candidatures, messages et notifications viennent du serveur,
     comme sur les pages dédiées : le tableau de bord ne montre jamais une
     copie locale qui pourrait contredire /client/visites. */
  const serverVisits = useServerResource<{ visits: ServerVisit[] }>("/api/visits");
  const serverApplications = useServerResource<{ applications: ServerApplication[] }>("/api/applications");
  const serverMessages = useServerResource<{ conversations: ServerConversation[] }>("/api/messages");
  const serverNotifications = useServerResource<{ items: ServerNotification[]; unread: number }>("/api/notifications");
  const today = todayISO();
  const upcomingVisits = useMemo(
    () =>
      [...(serverVisits.data?.visits ?? [])]
        .filter((visit) => isUpcomingVisit(visit, today))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
        .slice(0, 2),
    [serverVisits.data, today],
  );
  const activeApplications = useMemo(
    () => (serverApplications.data?.applications ?? []).filter(isActiveApplication),
    [serverApplications.data],
  );
  const unreadMessages = useMemo(
    () => (serverMessages.data?.conversations ?? []).reduce((total, thread) => total + (thread.unreadCount ?? 0), 0),
    [serverMessages.data],
  );
  const unreadNotifications = useMemo(
    () => (serverNotifications.data?.items ?? []).filter((entry) => !entry.read_at),
    [serverNotifications.data],
  );
  /* Activité récente : les faits datés du compte (notifications, messages,
     demandes), triés du plus frais au plus ancien. Rien d'inventé. */
  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...(serverNotifications.data?.items ?? []).map((entry) => ({
        id: `notification-${entry.id}`,
        kind: "notification" as const,
        title: entry.title,
        subtitle: entry.body,
        at: entry.created_at,
        href: entry.link || "/notifications",
      })),
      ...(serverMessages.data?.conversations ?? []).map((thread) => ({
        id: `message-${thread.id}`,
        kind: "message" as const,
        title: "Message reçu",
        subtitle: thread.lastMessagePreview || thread.propertyTitle,
        at: thread.lastMessageAt,
        href: "/messages",
      })),
      ...(serverApplications.data?.applications ?? []).map((application) => ({
        id: `demande-${application.id}`,
        kind: "demande" as const,
        title: `Demande ${application.reference}`,
        subtitle: `${application.propertyTitle} · ${APPLICATION_STATUS_LABELS[application.status] ?? application.status}`,
        at: application.createdAt,
        href: "/client/demandes",
      })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  }, [serverNotifications.data, serverMessages.data, serverApplications.data]);
  const activityLoading =
    serverNotifications.loading || serverMessages.loading || serverApplications.loading;

  if (!account) return null;

  return (
    <div>
      {!account.emailVerified && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/[0.08] px-4 py-3.5 text-note leading-relaxed text-foreground">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p>
            <span className="font-semibold">Confirmez votre adresse e-mail.</span> Le code de
            vérification du pilote s’affiche dans votre espace de confirmation — aucun e-mail
            automatique n’est envoyé.{" "}
            <Link href="/verification-email" className="homera-underline font-semibold homera-accent-ink">
              Saisir le code
            </Link>
          </p>
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid min-w-0 content-start gap-5">
          <section
            id="accueil"
            aria-labelledby="client-welcome-title"
            className="relative overflow-hidden rounded-3xl bg-homera-night text-white"
          >
            <div aria-hidden="true" className="absolute inset-0">
              <Visual
                mediaKey={HERO_MEDIA}
                alt=""
                sizes="(min-width: 1280px) 60rem, 100vw"
                veil="none"
                priority
                className="h-full w-full"
                imageClassName="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(20,12,8,.85)_25%,rgba(20,12,8,.45)_60%,rgba(20,12,8,.15))]" />
            </div>
            <div className="relative p-6 sm:p-8">
              <p className="text-caption font-semibold uppercase tracking-[0.2em] text-homera-amber">
                Bonjour, {account.prenom}{" "}
                <span aria-hidden="true">👋</span>
              </p>
              <h1 id="client-welcome-title" className="mt-3 max-w-xl font-serif text-display-md text-white sm:text-display-lg">
                Bienvenue sur votre espace client
              </h1>
              <p className="mt-2 max-w-xl text-body-sm leading-relaxed text-white/80">
                Suivez votre projet immobilier et accédez à toutes vos informations au même endroit.
              </p>
              <Link
                href="/explorer"
                className="homera-press mt-5 inline-flex min-h-11 items-center gap-2 rounded-btn bg-homera-amber px-5 text-note font-semibold text-homera-night transition-colors hover:bg-homera-amber/90"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Rechercher un bien
              </Link>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              id="favoris"
              href="/client/favoris"
              icon={Heart}
              label="Favoris"
              value={visitor.ready ? String(favoriteProperties.length) : "—"}
              linkLabel="Voir mes favoris"
              tone={{ chip: "bg-error/[0.08] text-error", link: "text-error" }}
            />
            <StatCard
              href="/client/visites"
              icon={CalendarDays}
              label="Visites à venir"
              value={serverVisits.loading ? "—" : String(countUpcoming(serverVisits.data?.visits ?? [], today))}
              linkLabel="Voir mon calendrier"
              tone={{ chip: "bg-info/[0.08] text-info", link: "text-info" }}
            />
            <StatCard
              id="demandes"
              href="/client/demandes"
              icon={ClipboardList}
              label="Demandes actives"
              value={serverApplications.loading ? "—" : String(activeApplications.length)}
              linkLabel="Voir mes demandes"
              tone={{ chip: "bg-success/[0.08] text-success", link: "text-success" }}
            />
            <StatCard
              id="messages"
              href="/messages"
              icon={MessageCircle}
              label="Messages non lus"
              value={serverMessages.loading ? "—" : String(unreadMessages)}
              linkLabel="Voir mes messages"
              tone={{ chip: "bg-homera-terracotta/[0.10] text-homera-terracotta", link: "text-homera-terracotta" }}
            />
          </div>

          <Panel
            title="Biens recommandés pour vous"
            subtitle="Des biens sélectionnés selon vos critères et votre historique de recherche."
            action={{ href: "/explorer", label: "Voir tous les biens" }}
          >
            {!visitor.ready ? (
              <PanelLoading label="Préparation de vos recommandations…" />
            ) : recommendations.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="Votre sélection est complète"
                description="Tous les biens du catalogue sont déjà dans vos favoris. Revenez explorer les nouvelles annonces dès leur publication."
                action={{ href: "/explorer", label: "Revoir le catalogue" }}
              />
            ) : (
              <div className="homera-noscrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-1">
                {recommendations.map((property) => (
                  <div key={property.id} className="w-60 shrink-0 snap-start sm:w-64">
                    <PropertyCard property={property} layout="grid" />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Panel
              id="visites"
              title="Prochaines visites"
              action={{ href: "/client/visites", label: "Voir tout" }}
            >
              {serverVisits.loading ? (
                <PanelLoading label="Lecture de votre agenda…" />
              ) : upcomingVisits.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Aucune visite à venir"
                  description="Demandez une date et un créneau, puis suivez la réponse de l’agent dans votre agenda."
                  action={{ href: "/client/visites/nouvelle", label: "Demander une visite" }}
                />
              ) : (
                <ul className="space-y-3">
                  {upcomingVisits.map((visit) => {
                    const property = PROPERTIES.find((entry) => entry.id === visit.propertyId);
                    return (
                      <li key={visit.id}>
                        <Link
                          href="/client/visites"
                          className="group flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3 transition-colors hover:border-homera-terracotta/35"
                        >
                          {property ? (
                            <span aria-hidden="true" className="block h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                              <Visual
                                mediaKey={property.media}
                                alt=""
                                sizes="56px"
                                veil="none"
                                className="h-full w-full"
                                imageClassName="h-full w-full object-cover"
                              />
                            </span>
                          ) : (
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-homera-cream text-homera-brown">
                              <CalendarDays className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-caption text-muted">
                              {formatVisitSlot(visit.date, visit.time)}
                            </span>
                            <span className="block truncate text-note font-semibold text-foreground">
                              {visit.propertyTitle}
                            </span>
                            <span className="mt-0.5 block truncate text-caption text-muted">
                              {property ? `${property.city} - ${property.district}` : visit.reference}
                            </span>
                          </span>
                          <span
                            className={`hidden shrink-0 rounded-full border px-2.5 py-1 text-micro font-semibold sm:inline-flex ${VISIT_TONE[visit.status] ?? "border-border bg-background text-muted"}`}
                          >
                            {VISIT_LABELS[visit.status] ?? visit.status}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-homera-terracotta" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Activité récente">
              {activityLoading ? (
                <PanelLoading label="Lecture de votre activité…" />
              ) : activityItems.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="Aucune activité récente"
                  description="Vos demandes, vos messages et vos notifications apparaîtront ici, du plus frais au plus ancien."
                  action={{ href: "/explorer", label: "Découvrir les biens" }}
                />
              ) : (
                <ul className="space-y-1">
                  {activityItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface-hover"
                      >
                        <ActivityIcon kind={item.kind} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-note font-semibold text-foreground">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block truncate text-caption text-muted">
                            {item.subtitle}
                          </span>
                        </span>
                        <span className="shrink-0 text-micro text-muted">{formatRelative(item.at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel
            id="recherches"
            title="Recherches récentes"
            subtitle="Retrouvez les critères que vous avez enregistrés."
            action={{ href: "/explorer", label: "Explorer" }}
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
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-homera-terracotta" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid min-w-0 content-start gap-5">
          <section
            id="profil"
            aria-labelledby="profil-title"
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-homera-terracotta/[0.10] font-serif text-display-xs text-homera-terracotta">
                {initials(account.prenom, account.nom)}
              </span>
              <span className="min-w-0 text-left">
                <span id="profil-title" className="block truncate text-body-sm font-semibold text-foreground">
                  {account.prenom} {account.nom}
                </span>
                <span className="block truncate text-caption text-muted">{account.email}</span>
              </span>
            </div>
            <p className="mt-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-semibold ${
                  account.emailVerified
                    ? "border-success/25 bg-success/[0.08] text-success"
                    : "border-warning/30 bg-warning/[0.08] text-warning"
                }`}
              >
                {account.emailVerified ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {account.emailVerified ? "Client actif" : "Adresse à confirmer"}
              </span>
            </p>
            <Link
              href="/client/profil"
              className="mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-btn border border-border px-3 text-note font-semibold text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              Voir mon profil <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>

          <Panel
            id="notifications"
            title="Notifications"
            action={{ href: "/notifications", label: "Voir tout" }}
          >
            {serverNotifications.loading ? (
              <PanelLoading label="Lecture de vos notifications…" />
            ) : unreadNotifications.length === 0 ? (
              <div>
                <p className="text-note leading-relaxed text-muted">Aucune notification non lue.</p>
                <Link
                  href="/notifications"
                  className="homera-underline mt-2 inline-flex min-h-8 items-center gap-1.5 text-caption font-semibold homera-accent-ink"
                >
                  Voir les notifications <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-1">
                {unreadNotifications.slice(0, 3).map((notification) => (
                  <li key={notification.id}>
                    <Link
                      href={notification.link || "/notifications"}
                      className="group flex items-start gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface-hover"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info/[0.08] text-info">
                        <Bell className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-note font-semibold text-foreground">
                          {notification.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-caption leading-relaxed text-muted">
                          {notification.body}
                        </span>
                        <span className="mt-1 block text-micro text-muted">
                          {formatRelative(notification.created_at)}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-homera-terracotta" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 rounded-2xl bg-background/60 p-3 text-caption leading-relaxed text-muted">
              <span className="flex items-start gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden="true" />
                {AUTOMATIC_ALERTS_CAPABILITY?.available
                  ? "Alertes automatiques activées sur ce compte."
                  : "Alertes automatiques à venir : seules les notifications de votre espace sont actives."}
              </span>
            </div>
          </Panel>

          <Panel id="raccourcis" title="Raccourcis">
            <ul className="grid grid-cols-2 gap-3">
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut.href + shortcut.label} id={shortcut.id}>
                  <Link
                    href={shortcut.href}
                    className="flex h-full min-h-[4.5rem] items-center gap-2.5 rounded-2xl border border-border bg-background/60 p-3 transition-colors hover:border-homera-terracotta/40 hover:bg-surface-hover"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-homera-terracotta/[0.08] text-homera-terracotta">
                      <shortcut.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-caption font-semibold leading-tight text-foreground">
                      {shortcut.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <section
            aria-labelledby="confier-title"
            className="relative overflow-hidden rounded-2xl bg-homera-night text-white"
          >
            <div aria-hidden="true" className="absolute inset-0">
              <Visual
                mediaKey={BANNER_MEDIA}
                alt=""
                sizes="(min-width: 1280px) 20rem, 100vw"
                veil="none"
                className="h-full w-full"
                imageClassName="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-homera-night/72" />
            </div>
            <div className="relative p-5">
              <h2 id="confier-title" className="font-serif text-display-xs text-white">
                Vous avez un bien à vendre ou à louer ?
              </h2>
              <p className="mt-2 text-caption leading-relaxed text-white/80">
                Confiez-le à HOMERA et touchez plus d’acheteurs et de locataires.
              </p>
              <Link
                href="/contact"
                className="homera-press mt-4 inline-flex min-h-10 items-center rounded-btn bg-homera-amber px-4 text-note font-semibold text-homera-night transition-colors hover:bg-homera-amber/90"
              >
                En savoir plus
              </Link>
            </div>
          </section>
        </div>
      </div>

      <span role="status" className="sr-only">
        {favoriteProperties.length} favoris · {upcomingVisits.length} visites à venir ·{" "}
        {activeApplications.length} demandes actives.
      </span>
    </div>
  );
}

function StatCard({
  id,
  href,
  icon: Icon,
  label,
  value,
  linkLabel,
  tone,
}: {
  id?: string;
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  linkLabel: string;
  tone: { chip: string; link: string };
}) {
  return (
    <div id={id} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.chip}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-note font-medium text-muted">{label}</p>
      </div>
      <p className="mt-3 font-serif text-display-md text-foreground">{value}</p>
      <Link
        href={href}
        className={`mt-1 inline-flex min-h-8 items-center gap-1 text-caption font-semibold ${tone.link}`}
      >
        {linkLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function Panel({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id={titleId} className="text-body font-semibold text-foreground">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-caption leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="inline-flex min-h-8 shrink-0 items-center gap-1 text-caption font-semibold text-homera-terracotta hover:underline"
          >
            {action.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  if (kind === "message") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-homera-terracotta/[0.10] text-homera-terracotta">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  if (kind === "demande") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/[0.08] text-success">
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info/[0.08] text-info">
      <Bell className="h-4 w-4" aria-hidden="true" />
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

function isProperty(property: Property | undefined): property is Property {
  return Boolean(property);
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function countUpcoming(visits: ServerVisit[], today: string): number {
  return visits.filter((visit) => isUpcomingVisit(visit, today)).length;
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

/** « jeu. 22 oct. 2026 · 10h00 » : le créneau tel que le serveur l'a enregistré. */
function formatVisitSlot(date: string, time: string): string {
  const day = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const weekday = Number.isNaN(day.getTime())
    ? ""
    : `${day.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" })} `;
  const hour = time.includes(":") ? time.replace(":", "h") : time;
  return `${weekday}${formatDay(date)} · ${hour}`;
}

/** « Il y a 2 heures » : l'âge réel d'un fait daté du compte. */
function formatRelative(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return formatDay(value);
  const elapsed = Date.now() - time;
  if (elapsed < 0) return formatDay(value);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "À l’instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} jour${days > 1 ? "s" : ""}`;
  return formatDay(value);
}

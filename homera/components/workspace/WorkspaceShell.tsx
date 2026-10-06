"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, CheckCheck,
  ClipboardCheck, ClipboardList, FileBadge, FileText, Heart, House, LayoutDashboard,
  LogOut, Menu, MessageCircle, Plus, Search, Settings2, ShieldCheck, UserRound,
  Users, WalletCards, X, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import { hasWorkspaceRole, initials, rolesLabel } from "@/lib/auth";
import type { AccountRole } from "@/lib/auth";
import { DEMO_VERIFICATION_CASES } from "@/lib/portal-data";
import type { AppNotification } from "@/lib/workflow";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice } from "@/components/workspace/Primitives";

export type WorkspaceRole = AccountRole | "admin" | "any";
export type WorkspaceSection = string;

type NavigationItem = { id: string; label: string; href: string; icon: LucideIcon; badge?: boolean };
type NavigationGroup = { label: string; items: NavigationItem[] };

function subscribeToNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
function getOnlineStatus() { return typeof navigator === "undefined" ? true : navigator.onLine; }
function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onChange);
  };
}
function getCurrentLocalUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

const NAV: Record<Exclude<WorkspaceRole, "any">, NavigationGroup[]> = {
  client: [
    { label: "Mon espace", items: [{ id: "dashboard", label: "Vue d’ensemble", href: "/client", icon: LayoutDashboard }] },
    { label: "Mon projet", items: [
      { id: "favoris", label: "Favoris", href: "/client/favoris", icon: Heart },
      { id: "visites", label: "Visites", href: "/client/visites", icon: CalendarDays },
      { id: "demandes", label: "Demandes", href: "/client/demandes", icon: ClipboardList },
      { id: "contrats", label: "Contrats", href: "/client/contrats", icon: FileText },
    ] },
    { label: "Échanges", items: [
      { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell, badge: true },
      { id: "messages", label: "Messages", href: "/messages", icon: MessageCircle },
    ] },
    { label: "Mon compte", items: [
      { id: "profil", label: "Profil", href: "/client/profil", icon: UserRound },
      { id: "parametres", label: "Paramètres", href: "/client/parametres", icon: Settings2 },
    ] },
  ],
  proprietaire: [
    { label: "Pilotage", items: [
      { id: "dashboard", label: "Dashboard", href: "/proprietaire", icon: LayoutDashboard },
      { id: "biens", label: "Mes biens", href: "/proprietaire/biens", icon: House },
      { id: "ajouter-bien", label: "Ajouter un bien", href: "/proprietaire/ajouter-bien", icon: Plus },
    ] },
    { label: "Opérations", items: [
      { id: "demandes", label: "Demandes", href: "/proprietaire/demandes", icon: ClipboardList },
      { id: "visites", label: "Visites", href: "/proprietaire/visites", icon: CalendarDays },
      { id: "locations", label: "Locations", href: "/proprietaire/locations", icon: WalletCards },
      { id: "agents", label: "Agents", href: "/proprietaire/agents", icon: Users },
      { id: "documents", label: "Documents", href: "/proprietaire/documents", icon: FileText },
    ] },
    { label: "Compte", items: [
      { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell, badge: true },
      { id: "messages", label: "Messages", href: "/messages", icon: MessageCircle },
      { id: "abonnement", label: "Abonnement", href: "/proprietaire/abonnement", icon: WalletCards },
      { id: "profil", label: "Profil", href: "/proprietaire/profil", icon: UserRound },
      { id: "parametres", label: "Paramètres", href: "/proprietaire/parametres", icon: Settings2 },
    ] },
  ],
  agent: [
    { label: "Pilotage", items: [
      { id: "dashboard", label: "Dashboard", href: "/agent", icon: LayoutDashboard },
      { id: "biens", label: "Biens autorisés", href: "/agent/biens", icon: House },
      { id: "visites", label: "Visites", href: "/agent/visites", icon: CalendarDays },
      { id: "clients", label: "Clients", href: "/agent/clients", icon: Users },
    ] },
    { label: "Gestion", items: [
      { id: "documents", label: "Documents", href: "/agent/documents", icon: FileText },
      { id: "autorisations", label: "Autorisations", href: "/agent/autorisations", icon: FileBadge },
      { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell, badge: true },
      { id: "messages", label: "Messages", href: "/messages", icon: MessageCircle },
      { id: "profil", label: "Profil", href: "/agent/profil", icon: UserRound },
    ] },
  ],
  admin: [
    { label: "Contrôle", items: [
      { id: "dashboard", label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { id: "utilisateurs", label: "Utilisateurs", href: "/admin/utilisateurs", icon: Users },
      { id: "proprietaires", label: "Propriétaires", href: "/admin/proprietaires", icon: UserRound },
      { id: "agents", label: "Agents", href: "/admin/agents", icon: ShieldCheck },
      { id: "biens", label: "Biens", href: "/admin/biens", icon: House },
      { id: "verifications", label: "Vérifications", href: "/admin/verifications", icon: ClipboardCheck, badge: true },
      { id: "visites", label: "Visites", href: "/admin/visites", icon: CalendarDays },
      { id: "demandes", label: "Demandes", href: "/admin/demandes", icon: ClipboardList },
      { id: "signalements", label: "Signalements", href: "/admin/signalements", icon: Activity },
    ] },
    { label: "Système", items: [
      { id: "documents", label: "Documents", href: "/admin/documents", icon: FileText },
      { id: "statistiques", label: "Statistiques", href: "/admin/statistiques", icon: Activity },
      { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell, badge: true },
      { id: "messages", label: "Messages", href: "/messages", icon: MessageCircle },
      { id: "parametres", label: "Paramètres", href: "/admin/parametres", icon: Settings2 },
    ] },
  ],
};

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  client: "Espace client",
  proprietaire: "Espace propriétaire",
  agent: "Espace agent",
  admin: "Administration",
  any: "Espace personnel",
};

export function WorkspaceShell({
  role,
  section,
  children,
}: {
  role: WorkspaceRole;
  section: WorkspaceSection;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { ready: authReady, account, signOut } = useAuth();
  const { ready: workflowReady, data, updateData, storageAvailable } = useWorkflow();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const offline = !useSyncExternalStore(subscribeToNetwork, getOnlineStatus, () => true);
  const unread = data.notifications.filter((entry) => !entry.read).length;
  const openVerificationCount = DEMO_VERIFICATION_CASES.filter((entry) =>
    ["a-examiner", "modification-demandee"].includes(data.verificationDecisions[entry.id] ?? entry.initialDecision),
  ).length + data.listings.filter((entry) =>
    ["en-verification", "modification-demandee"].includes(data.listingStatusOverrides[entry.id] ?? entry.status),
  ).length;
  const title = sectionTitle(role, section);
  const activeRoleForProfile = role === "client" || role === "proprietaire" || role === "agent"
    ? role
    : preferredRole(account?.roles ?? []);
  const navGroups = role === "any" ? anyNavigation(preferredRole(account?.roles ?? [])) : NAV[role];
  const currentHref = pathname || "/";

  useEffect(() => {
    if (!mobileOpen && !notificationsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (notificationsOpen) {
        setNotificationsOpen(false);
        notificationsButtonRef.current?.focus();
      }
      if (mobileOpen) {
        setMobileOpen(false);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!notificationsOpen) return;
      const target = event.target as Node | null;
      if (target && notificationsContainerRef.current && !notificationsContainerRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [mobileOpen, notificationsOpen]);

  const markRead = (id: string) => updateData((current) => ({
    ...current,
    notifications: current.notifications.map((entry) => entry.id === id ? { ...entry, read: true } : entry),
  }));
  const markAllRead = () => updateData((current) => ({
    ...current,
    notifications: current.notifications.map((entry) => ({ ...entry, read: true })),
  }));

  if (!authReady || !workflowReady) return <WorkspaceLoading />;
  if (!account) return <AccessState mode="signin" role={role} pathname={currentHref} />;
  if (role === "admin" && account.profile.demoRole !== "admin") return <AccessState mode="unauthorized" role={role} pathname={currentHref} />;
  if (role !== "admin" && role !== "any" && !hasWorkspaceRole(account.roles, role)) return <AccessState mode="unauthorized" role={role} pathname={currentHref} />;

  const renderedNavigation = (
    <nav aria-label={`Navigation ${ROLE_LABEL[role].toLowerCase()}`} className="flex-1 space-y-5 overflow-y-auto px-3 pb-5 pt-2">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-micro font-semibold uppercase tracking-[0.19em] text-white/45">{group.label}</p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = item.href === "/client" || item.href === "/proprietaire" || item.href === "/agent" || item.href === "/admin"
                ? currentHref === item.href
                : currentHref === item.href || currentHref.startsWith(`${item.href}/`);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-note transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white"}`}
                  >
                    <item.icon className={`h-[17px] w-[17px] shrink-0 ${active ? "text-homera-amber" : "text-white/55 group-hover:text-white"}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge && item.id !== "verifications" && unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-homera-terracotta px-1.5 text-micro font-semibold text-white">{unread}</span>}
                    {item.id === "verifications" && role === "admin" && openVerificationCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-homera-amber px-1.5 text-micro font-semibold text-homera-night">{openVerificationCount}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="workspace-shell min-h-svh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col bg-homera-night text-homera-paper lg:flex">
        <div className="px-6 pb-5 pt-7">
          <Link href="/" className="inline-flex flex-col" aria-label="HOMERA, accueil public">
            <span className="homera-brand text-brand text-white">Homera</span>
            <span className="mt-1 text-micro font-semibold uppercase tracking-[0.2em] text-homera-amber">{ROLE_LABEL[role]}</span>
          </Link>
        </div>
        {renderedNavigation}
        <div className="mt-auto border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-serif text-body-sm text-homera-amber">{initials(account.prenom, account.nom)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-note font-semibold text-white">{account.prenom} {account.nom}</span>
              <span className="block truncate text-caption text-white/60">{rolesLabel(account.roles)}</span>
            </span>
            <Link href={profileHref(activeRoleForProfile)} aria-label="Ouvrir mon profil" className="flex h-9 w-9 items-center justify-center rounded-xl text-white/65 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber"><UserRound className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <button type="button" onClick={signOut} className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-note text-white/65 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber"><LogOut className="h-4 w-4" aria-hidden="true" />Se déconnecter</button>
          <Link href="/" className="mt-1 inline-flex min-h-10 items-center gap-2 px-3 text-caption text-white/50 transition-colors hover:text-homera-amber"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Retour au site</Link>
        </div>
      </aside>

      <div className="min-h-svh lg:pl-[268px]">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex h-[4.4rem] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" aria-label={mobileOpen ? "Fermer la navigation" : "Ouvrir la navigation"} aria-expanded={mobileOpen} aria-controls={mobileOpen ? "workspace-mobile-nav" : undefined} onClick={() => setMobileOpen((open) => !open)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground lg:hidden">
                {mobileOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
              </button>
              <Link href="/" className="flex flex-col lg:hidden" aria-label="HOMERA, accueil"><span className="homera-brand text-brand-sm text-foreground">Homera</span><span className="-mt-0.5 text-micro font-semibold uppercase tracking-[0.15em] text-homera-terracotta">{ROLE_LABEL[role]}</span></Link>
              <div className="hidden min-w-0 lg:block">
                <p className="text-caption font-semibold uppercase tracking-[0.17em] text-muted">{ROLE_LABEL[role]}</p>
                <p className="mt-0.5 truncate text-note text-foreground">{title} <span className="px-1 text-muted-light">/</span> {account.prenom}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {role === "admin" && <span className="hidden rounded-full border border-warning/30 bg-warning/[0.08] px-3 py-1.5 text-caption font-semibold text-warning sm:inline-flex">Aperçu pilote</span>}
              <Link href="/explorer" className="hidden min-h-10 items-center gap-2 rounded-btn homera-cta px-3.5 text-note font-medium text-white sm:inline-flex"><Search className="h-3.5 w-3.5" aria-hidden="true" />Explorer</Link>
              <div ref={notificationsContainerRef} className="relative">
                <button ref={notificationsButtonRef} type="button" aria-label={unread ? `Notifications, ${unread} non lues` : "Notifications"} aria-expanded={notificationsOpen} aria-controls={notificationsOpen ? "workspace-notifications-menu" : undefined} onClick={() => setNotificationsOpen((open) => !open)} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-homera-terracotta hover:text-homera-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
                  {unread > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-homera-terracotta" />}
                </button>
                {notificationsOpen && <div id="workspace-notifications-menu" className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card-hover)]" role="region" aria-label="Notifications récentes">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-1 pb-3"><div><p className="text-note font-semibold">Notifications</p><p className="text-caption text-muted">{unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}</p></div><button type="button" onClick={markAllRead} disabled={!unread} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-caption font-semibold text-homera-terracotta disabled:cursor-not-allowed disabled:opacity-45"><CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />Tout lire</button></div>
                  {data.notifications.length ? <ul className="max-h-72 divide-y divide-border overflow-y-auto">{data.notifications.slice(0, 4).map((notification) => <li key={notification.id}><NotificationLine notification={notification} onRead={() => markRead(notification.id)} compact /></li>)}</ul> : <p className="px-2 py-5 text-caption leading-relaxed text-muted">Vos confirmations de visite, de demande et de contrat apparaîtront ici.</p>}
                  <Link href="/notifications" onClick={() => setNotificationsOpen(false)} className="mt-2 flex min-h-10 items-center justify-between rounded-xl px-2 text-note font-semibold text-homera-terracotta hover:bg-surface-hover">Voir toutes les notifications<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                </div>}
              </div>
              <div className="hidden items-center gap-2.5 sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-homera-cream-dark text-note font-semibold text-homera-brown">{initials(account.prenom, account.nom)}</span><span className="hidden max-w-28 truncate text-note font-semibold md:block">{account.prenom}</span></div>
            </div>
          </div>
        </header>

        {mobileOpen && <><button type="button" aria-label="Fermer la navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-homera-night/40 lg:hidden" /><div id="workspace-mobile-nav" className="fixed inset-x-3 top-[4.75rem] z-50 flex max-h-[calc(100svh-5.25rem)] flex-col overflow-hidden rounded-2xl border border-border bg-homera-night text-white shadow-[var(--shadow-card-hover)] lg:hidden"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="text-caption font-semibold uppercase tracking-[0.15em] text-homera-amber">{ROLE_LABEL[role]}</span><button type="button" onClick={() => setMobileOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10" aria-label="Fermer"><X className="h-4 w-4" aria-hidden="true" /></button></div>{renderedNavigation}<div className="border-t border-white/10 p-3"><button type="button" onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-note text-white/75 hover:bg-white/[0.07]"><LogOut className="h-4 w-4" aria-hidden="true" />Se déconnecter</button></div></div></>}

        <main id="workspace-main" className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 xl:px-9">
          {offline && <div className="mb-5 rounded-2xl border border-warning/30 bg-warning/[0.08] px-4 py-3 text-note text-foreground" role="status"><strong>Connexion perdue.</strong> Le prototype utilise vos données locales ; toute fonctionnalité serveur sera indisponible hors ligne.</div>}
          {!storageAvailable && <div className="mb-5 rounded-2xl border border-error/25 bg-error/[0.05] px-4 py-3 text-note text-error" role="alert"><strong>Stockage indisponible.</strong> Les changements restent en mémoire et seront perdus en fermant cet onglet.</div>}
          {role === "admin" && <div className="mb-5 rounded-2xl border border-warning/30 bg-warning/[0.07] px-4 py-3 text-caption leading-relaxed text-muted"><strong className="text-foreground">Mode aperçu administratif.</strong> L’accès et les décisions ci-dessous ne sont pas sécurisés côté serveur dans ce prototype.</div>}
          <DemoNotice />
          {children}
        </main>
      </div>
    </div>
  );
}

function NotificationLine({ notification, onRead, compact = false }: { notification: AppNotification; onRead: () => void; compact?: boolean }) {
  const content = <span className="min-w-0 flex-1"><span className="block text-note font-semibold text-foreground">{notification.title}</span><span className="mt-1 block text-caption leading-relaxed text-muted">{notification.body}</span><span className="mt-1 block text-caption text-muted-light">{formatDate(notification.createdAt)}</span></span>;
  return <div className={`flex items-start gap-2.5 rounded-xl px-2.5 py-3 ${notification.read ? "" : "bg-homera-terracotta/[0.045]"}`}>
    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? "bg-border" : "bg-homera-terracotta"}`} aria-hidden="true" />
    {notification.href ? <Link onClick={onRead} href={notification.href} className="min-w-0 flex-1 hover:underline">{content}</Link> : content}
    {!notification.read && <button type="button" onClick={onRead} className="shrink-0 rounded-md px-1.5 py-1 text-caption font-semibold text-homera-terracotta hover:bg-surface-hover">{compact ? "Marquer lue" : "Marquer comme lue"}</button>}
  </div>;
}

function AccessState({ mode, role, pathname }: { mode: "signin" | "unauthorized"; role: WorkspaceRole; pathname: string }) {
  const { signOut } = useAuth();
  const currentUrl = useSyncExternalStore(subscribeToLocation, getCurrentLocalUrl, () => pathname);
  const next = `?next=${encodeURIComponent(currentUrl)}`;
  const title = mode === "signin" ? "Connectez-vous pour continuer" : "Cet espace n’est pas encore activé";
  const description = mode === "signin"
    ? "Les visites, documents et messages restent associés à votre compte. Connectez-vous ou créez un compte pour ouvrir votre espace HOMERA."
    : role === "admin"
      ? "Ce compte ne possède pas l’accès administrateur de démonstration. Déconnectez-vous puis utilisez l’identifiant admin pour ouvrir cet espace."
      : `Votre compte n’a pas le rôle requis pour ${ROLE_LABEL[role].toLowerCase()}. Les rôles propriétaire et agent se demandent depuis l’inscription; vous pouvez aussi revenir à votre espace client.`;
  return <main className="grid min-h-svh place-items-center bg-background px-4 py-12 text-foreground"><div className="w-full max-w-xl rounded-card border border-border bg-card p-7 text-center shadow-[var(--shadow-card)] sm:p-10"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-homera-terracotta/[0.09] text-homera-terracotta"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></span><p className="mt-5 text-caption font-semibold uppercase tracking-[0.16em] text-homera-terracotta">{ROLE_LABEL[role]}</p><h1 className="mt-2 font-serif text-display-sm">{title}</h1><p className="mt-3 text-body-sm leading-relaxed text-muted">{description}</p><div className="mt-7 flex flex-wrap justify-center gap-3">{mode === "signin" ? <><Link href={`/connexion${next}`} className={BUTTON_PRIMARY}>Se connecter</Link><Link href={`/inscription${next}`} className={BUTTON_SECONDARY}>Créer un compte</Link></> : <><Link href={`/inscription${next}`} className={BUTTON_PRIMARY}>Découvrir les rôles</Link><Link href="/client" className={BUTTON_SECONDARY}>Espace client</Link><button type="button" onClick={signOut} className={BUTTON_SECONDARY}>Se déconnecter pour changer de compte</button></>}</div><Link href="/" className="mt-6 inline-flex min-h-10 items-center gap-2 text-caption font-medium text-muted hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Retour au site public</Link></div></main>;
}

function WorkspaceLoading() {
  return <main className="min-h-svh bg-background p-5 text-foreground sm:p-10"><div className="mx-auto max-w-6xl" aria-busy="true" aria-label="Chargement de votre espace"><div className="homera-skeleton h-12 w-48" /><h1 className="mt-10 font-serif text-display-sm">Chargement de votre espace HOMERA</h1><div className="mt-4 homera-skeleton h-6 w-1/2" /><div className="mt-10 grid gap-4 sm:grid-cols-3"><div className="homera-skeleton h-32" /><div className="homera-skeleton h-32" /><div className="homera-skeleton h-32" /></div><p className="mt-5 text-caption text-muted">Chargement de vos données locales…</p></div></main>;
}

function preferredRole(roles: AccountRole[]): Exclude<WorkspaceRole, "any" | "admin"> {
  return roles.includes("proprietaire") ? "proprietaire" : roles.includes("agent") ? "agent" : "client";
}

function anyNavigation(role: Exclude<WorkspaceRole, "any" | "admin">): NavigationGroup[] {
  return [
    { label: "Espace", items: [{ id: "workspace", label: "Mon tableau de bord", href: role === "client" ? "/client" : `/${role}`, icon: LayoutDashboard }] },
    { label: "Échanges", items: [
      { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell, badge: true },
      { id: "messages", label: "Messages", href: "/messages", icon: MessageCircle },
    ] },
    { label: "Compte", items: [{ id: "profil", label: "Profil", href: profileHref(role), icon: UserRound }] },
  ];
}

function profileHref(role: Exclude<WorkspaceRole, "any" | "admin">): string {
  return role === "client" ? "/client/profil" : `/${role}/profil`;
}

function sectionTitle(role: WorkspaceRole, section: string): string {
  if (section === "dashboard") return role === "admin" ? "Tableau de bord" : "Vue d’ensemble";
  const labels: Record<string, string> = {
    favoris: "Favoris", visites: "Visites", demandes: "Demandes", contrats: "Contrats", biens: "Mes biens",
    "ajouter-bien": "Ajouter un bien", locations: "Locations", agents: "Agents", documents: "Documents",
    autorisations: "Autorisations", clients: "Clients", verifications: "Vérifications", utilisateurs: "Utilisateurs",
    proprietaires: "Propriétaires", signalements: "Signalements", statistiques: "Statistiques", notifications: "Notifications",
    messages: "Messages", profil: "Profil", parametres: "Paramètres", abonnement: "Abonnement",
  };
  return labels[section] ?? "Espace HOMERA";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "À l’instant";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

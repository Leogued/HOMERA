"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { navPanelId, PUBLIC_NAV, type NavEntry } from "@/lib/nav";
import { AccountControl, AccountMobileLinks } from "@/components/auth/AccountControl";
import { onScrollFrame, useMounted } from "@/lib/motion";
import { TextRoll } from "@/components/ui/TextRoll"; /* ================================================================== HOMERA — EN-TÊTE DES PAGES PUBLIQUES ------------------------------------------------------------------ L’accueil garde son en-tête transparent posé sur la vidéo. Toutes les autres pages publiques partagent celui-ci : même mot-symbole, même navigation, mêmes panneaux déroulants — mais une surface lisible, parce que ces pages commencent sur du crème, pas sur une image. Rien n’est réservé aux comptes : chaque entrée mène à une page consultable librement. « Se connecter » annonce simplement l’espace à venir (voir /connexion). ================================================================== */ /** Identifiant de panneau stable (utilisé par aria-controls). */
function panelId(title: string) {
  return `public-menu-${navPanelId(title)}`;
}
export function PublicHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const mounted = useMounted();
  const { setTheme, resolvedTheme } = useTheme();
  const closeTimer = useRef<number | null>(null);
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isDark = resolvedTheme === "dark";
  /* --- Voile de lisibilité dès que la page défile --- */ useEffect(() => {
    let previous = false;
    return onScrollFrame(() => {
      const next = window.scrollY > 12;
      if (next !== previous) {
        previous = next;
        setScrolled(next);
      }
    });
  }, []);
  /* --- Ouverture / fermeture avec intention (pas de clignotement) --- */ const openWithIntent = (title: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpenMenu(title);
  };
  const closeWithIntent = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 140);
  };
  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );
  /* --- Échap referme ; un clic extérieur aussi --- */ useEffect(() => {
    if (!openMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const title = openMenu;
      setOpenMenu(null);
      triggerRefs.current[title]?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRefs.current[openMenu]?.contains(target)) return;
      const inTrigger = Object.values(triggerRefs.current).some((node) => node?.parentElement?.contains(target));
      if (!inTrigger) setOpenMenu(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openMenu]);
  /* --- Menu mobile : scroll verrouillé, focus contenu puis rendu --- */ useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const page = [...document.querySelectorAll<HTMLElement>("main, footer")];
    const previousInert = page.map((element) => element.inert);
    page.forEach((element) => {
      element.inert = true;
    });
    mobilePanelRef.current?.querySelector<HTMLElement>("[data-mobile-first]")?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = [
        ...(mobilePanelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), [tabindex='0']") ??
          []),
      ].filter((element) => !element.closest("[inert]") && element.getClientRects().length > 0);
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (
        event.shiftKey &&
        (document.activeElement === first || !mobilePanelRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !mobilePanelRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      page.forEach((element, index) => {
        element.inert = previousInert[index];
      });
      previousFocus?.focus({ preventScroll: true });
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);
  // Un changement de page referme les menus : cet état ne peut pas être
  // calculé pendant le rendu, il suit donc la navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    setMobileSection(null);
    setOpenMenu(null);
  }, [pathname]);
  const isActive = (entry: NavEntry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`);
  return (
    <header
      className="homera-public-header sticky top-0 z-[70] border-b border-border/70 backdrop-blur-md"
      data-scrolled={scrolled}
    >
      {" "}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {" "}
        <Link href="/" className="flex items-center gap-2.5" aria-label="HOMERA, accueil">
          {" "}
          <span className="homera-brand text-brand-sm text-foreground">Homera</span>{" "}
          <span className="hidden text-micro font-semibold uppercase tracking-[0.18em] text-homera-terracotta sm:inline">
            {" "}
            Bénin{" "}
          </span>{" "}
        </Link>{" "}
        {/* Navigation — desktop */}{" "}
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {" "}
          {PUBLIC_NAV.map((entry) => {
            const open = openMenu === entry.title;
            const active = isActive(entry);
            return (
              <div
                key={entry.title}
                className="relative"
                onMouseEnter={() => entry.children && openWithIntent(entry.title)}
                onMouseLeave={closeWithIntent}
              >
                {" "}
                {entry.children ? (
                  <button
                    type="button"
                    ref={(node) => {
                      triggerRefs.current[entry.title] = node;
                    }}
                    aria-expanded={open}
                    aria-haspopup="true"
                    aria-controls={panelId(entry.title)}
                    onClick={() => setOpenMenu(open ? null : entry.title)}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowDown") return;
                      event.preventDefault();
                      setOpenMenu(entry.title);
                      requestAnimationFrame(() =>
                        panelRefs.current[entry.title]?.querySelector<HTMLElement>("[data-roving-item]")?.focus(),
                      );
                    }}
                    className={`homera-press inline-flex items-center gap-1 rounded-full px-3 py-2 text-note font-medium transition-colors ${active || open ? "text-homera-terracotta" : "text-foreground hover:text-homera-terracotta"}`}
                  >
                    {" "}
                    <TextRoll>{entry.title}</TextRoll>{" "}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                    />{" "}
                  </button>
                ) : (
                  <Link
                    href={entry.href}
                    onClick={() => setOpenMenu(null)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-note font-medium transition-colors ${active ? "text-homera-terracotta" : "text-foreground hover:text-homera-terracotta"}`}
                  >
                    {" "}
                    <TextRoll>{entry.title}</TextRoll>{" "}
                  </Link>
                )}{" "}
                {entry.children && (
                  <div
                    id={panelId(entry.title)}
                    inert={!open}
                    className={`absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-2 transition-all duration-[320ms] ease-standard ${open ? "pointer-events-auto visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1.5 opacity-0"}`}
                  >
                    {" "}
                    <div
                      ref={(node) => {
                        panelRefs.current[entry.title] = node;
                      }}
                      role="menu"
                      aria-label={entry.title}
                      onKeyDown={(event) => {
                        const items = Array.from(
                          event.currentTarget.querySelectorAll<HTMLElement>("[data-roving-item]"),
                        );
                        const index = items.indexOf(event.target as HTMLElement);
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          items[(index + 1) % items.length]?.focus();
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          items[(index - 1 + items.length) % items.length]?.focus();
                        } else if (event.key === "Home" || event.key === "End") {
                          event.preventDefault();
                          items[event.key === "Home" ? 0 : items.length - 1]?.focus();
                        }
                      }}
                      className="homera-dropdown-enter homera-noscrollbar max-h-[22rem] overflow-y-auto rounded-menu border border-border bg-card p-2 shadow-[0_28px_60px_-30px_rgba(28,17,11,0.45)]"
                    >
                      {" "}
                      {entry.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          role="menuitem"
                          data-roving-item
                          onClick={() => setOpenMenu(null)}
                          className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5 text-note font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                        >
                          {" "}
                          <span>{child.label}</span>{" "}
                          {child.hint && <span className="text-caption font-normal text-muted">{child.hint}</span>}{" "}
                        </Link>
                      ))}{" "}
                    </div>{" "}
                  </div>
                )}{" "}
              </div>
            );
          })}{" "}
        </nav>{" "}
        {/* Actions */}{" "}
        <div className="flex items-center gap-2">
          {" "}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
              aria-label={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
              title={isDark ? "Mode clair" : "Mode sombre"}
            >
              {" "}
              {isDark ? (
                <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
              ) : (
                <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
              )}{" "}
            </button>
          )}{" "}
          <span className="hidden sm:inline-flex">
            {" "}
            <AccountControl />{" "}
          </span>{" "}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground lg:hidden"
            aria-label="Ouvrir le menu"
            aria-expanded={mobileOpen}
            aria-controls="homera-public-mobile-menu"
          >
            {" "}
            <Menu className="h-5 w-5" aria-hidden="true" />{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Menu mobile — plein écran, opaque */}{" "}
      <div
        id="homera-public-mobile-menu"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
        className={`fixed inset-0 z-[90] lg:hidden ${mobileOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"}`}
      >
        {" "}
        <div className="absolute inset-0 bg-homera-night" aria-hidden="true" />{" "}
        <div
          ref={mobilePanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu HOMERA"
          className={`relative flex h-full flex-col transition-all duration-[280ms] ease-standard ${mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"}`}
        >
          {" "}
          <div className="flex items-center justify-between px-5 pt-5">
            {" "}
            <Link href="/" className="homera-brand text-brand-compact text-white">
              Homera
            </Link>{" "}
            <button
              type="button"
              data-mobile-first
              onClick={() => setMobileOpen(false)}
              className="homera-press rounded-xl border border-white/12 bg-white/8 p-2.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber"
              aria-label="Fermer le menu"
            >
              {" "}
              <X className="h-5 w-5" aria-hidden="true" />{" "}
            </button>{" "}
          </div>{" "}
          <nav
            aria-label="Navigation mobile"
            className="homera-noscrollbar mt-4 flex-1 overflow-y-auto overscroll-contain px-5 pb-6"
          >
            {" "}
            <ul className="space-y-1.5">
              {" "}
              {PUBLIC_NAV.map((entry) => {
                const open = mobileSection === entry.title;
                return (
                  <li key={entry.title}>
                    {" "}
                    {entry.children ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => setMobileSection(open ? null : entry.title)}
                          aria-expanded={open}
                          aria-controls={`mobile-${panelId(entry.title)}`}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-body font-medium transition-colors ${open ? "border-homera-terracotta/40 bg-white/8 text-white" : "border-white/10 bg-white/[0.04] text-white/90"}`}
                        >
                          {" "}
                          {entry.title}{" "}
                          <ChevronDown
                            aria-hidden="true"
                            className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180 text-homera-amber" : "text-white/50"}`}
                          />{" "}
                        </button>{" "}
                        <div
                          id={`mobile-${panelId(entry.title)}`}
                          inert={!open}
                          className={`grid overflow-hidden transition-all duration-[420ms] ease-standard ${open ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                        >
                          {" "}
                          <ul className="min-h-0 space-y-1 border-l border-white/10 pl-3">
                            {" "}
                            <li>
                              {" "}
                              <Link
                                href={entry.href}
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-xl px-3 py-2.5 text-body-sm font-medium text-homera-amber transition-colors hover:bg-white/8"
                              >
                                {" "}
                                Voir toute la page {entry.title}{" "}
                              </Link>{" "}
                            </li>{" "}
                            {entry.children.map((child) => (
                              <li key={child.href}>
                                {" "}
                                <Link
                                  href={child.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="block rounded-xl px-3 py-2.5 text-body-sm text-white/80 transition-colors hover:bg-white/8 hover:text-white"
                                >
                                  {" "}
                                  {child.label}{" "}
                                </Link>{" "}
                              </li>
                            ))}{" "}
                          </ul>{" "}
                        </div>{" "}
                      </>
                    ) : (
                      <Link
                        href={entry.href}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-body font-medium text-white/90 transition-colors hover:bg-white/8"
                      >
                        {" "}
                        {entry.title}{" "}
                      </Link>
                    )}{" "}
                  </li>
                );
              })}{" "}
            </ul>{" "}
          </nav>{" "}
          <div className="space-y-3 border-t border-white/10 bg-homera-night px-5 pb-8 pt-5">
            {" "}
            <Link
              href="/explorer"
              onClick={() => setMobileOpen(false)}
              className="homera-press homera-sheen flex w-full items-center justify-center rounded-full homera-cta-night py-3.5 text-body-sm font-medium text-white"
            >
              {" "}
              Explorer les biens vérifiés{" "}
            </Link>{" "}
            <AccountMobileLinks onNavigate={() => setMobileOpen(false)} />{" "}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-pressed={isDark}
                className="homera-press flex w-full items-center justify-between rounded-2xl border border-white/12 px-4 py-3 text-body-sm font-medium text-white/90"
              >
                {" "}
                <span className="inline-flex items-center gap-2.5">
                  {" "}
                  {isDark ? (
                    <Sun className="h-4 w-4 text-homera-amber" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4 text-homera-cream" aria-hidden="true" />
                  )}{" "}
                  {isDark ? "Passer en mode clair" : "Passer en mode sombre"}{" "}
                </span>{" "}
                <span
                  aria-hidden="true"
                  className={`relative h-5 w-9 shrink-0 rounded-full border border-white/20 transition-colors duration-300 ${isDark ? "bg-homera-terracotta/70" : "bg-white/12"}`}
                >
                  {" "}
                  <span
                    className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white transition-all duration-300 ease-standard ${isDark ? "left-[1.15rem]" : "left-[3px]"}`}
                  />{" "}
                </span>{" "}
              </button>
            )}{" "}
            <p className="pt-1 text-center text-caption text-white/45">
              {" "}
              Cotonou · Abomey-Calavi · Porto-Novo · Ouidah{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </header>
  );
}

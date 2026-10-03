"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { onScrollFrame, useMotionPreferences, useMounted } from "@/lib/motion";
import { navPanelId, PUBLIC_NAV, type NavEntry } from "@/lib/nav";
import { AccountControl, AccountMobileLinks } from "@/components/auth/AccountControl";
import { TextRoll } from "@/components/ui/TextRoll"; /* ================================================================== HOMERA — EN-TÊTE DE L’ACCUEIL ------------------------------------------------------------------ Règles invariantes conservées : • le header reste transparent en toutes circonstances (aucun fond opaque, aucun passage au blanc quand on change de thème) ; • le hero reste l’écran d’accueil, le header y est intégré. Ce qui a changé avec les pages publiques : les entrées du menu sont de vraies adresses (Explorer, Acheter, Louer, Séjour, Services, À propos, Contact) au lieu d’ancres internes. Les dropdowns mènent aux pages de catégories — tout est consultable sans compte. ================================================================== */ /** Identifiant de panneau stable (l’accueil conserve menu-acheter, etc.). */
function panelId(title: string) {
  return `menu-${navPanelId(title)}`;
} /** Voile de verre : présent dès que l’on quitte le hero, retiré en remontant. */
function useHeaderState() {
  const [state, setState] = useState({ scrolled: false, compactHeader: false });
  useEffect(() => {
    let previousY = window.scrollY;
    let directionTravel = 0;
    let compactHeader = previousY > 28;
    return onScrollFrame(() => {
      const y = window.scrollY;
      const delta = y - previousY;
      previousY = y;
      if (Math.sign(delta) !== Math.sign(directionTravel)) directionTravel = 0;
      directionTravel += delta;
      if (y < 28) compactHeader = false;
      else if (directionTravel > 18) compactHeader = true;
      else if (directionTravel < -18) compactHeader = false;
      const scrolled = y > 28;
      setState((current) =>
        current.scrolled === scrolled && current.compactHeader === compactHeader
          ? current
          : { scrolled, compactHeader },
      );
    });
  }, []);
  return state;
}
export function Navbar() {
  const { scrolled, compactHeader } = useHeaderState();
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const mounted = useMounted();
  const { reduced } = useMotionPreferences();
  const closeTimer = useRef<number | null>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isDark = resolvedTheme === "dark";
  /* --- Ouverture/fermeture avec intention (pas de clignotement) --- */ const openWithIntent = (title: string) => {
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
  /* --- Échap referme ; clic extérieur referme --- */ useEffect(() => {
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
    const page = [...document.querySelectorAll<HTMLElement>("main, footer, .homera-chapter-rail")];
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
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileSection(null);
  }, [pathname]);
  const isActive = (entry: NavEntry) =>
    entry.href !== "/" && (pathname === entry.href || pathname.startsWith(`${entry.href}/`));
  return (
    <header
      className={`homera-header homera-on-dark fixed inset-x-0 top-0 w-full border-0 bg-transparent text-white ${mobileOpen ? "z-[100]" : "z-50"}`}
      data-scrolled={scrolled}
    >
      {" "}
      {/* Voile de verre — purement décoratif, jamais opaque */}{" "}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-[opacity,backdrop-filter] duration-[650ms] ease-standard data-[scrolled=true]:opacity-100 data-[scrolled=true]:backdrop-blur-[14px] data-[scrolled=true]:backdrop-saturate-150"
        data-scrolled={scrolled}
      >
        {" "}
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,12,8,0.62)] via-[rgba(20,12,8,0.28)] to-transparent" />{" "}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />{" "}
      </div>{" "}
      <div
        className={`homera-header-container relative mx-auto flex items-center justify-between px-4 transition-[padding] duration-[650ms] ease-standard sm:px-8 xl:px-12 2xl:px-16 lg:grid lg:grid-cols-3 ${compactHeader ? "py-2.5" : "py-4"}`}
      >
        {" "}
        {/* Mot-symbole HOMERA */}{" "}
        <Link href="/" className="group flex items-center" aria-label="HOMERA, accueil">
          {" "}
          <span
            className={`homera-brand text-brand text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.65)] transition-transform duration-500 ease-standard group-hover:scale-[1.04] ${compactHeader ? "lg:text-brand-compact" : ""}`}
            style={{ transition: "transform 500ms var(--homera-ease), font-size 650ms var(--homera-ease)" }}
          >
            {" "}
            Homera{" "}
          </span>{" "}
        </Link>{" "}
        {/* Navigation — capsule centrée, dropdowns sobres */}{" "}
        <nav
          aria-label="Navigation principale"
          className="relative hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-note font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-sm lg:flex lg:justify-self-center xl:gap-4 xl:px-5 2xl:gap-5 2xl:px-6"
        >
          {" "}
          {PUBLIC_NAV.map((entry) => {
            const open = openMenu === entry.title;
            return (
              <div
                key={entry.title}
                className="group relative inline-flex flex-col items-center py-0.5"
                onMouseEnter={() => entry.children && openWithIntent(entry.title)}
                onMouseLeave={closeWithIntent}
              >
                {" "}
                {entry.children ? (
                  <button
                    ref={(node) => {
                      triggerRefs.current[entry.title] = node;
                    }}
                    type="button"
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
                    className={`inline-flex items-center gap-1 py-1 font-medium transition-colors duration-300 ${isActive(entry) || open ? "text-white" : "text-white/92 hover:text-white"}`}
                  >
                    {" "}
                    <TextRoll>{entry.title}</TextRoll>{" "}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 text-white/55 transition-transform duration-300 ease-standard group-hover:text-white ${open ? "rotate-180 text-white" : ""}`}
                    />{" "}
                  </button>
                ) : (
                  <Link
                    href={entry.href}
                    className={`inline-flex items-center gap-1 py-1 font-medium transition-colors duration-300 ${isActive(entry) ? "text-white" : "text-white/92 hover:text-white"}`}
                  >
                    {" "}
                    <TextRoll>{entry.title}</TextRoll>{" "}
                  </Link>
                )}{" "}
                {/* Indicateur d’onglet actif */}{" "}
                <span
                  aria-hidden="true"
                  className={`mt-0.5 h-px w-full origin-center bg-homera-terracotta transition-transform duration-500 ease-standard ${isActive(entry) ? "scale-x-100" : "scale-x-0"}`}
                />{" "}
                {entry.children && (
                  <div
                    id={panelId(entry.title)}
                    inert={!open}
                    className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 transition-all duration-[320ms] ease-standard ${open ? "pointer-events-auto visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1.5 opacity-0"}`}
                    onMouseEnter={() => openWithIntent(entry.title)}
                    onMouseLeave={closeWithIntent}
                  >
                    {" "}
                    <div
                      ref={(node) => {
                        panelRefs.current[entry.title] = node;
                      }}
                      role="menu"
                      data-open={open}
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
                      className={`homera-nav-panel homera-noscrollbar flex flex-col justify-center gap-0.5 overflow-y-auto rounded-menu border border-white/10 bg-homera-night-soft p-2 text-white shadow-[0_28px_60px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl ${entry.children.length > 4 ? "h-[13.5rem] w-[21rem]" : "w-[19rem]"}`}
                    >
                      {" "}
                      {entry.children.map((child, index) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          role="menuitem"
                          data-roving-item
                          onClick={() => setOpenMenu(null)}
                          style={{ "--nav-stagger": `${index * 35}ms` } as React.CSSProperties}
                          className="homera-nav-entry homera-underline flex w-full flex-col gap-0.5 whitespace-nowrap rounded-xl px-4 py-2 text-left text-note font-medium tracking-[0.01em] text-white/85 transition-colors duration-300 hover:bg-white/8 hover:text-white focus-visible:bg-white/8 focus-visible:text-white focus-visible:outline-none"
                        >
                          {" "}
                          <span>{child.label}</span>{" "}
                          {child.hint && <span className="text-caption font-normal text-white/50">{child.hint}</span>}{" "}
                        </Link>
                      ))}{" "}
                    </div>{" "}
                  </div>
                )}{" "}
              </div>
            );
          })}{" "}
        </nav>{" "}
        {/* Actions — desktop */}{" "}
        <div className="hidden items-center gap-2.5 lg:flex lg:justify-self-end">
          {" "}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white backdrop-blur-sm transition-colors hover:bg-white/14"
              aria-label={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
              title={isDark ? "Mode clair" : "Mode sombre"}
            >
              {" "}
              {isDark ? (
                <Sun className="h-[18px] w-[18px] text-homera-terracotta" aria-hidden="true" />
              ) : (
                <Moon className="h-[18px] w-[18px] text-homera-paper" aria-hidden="true" />
              )}{" "}
            </button>
          )}{" "}
          <AccountControl tone="night" />{" "}
        </div>{" "}
        {/* Commandes mobile */}{" "}
        <div className="flex items-center gap-2 lg:hidden">
          {" "}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="homera-press flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white"
              aria-label={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
            >
              {" "}
              {isDark ? (
                <Sun className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-homera-paper" aria-hidden="true" />
              )}{" "}
            </button>
          )}{" "}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="homera-press rounded-xl border border-white/10 bg-white/8 p-2 text-white transition-colors hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber"
            aria-label="Ouvrir le menu"
            aria-expanded={mobileOpen}
            aria-controls="homera-mobile-menu"
          >
            {" "}
            <Menu className="h-5 w-5" aria-hidden="true" />{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* ------------------------------------------------------------------ MENU MOBILE — plein écran, opaque ------------------------------------------------------------------ */}{" "}
      <div
        id="homera-mobile-menu"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
        className={`fixed inset-0 z-[70] lg:hidden ${mobileOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"}`}
      >
        {" "}
        <div className="absolute inset-0 bg-homera-night">
          {" "}
          <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle_at_20%_0%,rgba(198,93,59,0.9),transparent_58%),radial-gradient(circle_at_85%_18%,rgba(224,164,94,0.5),transparent_52%)]" />{" "}
        </div>{" "}
        <div
          ref={mobilePanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu HOMERA"
          className={`relative flex h-full flex-col transition-all duration-[280ms] ease-standard ${mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"} ${reduced ? "duration-200" : ""}`}
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
              {PUBLIC_NAV.map((entry, index) => {
                const open = mobileSection === entry.title;
                return (
                  <li
                    key={entry.title}
                    className={`transition-all duration-280 ease-standard ${mobileOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
                    style={{ transitionDelay: mobileOpen ? `${index * 28}ms` : "0ms" }}
                  >
                    {" "}
                    {entry.children ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => setMobileSection(open ? null : entry.title)}
                          aria-expanded={open}
                          aria-controls={`mobile-${panelId(entry.title)}`}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-body font-medium transition-colors duration-300 ${open ? "border-homera-terracotta/40 bg-white/8 text-white" : "border-white/10 bg-white/[0.04] text-white/90"}`}
                        >
                          {" "}
                          <TextRoll>{entry.title}</TextRoll>{" "}
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
            <AccountMobileLinks tone="night" onNavigate={() => setMobileOpen(false)} />{" "}
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

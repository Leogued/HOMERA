"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronDown, Menu, Moon, Sun, UserRound, X } from "lucide-react";
import { onScrollFrame, useActiveSection, useMounted, useMotionPreferences } from "@/lib/motion";
import { useSearch } from "@/components/providers/SearchProvider";
import { TextRoll } from "@/components/ui/TextRoll";
import { EMPTY_CRITERIA } from "@/lib/format";
import { INTENT_ACTIVE_EVENT, INTENT_EVENT } from "@/components/home/ExplorerSection";

/* ==================================================================
   HOMERA — EN-TÊTE
   ------------------------------------------------------------------
   Règles invariantes conservées :
   • le header reste transparent en toutes circonstances (aucun fond
     opaque, aucun passage au blanc quand on change de thème) ;
   • le hero reste l’écran d’accueil, le header y est intégré.

   Ce qui bouge : la lisibilité. Au défilement, un voile de verre très
   léger apparaît sous le contenu, la hauteur se réduit de quelques
   pixels, puis tout revient progressivement à l’état initial quand on
   remonte. Aucun rectangle opaque, aucune transition brutale.
   ================================================================== */

type SubItem = {
  label: string;
  href: string;
  /** Filtres appliqués à la sélection de biens quand on suit l’entrée. */
  criterion?: { project?: string; propertyType?: string };
  /** Service mis en avant dans l’écosystème (ancre interne). */
  serviceId?: string;
};

type NavItem = {
  title: string;
  href: string;
  /** Identifiant de la section suivie pour l’état actif. */
  section: string;
  /** Intention pilotée dans la scène « Explorer par intention ». */
  intentId?: string;
  submenu?: SubItem[];
};

const PROPERTY_CRITERION = {
  maison: { propertyType: "villa" },
  appartement: { propertyType: "appartement" },
  studio: { propertyType: "studio" },
  terrain: { propertyType: "terrain" },
  local: { propertyType: "local" },
} as const;

export const NAV_ITEMS: NavItem[] = [
  { title: "Explorer", href: "#explorer", section: "explorer" },
  {
    title: "Acheter",
    href: "#explorer",
    section: "explorer",
    intentId: "acheter",
    submenu: [
      { label: "Maisons", href: "#biens", criterion: { project: "acheter", ...PROPERTY_CRITERION.maison } },
      { label: "Appartements", href: "#biens", criterion: { project: "acheter", ...PROPERTY_CRITERION.appartement } },
      { label: "Terrains", href: "#biens", criterion: { project: "acheter", ...PROPERTY_CRITERION.terrain } },
      { label: "Locaux commerciaux", href: "#biens", criterion: { project: "acheter", ...PROPERTY_CRITERION.local } },
    ],
  },
  {
    title: "Louer",
    href: "#explorer",
    section: "explorer",
    intentId: "louer",
    submenu: [
      { label: "Maisons", href: "#biens", criterion: { project: "louer", ...PROPERTY_CRITERION.maison } },
      { label: "Appartements", href: "#biens", criterion: { project: "louer", ...PROPERTY_CRITERION.appartement } },
      { label: "Studios", href: "#biens", criterion: { project: "louer", ...PROPERTY_CRITERION.studio } },
      { label: "Locaux commerciaux", href: "#biens", criterion: { project: "louer", ...PROPERTY_CRITERION.local } },
    ],
  },
  {
    title: "Séjour",
    href: "#explorer",
    section: "explorer",
    intentId: "sejour",
    submenu: [
      {
        label: "À la nuitée",
        href: "#biens",
        criterion: { project: "sejour", propertyType: "appartement" },
      },
      {
        label: "Pour quelques jours",
        href: "#biens",
        criterion: { project: "sejour", propertyType: "appartement" },
      },
      {
        label: "Pour une courte période",
        href: "#biens",
        criterion: { project: "sejour" },
      },
    ],
  },
  {
    title: "Services",
    href: "#services",
    section: "services",
    submenu: [
      { label: "Gestion immobilière", href: "#services", serviceId: "gestion" },
      { label: "Maintenance & réparation", href: "#services", serviceId: "maintenance" },
      { label: "Déménagement", href: "#services", serviceId: "demenagement" },
      { label: "Travaux & aménagement", href: "#services", serviceId: "travaux" },
    ],
  },
];

/** Sections suivies par le rail et l’état actif du menu. */
const SECTIONS = [
  "hero",
  "chiffres",
  "explorer",
  "biens",
  "bien-homera",
  "protocole",
  "services",
  "magazine",
  "manifeste",
] as const;

const SERVICES_EVENT = "homera:focus-service";

/** Identifiant de panneau stable et unique (plusieurs entrées peuvent
    partager la même section cible : « Acheter », « Louer », « Séjour »). */
function panelId(item: NavItem) {
  const key = item.intentId ?? item.title;
  return `menu-${key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Voile de verre : présent dès que l’on quitte le hero, retiré en remontant. */
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
      setState((current) => current.scrolled === scrolled && current.compactHeader === compactHeader
        ? current : { scrolled, compactHeader });
    });
  }, []);
  return state;
}

export function Navbar() {
  const { scrolled, compactHeader } = useHeaderState();
  const activeSection = useActiveSection(SECTIONS);
  const { reduced } = useMotionPreferences();
  const { applySearch } = useSearch();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const mounted = useMounted();
  const [activeService, setActiveService] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const { setTheme, resolvedTheme } = useTheme();

  const closeTimer = useRef<number | null>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const isDark = resolvedTheme === "dark";

  /* --- Thème : l’en-tête reste transparent dans les deux modes --- */
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  /* --- Intention dominante (partagée avec la scène « Explorer ») --- */
  useEffect(() => {
    const onIntent = (event: Event) =>
      setActiveIntent((event as CustomEvent<string | null>).detail);
    window.addEventListener(INTENT_ACTIVE_EVENT, onIntent);
    return () => window.removeEventListener(INTENT_ACTIVE_EVENT, onIntent);
  }, []);

  /* --- Service mis en avant (partagé avec la section Écosystème) --- */
  useEffect(() => {
    const read = () => {
      const match = /^#services-([a-z]+)$/i.exec(window.location.hash);
      setActiveService(match ? match[1].toLowerCase() : null);
    };
    read();
    window.addEventListener("hashchange", read);
    window.addEventListener(SERVICES_EVENT, read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener(SERVICES_EVENT, read);
    };
  }, []);

  /* --- Ouverture/fermeture avec intention (pas de clignotement) --- */
  const openWithIntent = (title: string) => {
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

  /* --- Échap referme ; clic extérieur referme --- */
  useEffect(() => {
    if (!openMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const title = openMenu;
        setOpenMenu(null);
        triggerRefs.current[title]?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRefs.current[openMenu]?.contains(target)) return;
      const inTrigger = Object.values(triggerRefs.current).some((node) =>
        node?.parentElement?.contains(target),
      );
      if (!inTrigger) setOpenMenu(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openMenu]);

  /* --- Menu mobile : scroll verrouillé, focus contenu puis rendu au déclencheur --- */
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const page = [...document.querySelectorAll<HTMLElement>("main, footer, .homera-chapter-rail")];
    const previousInert = page.map((element) => element.inert);
    page.forEach((element) => { element.inert = true; });
    mobilePanelRef.current?.querySelector<HTMLElement>("[data-mobile-first]")?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMobileOpen(false); return; }
      if (event.key !== "Tab") return;
      const nodes = [...(mobilePanelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), [tabindex='0']") ?? [])]
        .filter((element) => !element.closest("[inert]") && element.getClientRects().length > 0);
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !mobilePanelRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !mobilePanelRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      page.forEach((element, index) => { element.inert = previousInert[index]; });
      previousFocus?.focus({ preventScroll: true });
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  /* --- Navigation : ancrage, filtres, focus de service --- */
  const scrollTo = (href: string) => {
    const element = document.querySelector(href);
    if (!element) return;
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    window.history.pushState(null, "", href);
  };

  const handleNavigation = (sub: SubItem | null, href: string, intentId?: string) => {
    setOpenMenu(null);
    setMobileOpen(false);

    if (intentId) {
      // La scène épinglée amène elle-même la bonne porte au centre.
      window.dispatchEvent(new CustomEvent<string>(INTENT_EVENT, { detail: intentId }));
      window.history.pushState(null, "", href);
      return;
    }

    if (sub?.criterion) {
      applySearch({ ...EMPTY_CRITERIA, ...sub.criterion });
    }

    if (!href.startsWith("#")) return;

    if (sub?.serviceId) {
      // Le visuel et le contenu du service suivent l’entrée choisie.
      window.dispatchEvent(
        new CustomEvent(SERVICES_EVENT, { detail: sub.serviceId }),
      );
      window.history.pushState(null, "", `${href}-${sub.serviceId}`);
    } else {
      window.history.pushState(null, "", href);
      window.dispatchEvent(new Event("hashchange"));
    }

    scrollTo(href);
  };

  const handleAnchorKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === "Enter") setOpenMenu(null);
  };

  const isActive = (item: NavItem) => {
    // L’intention dominante prime : la scène « Explorer » en pilote quatre.
    if (item.intentId && activeIntent && item.section === "explorer") {
      return item.intentId === activeIntent && activeSection === "explorer";
    }
    if (item.intentId) return false;
    return item.section === activeSection;
  };

  return (
    <header
      className={`homera-header homera-on-dark fixed inset-x-0 top-0 w-full border-0 bg-transparent text-white ${mobileOpen ? "z-[100]" : "z-50"}`}
      data-scrolled={scrolled}
    >
      {/* Voile de verre — purement décoratif, jamais opaque */}
      <div

        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-[opacity,backdrop-filter] duration-[650ms] ease-[cubic-bezier(.22,.61,.28,1)] data-[scrolled=true]:opacity-100 data-[scrolled=true]:backdrop-blur-[14px] data-[scrolled=true]:backdrop-saturate-150"
        data-scrolled={scrolled}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,12,8,0.62)] via-[rgba(20,12,8,0.28)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      </div>

      <div
        className={`homera-header-container relative mx-auto flex items-center justify-between px-4 transition-[padding] duration-[650ms] ease-[cubic-bezier(.22,.61,.28,1)] sm:px-8 xl:px-12 2xl:px-16 lg:grid lg:grid-cols-3 ${
          compactHeader ? "py-2.5" : "py-4"
        }`}
      >
        {/* Mot-symbole HOMERA — inchangé */}
        <Link href="/" className="group flex items-center" aria-label="HOMERA, accueil">
          <span
            className={`homera-brand text-[3.125rem] text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.65)] transition-transform duration-500 ease-out group-hover:scale-[1.04] ${
              compactHeader ? "lg:text-[2.5rem]" : ""
            }`}
            style={{ transition: "transform 500ms var(--homera-ease), font-size 650ms var(--homera-ease)" }}
          >
            Homera
          </span>
        </Link>

        {/* Navigation — capsule centrée, dropdowns sobres */}
        <nav
          aria-label="Navigation principale"
          className="relative hidden items-center gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-[12.5px] font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-sm lg:flex lg:justify-self-center xl:gap-6 xl:px-6 2xl:gap-7 2xl:px-7"
        >
          {NAV_ITEMS.map((item) => {
            const open = openMenu === item.title;
            return (
              <div
                key={item.title}
                className="group relative inline-flex flex-col items-center py-0.5"
                onMouseEnter={() => openWithIntent(item.title)}
                onMouseLeave={closeWithIntent}
              >
                {item.submenu ? (
                  <button
                    ref={(node) => {
                      triggerRefs.current[item.title] = node;
                    }}
                    type="button"
                    aria-expanded={open}
                    aria-haspopup="true"
                    aria-controls={panelId(item)}
                    onClick={() => setOpenMenu(open ? null : item.title)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setOpenMenu(item.title);
                        requestAnimationFrame(() =>
                          panelRefs.current[item.title]
                            ?.querySelector<HTMLElement>("[data-roving-item]")
                            ?.focus(),
                        );
                      }
                    }}
                    className={`inline-flex items-center gap-1 py-1 font-medium transition-colors duration-300 ${
                      isActive(item) ? "text-white" : "text-white/92 hover:text-white"
                    }`}
                  >
                    <TextRoll>{item.title}</TextRoll>
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 text-white/55 transition-transform duration-300 ease-out group-hover:text-white ${
                        open ? "rotate-180 text-white" : ""
                      }`}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavigation(null, item.href, item.intentId);
                    }}
                    onKeyDown={handleAnchorKeyDown}
                    className="inline-flex items-center gap-1 py-1 font-medium text-white/92 transition-colors duration-300 hover:text-white"
                  >
                    <TextRoll>{item.title}</TextRoll>
                  </Link>
                )}

                {/* Indicateur d’onglet actif : souligne sans bruit */}
                <span
                  aria-hidden="true"
                  className={`mt-0.5 h-px w-full origin-center bg-homera-terracotta transition-transform duration-500 ease-[cubic-bezier(.22,.61,.28,1)] ${
                    isActive(item) ? "scale-x-100" : "scale-x-0"
                  }`}
                />

                {/* Panneau déroulant */}
                {item.submenu && (
                  <div
                    id={panelId(item)}
                    inert={!open}
                    className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 transition-all duration-[320ms] ease-[cubic-bezier(.22,.61,.28,1)] ${
                      open
                        ? "pointer-events-auto visible translate-y-0 opacity-100"
                        : "pointer-events-none invisible -translate-y-1.5 opacity-0"
                    }`}
                    onMouseEnter={() => openWithIntent(item.title)}
                    onMouseLeave={closeWithIntent}
                  >
                    <div
                      ref={(node) => { panelRefs.current[item.title] = node; }}
                      role="menu"
                      data-open={open}
                      aria-label={item.title}
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
                      className="homera-nav-panel homera-noscrollbar flex h-[11rem] w-[19rem] max-w-[min(22rem,80vw)] flex-col justify-center gap-0.5 overflow-y-auto rounded-2xl border border-white/10 bg-[#22140d] p-2 text-white shadow-[0_28px_60px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl"
                    >
                      {item.submenu.map((sub, index) => {
                        const selected = Boolean(sub.serviceId) && sub.serviceId === activeService;
                        return (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            role="menuitem"
                            data-roving-item
                            onClick={(event) => {
                              event.preventDefault();
                              handleNavigation(sub, sub.href);
                            }}
                            onKeyDown={handleAnchorKeyDown}
                            style={{ "--nav-stagger": `${index * 35}ms` } as React.CSSProperties}
                            className={`homera-nav-entry homera-underline w-full whitespace-nowrap rounded-xl px-4 py-2 text-left text-[12px] font-medium tracking-[0.01em] transition-colors duration-300 ${
                              selected
                                ? "bg-white/10 text-white"
                                : "text-white/85 hover:bg-white/8 hover:text-white"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Actions — desktop */}
        <div className="hidden items-center gap-2.5 lg:flex lg:justify-self-end">
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white backdrop-blur-sm transition-colors hover:bg-white/14"
              aria-label={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
              title={isDark ? "Mode clair" : "Mode sombre"}
            >
              {isDark ? (
                <Sun className="h-[18px] w-[18px] text-homera-terracotta" aria-hidden="true" />
              ) : (
                <Moon className="h-[18px] w-[18px] text-stone-100" aria-hidden="true" />
              )}
            </button>
          )}

          <Link
            href="#login"
            onClick={(event) => {
              event.preventDefault();
              handleNavigation(null, "#login");
            }}
            className="homera-press inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-[12.5px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/14"
            aria-label="Se connecter"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            <span className="hidden xl:inline">Se connecter</span>
          </Link>
        </div>

        {/* Commandes mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="homera-press flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white"
              aria-label={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-stone-100" aria-hidden="true" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="homera-press rounded-xl border border-white/10 bg-white/8 p-2 text-white transition-colors hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber"
            aria-label="Ouvrir le menu"
            aria-expanded={mobileOpen}
            aria-controls="homera-mobile-menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          MENU MOBILE — plein écran, opaque : aucun texte de la page ne
          doit apparaître au travers. Structure adaptée au pouce.
         ------------------------------------------------------------------ */}
      <div
        id="homera-mobile-menu"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
        className={`fixed inset-0 z-[70] lg:hidden ${
          mobileOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
        }`}
      >
        {/* Fond opaque + verre : la page ne transparaît jamais */}
        <div className="absolute inset-0 bg-[#1c110b]">
          <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle_at_20%_0%,rgba(198,93,59,0.9),transparent_58%),radial-gradient(circle_at_85%_18%,rgba(224,164,94,0.5),transparent_52%)]" />
        </div>

        <div
          ref={mobilePanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu HOMERA"
          className={`relative flex h-full flex-col transition-all duration-[280ms] ease-[cubic-bezier(.22,.61,.28,1)] ${
            mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          } ${reduced ? "duration-200" : ""}`}
        >
          <div className="flex items-center justify-between px-5 pt-5">
            <span className="homera-brand text-[2.5rem] text-white">Homera</span>
            <button
              type="button"
              data-mobile-first
              onClick={() => setMobileOpen(false)}
              className="homera-press rounded-xl border border-white/12 bg-white/8 p-2.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav
            aria-label="Navigation mobile"
            className="homera-noscrollbar mt-4 flex-1 overflow-y-auto overscroll-contain px-5 pb-6"
          >
            <ul className="space-y-1.5">
              {NAV_ITEMS.map((item, index) => {
                const open = mobileSection === item.title;
                return (
                  <li
                    key={item.title}
                    className={`transition-all duration-280 ease-out ${
                      mobileOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    style={{
                      transitionDelay: mobileOpen
                        ? `${reduced ? 0 : index * 28}ms`
                        : "0ms",
                    }}
                  >
                    {item.submenu ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setMobileSection(open ? null : item.title)}
                          aria-expanded={open}
                          aria-controls={`mobile-${panelId(item)}`}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-[15px] font-medium transition-colors duration-300 ${
                            open
                              ? "border-homera-terracotta/40 bg-white/8 text-white"
                              : "border-white/10 bg-white/[0.04] text-white/90"
                          }`}
                        >
                          <TextRoll>{item.title}</TextRoll>
                          <ChevronDown
                            aria-hidden="true"
                            className={`h-4 w-4 transition-transform duration-300 ${
                              open ? "rotate-180 text-homera-amber" : "text-white/50"
                            }`}
                          />
                        </button>
                        <div id={`mobile-${panelId(item)}`} inert={!open}
                          className={`grid overflow-hidden transition-all duration-[420ms] ease-[cubic-bezier(.22,.61,.28,1)] ${
                            open ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <ul className="min-h-0 space-y-1 border-l border-white/10 pl-3">
                            {item.submenu.map((sub) => (
                              <li key={sub.label}>
                                <Link
                                  href={sub.href}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    handleNavigation(sub, sub.href);
                                  }}
                                  className="block rounded-xl px-3 py-2.5 text-[13.5px] text-white/80 transition-colors hover:bg-white/8 hover:text-white"
                                >
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={(event) => {
                          event.preventDefault();
                          handleNavigation(null, item.href);
                        }}
                        className="block rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-[15px] font-medium text-white/90 transition-colors hover:bg-white/8"
                      >
                        {item.title}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-3 border-t border-white/10 bg-[#170e09] px-5 pb-8 pt-5">
            <Link
              href="#biens"
              onClick={(event) => {
                event.preventDefault();
                handleNavigation(null, "#biens");
              }}
              className="homera-press homera-sheen flex w-full items-center justify-center rounded-full bg-homera-terracotta py-3.5 text-[14px] font-medium text-white"
            >
              Explorer les biens vérifiés
            </Link>
            <Link
              href="#login"
              onClick={(event) => {
                event.preventDefault();
                handleNavigation(null, "#login");
              }}
              className="homera-press flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-3.5 text-[14px] font-medium text-white"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Se connecter
            </Link>
            {/* Le thème reste accessible même quand la page est couverte */}
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                aria-pressed={isDark}
                className="homera-press flex w-full items-center justify-between rounded-2xl border border-white/12 px-4 py-3 text-[13.5px] font-medium text-white/90"
              >
                <span className="inline-flex items-center gap-2.5">
                  {isDark ? (
                    <Sun className="h-4 w-4 text-homera-amber" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4 text-stone-200" aria-hidden="true" />
                  )}
                  {isDark ? "Passer en mode clair" : "Passer en mode sombre"}
                </span>
                <span
                  aria-hidden="true"
                  className={`relative h-5 w-9 shrink-0 rounded-full border border-white/20 transition-colors duration-300 ${
                    isDark ? "bg-homera-terracotta/70" : "bg-white/12"
                  }`}
                >
                  <span
                    className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white transition-all duration-300 ease-[cubic-bezier(.22,.61,.28,1)] ${
                      isDark ? "left-[1.15rem]" : "left-[3px]"
                    }`}
                  />
                </span>
              </button>
            )}

            <p className="pt-1 text-center text-[11px] text-white/45">
              Cotonou · Abomey-Calavi · Porto-Novo · Ouidah
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export { SERVICES_EVENT };

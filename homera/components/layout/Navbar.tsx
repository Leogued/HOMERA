"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, X, Moon, Sun, ChevronDown } from "lucide-react";

interface SubMenuItem {
  label: string;
  href: string;
}

interface NavItem {
  title: string;
  href: string;
  submenu?: SubMenuItem[];
}

const navItems: NavItem[] = [
  {
    title: "Explorer",
    href: "#explorer",
  },
  {
    title: "Acheter",
    href: "#acheter",
    submenu: [
      { label: "Maisons", href: "#acheter-maisons" },
      { label: "Terrains", href: "#acheter-terrains" },
      { label: "Appartements", href: "#acheter-appartements" },
      { label: "Locaux commerciaux", href: "#acheter-locaux" },
    ],
  },
  {
    title: "Louer",
    href: "#louer",
    submenu: [
      { label: "Maisons", href: "#louer-maisons" },
      { label: "Studios", href: "#louer-studios" },
      { label: "Appartements", href: "#louer-appartements" },
      { label: "Locaux commerciaux", href: "#louer-locaux" },
    ],
  },
  {
    title: "Séjour",
    href: "#sejour",
    submenu: [
      { label: "À la nuitée", href: "#sejour-nuitee" },
      { label: "Pour quelques jours", href: "#sejour-quelques-jours" },
      { label: "Pour une courte période", href: "#sejour-courte-periode" },
    ],
  },
  {
    title: "Services",
    href: "#services",
    submenu: [
      { label: "Déménagement", href: "#services-demenagement" },
      { label: "Gestion immobilière", href: "#services-gestion" },
      { label: "Travaux & aménagement", href: "#services-travaux" },
      { label: "Maintenance & réparation", href: "#services-maintenance" },
    ],
  },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMobileSubmenu, setActiveMobileSubmenu] = useState<string | null>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark" || theme === "dark";

  const toggleMobileSubmenu = (title: string) => {
    setActiveMobileSubmenu(activeMobileSubmenu === title ? null : title);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);

    if (href.startsWith("#")) {
      e.preventDefault();
      // Extract base ID (e.g., #acheter-maisons -> #acheter)
      const baseId = href.split("-")[0];
      const element = document.querySelector(baseId) || document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", href);
      }
    }
  };

  return (
    <header className="w-full bg-[#2A170F] text-white py-4 px-4 sm:px-8 border-b border-white/10 transition-colors duration-300 relative z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo - White Serif Text with Glow Effect */}
        <Link href="/" className="flex items-center group">
          <span className="font-serif text-2xl sm:text-3xl font-extrabold tracking-widest text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] group-hover:scale-105 transition-transform">
            HOMERA
          </span>
        </Link>

        {/* Center Navigation Pill Capsule (Desktop/Tablet landscape with Dropdowns) */}
        <nav className="hidden lg:flex items-center bg-[#F1E6D6] px-6 py-2.5 rounded-full shadow-md gap-6 text-sm font-semibold text-stone-700 lg:ml-auto lg:mr-8 relative">
          {navItems.map((item) => (
            <div
              key={item.title}
              className="relative inline-flex flex-col items-center group py-0.5"
              onMouseEnter={() => setOpenDropdown(item.title)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href={item.href}
                onClick={(e) => {
                  if (item.submenu) {
                    // Touch/click toggle support
                    setOpenDropdown(openDropdown === item.title ? null : item.title);
                  }
                  handleNavClick(e, item.href);
                }}
                className="hover:text-stone-900 transition-colors inline-flex items-center gap-1 py-1"
              >
                <span>{item.title}</span>
                {item.submenu && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-stone-500 group-hover:text-stone-900 transition-transform duration-200 ${
                      openDropdown === item.title ? "rotate-180 text-stone-900" : ""
                    }`}
                  />
                )}
              </Link>

              {/* Submenu Dropdown Panel Centered under parent item */}
              {item.submenu && (
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50 transition-all duration-200 ${
                    openDropdown === item.title
                      ? "opacity-100 visible translate-y-0 pointer-events-auto"
                      : "opacity-0 invisible -translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto"
                  }`}
                >
                  <div className="bg-[#3E2418] border border-stone-700/60 rounded-2xl shadow-2xl p-2.5 min-w-55 w-max text-white flex flex-col items-center space-y-1">
                    {item.submenu.map((sub) => (
                      <Link
                        key={sub.label}
                        href={sub.href}
                        onClick={(e) => handleNavClick(e, sub.href)}
                        className="w-full text-center px-5 py-2 rounded-xl text-xs font-medium text-stone-200 hover:bg-white/10 hover:text-homera-terracotta transition-all whitespace-nowrap"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right Action Buttons (Desktop) */}
        <div className="hidden lg:flex items-center space-x-3">
          <Link
            href="#login"
            onClick={(e) => handleNavClick(e, "#login")}
            className="bg-homera-terracotta hover:bg-homera-terracotta-light text-[#2A170F] font-semibold text-sm px-5 py-2.5 rounded-full transition-all shadow-sm"
          >
            Se connecter
          </Link>

          <Link
            href="#register"
            onClick={(e) => handleNavClick(e, "#register")}
            className="bg-[#4A2C1D]/90 hover:bg-[#5A3726] text-white font-semibold text-sm px-5 py-2.5 rounded-full border border-stone-600/50 transition-all shadow-sm"
          >
            Créer un compte
          </Link>

          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="w-10 h-10 rounded-full bg-[#F1E6D6]/20 hover:bg-[#F1E6D6]/30 text-white flex items-center justify-center transition-colors border border-white/10"
              aria-label="Changer le mode d'affichage"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-homera-terracotta" />
              ) : (
                <Moon className="w-5 h-5 text-stone-100" />
              )}
            </button>
          )}
        </div>

        {/* Mobile & Tablet Hamburger Controls */}
        <div className="flex lg:hidden items-center space-x-3">
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="w-9 h-9 rounded-full bg-[#F1E6D6]/20 text-white flex items-center justify-center"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-homera-terracotta" />
              ) : (
                <Moon className="w-4 h-4 text-stone-100" />
              )}
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-homera-terracotta/50"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Dropdown Drawer Container */}
      {mobileMenuOpen && (
        <div className="lg:hidden max-w-7xl mx-auto mt-4 pt-4 border-t border-white/10 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="bg-[#F1E6D6] p-4 rounded-2xl text-stone-800 flex flex-col space-y-2 font-semibold text-sm shadow-xl">
            {navItems.map((item) => (
              <div key={item.title} className="border-b border-stone-300/40 last:border-0 py-1">
                {item.submenu ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleMobileSubmenu(item.title)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        activeMobileSubmenu === item.title
                          ? "bg-[#C65D3B]/20 text-[#3E2418] font-bold border-l-4 border-[#C65D3B]"
                          : "text-stone-800 hover:text-[#3E2418] hover:bg-[#C65D3B]/10 active:bg-[#C65D3B]/15"
                      }`}
                    >
                      <span className="text-base">{item.title}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          activeMobileSubmenu === item.title ? "rotate-180 text-[#C65D3B]" : "text-stone-500"
                        }`}
                      />
                    </button>

                    {activeMobileSubmenu === item.title && (
                      <div className="pl-3 pr-1 pt-2 pb-2 space-y-1 bg-stone-200/80 rounded-xl mt-1.5 border border-stone-300/60 shadow-inner">
                        {item.submenu.map((sub) => (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            onClick={(e) => handleNavClick(e, sub.href)}
                            className="block py-2 px-3 text-xs text-stone-700 font-medium hover:text-[#3E2418] hover:bg-[#C65D3B]/20 active:bg-[#C65D3B]/30 rounded-lg text-left transition-all"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className="block px-3 py-2.5 rounded-xl text-stone-800 text-base hover:text-[#3E2418] hover:bg-[#C65D3B]/10 active:bg-[#C65D3B]/15 transition-all"
                  >
                    {item.title}
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1 pb-2">
            <Link
              href="#login"
              onClick={(e) => handleNavClick(e, "#login")}
              className="w-full text-center bg-homera-terracotta hover:bg-homera-terracotta-light text-[#2A170F] font-semibold text-sm py-3 rounded-full shadow-md"
            >
              Se connecter
            </Link>
            <Link
              href="#register"
              onClick={(e) => handleNavClick(e, "#register")}
              className="w-full text-center bg-[#4A2C1D] hover:bg-[#5A3726] text-white font-semibold text-sm py-3 rounded-full border border-stone-600/50 shadow-md"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

type DropdownName = "project" | "location" | "propertyType" | "budget";
type SelectDropdownName = Exclude<DropdownName, "budget">;
type DropdownOption = { value: string; label: string };

const selectOptions: Record<SelectDropdownName, DropdownOption[]> = {
  project: [
    { value: "acheter", label: "Acheter" },
    { value: "louer", label: "Louer" },
    { value: "sejour", label: "Séjour" },
  ],
  location: [
    { value: "Cotonou", label: "Cotonou (Fidjrossè, Akpakpa...)" },
    { value: "Abomey-Calavi", label: "Abomey-Calavi (Tankpè, Akassato...)" },
    { value: "Fidjrossè", label: "Fidjrossè" },
    { value: "Akpakpa", label: "Akpakpa" },
    { value: "Tankpè", label: "Tankpè" },
    { value: "Akassato", label: "Akassato" },
    { value: "Porto-Novo", label: "Porto-Novo" },
    { value: "Ouidah", label: "Ouidah" },
  ],
  propertyType: [
    { value: "appartement", label: "Appartement" },
    { value: "studio", label: "Studio" },
    { value: "villa", label: "Villa" },
    { value: "maison", label: "Maison" },
    { value: "terrain", label: "Terrain nu" },
    { value: "parcelle", label: "Parcelle" },
    { value: "local", label: "Local commercial" },
  ],
};

const budgetOptions: DropdownOption[] = [
  { value: "100 000 FCFA", label: "100 000 FCFA" },
  { value: "250 000 FCFA", label: "250 000 FCFA" },
  { value: "500 000 FCFA", label: "500 000 FCFA" },
  { value: "1 000 000 FCFA", label: "1 000 000 FCFA" },
  { value: "2 000 000 FCFA", label: "2 000 000 FCFA" },
];

const dropdownLabels: Record<DropdownName, string> = {
  project: "Projet",
  location: "Localisation",
  propertyType: "Type de bien",
  budget: "Montant",
};

export function Hero() {
  const [project, setProject] = useState("");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [budget, setBudget] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<DropdownName | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);

  const openDropdown = (name: DropdownName, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 192), window.innerWidth - 24);
    const left = Math.min(Math.max(rect.left, 12), window.innerWidth - width - 12);
    const optionCount = name === "budget" ? budgetOptions.length : selectOptions[name].length;
    const menuHeight = Math.min(256, optionCount * 40 + 12);
    const opensAbove =
      rect.bottom + menuHeight + 20 > window.innerHeight &&
      rect.top > menuHeight + 20;
    const top = opensAbove ? rect.top - menuHeight - 8 : rect.bottom + 8;

    activeTriggerRef.current = anchor;
    setDropdownPosition({
      top,
      left,
      width,
      maxHeight: opensAbove
        ? Math.min(menuHeight, rect.top - 20)
        : Math.max(96, Math.min(menuHeight, window.innerHeight - top - 12)),
    });
    setActiveDropdown(name);
    setIsDropdownOpen(true);
  };

  const toggleDropdown = (name: DropdownName, anchor: HTMLElement) => {
    if (isDropdownOpen && activeDropdown === name) {
      setIsDropdownOpen(false);
      return;
    }
    openDropdown(name, anchor);
  };

  useEffect(() => {
    if (!isDropdownOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !searchBarRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        activeTriggerRef.current?.focus();
      }
    };
    const closeOnViewportChange = () => setIsDropdownOpen(false);

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [isDropdownOpen]);

  const values: Record<DropdownName, string> = { project, location, propertyType, budget };
  const options = activeDropdown === "budget"
    ? budgetOptions
    : activeDropdown
      ? selectOptions[activeDropdown]
      : [];
  const activeValue = activeDropdown ? values[activeDropdown] : "";

  const renderSelectDropdown = (name: SelectDropdownName) => {
    const selected = selectOptions[name].find((option) => option.value === values[name]);
    const isOpen = isDropdownOpen && activeDropdown === name;

    return (
      <div className="relative flex h-12 min-w-0 flex-1 items-center">
        <button
          type="button"
          role="combobox"
          aria-label={dropdownLabels[name]}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls="homera-search-dropdown"
          onClick={(event) => toggleDropdown(name, event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              openDropdown(name, event.currentTarget);
              requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("[role=option]")?.focus());
            }
          }}
          className={`flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full px-3 text-center text-[13px] font-medium outline-none transition-colors hover:bg-stone-100 focus:bg-stone-100 dark:text-stone-100 dark:hover:bg-white/5 dark:focus:bg-white/5 ${selected ? "text-stone-700" : "text-stone-500 dark:text-stone-400"}`}
        >
          <span className="truncate">{selected?.label ?? dropdownLabels[name]}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>
    );
  };

  const chooseOption = (option: DropdownOption) => {
    switch (activeDropdown) {
      case "project":
        setProject(option.value);
        break;
      case "location":
        setLocation(option.value);
        break;
      case "propertyType":
        setPropertyType(option.value);
        break;
      case "budget":
        setBudget(option.value);
        break;
    }
    setIsDropdownOpen(false);
  };

  return (
    <section className="relative isolate overflow-hidden bg-black text-white pt-34 pb-16 sm:pt-42 sm:pb-24 lg:min-h-svh">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/video/background_video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/35" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8 text-center lg:mt-[max(0px,calc(100svh-29rem))]">
        {/* Main Title — DM Serif Display, graisse 400 (aucun faux gras) */}
        <h1 className="font-serif text-display-sm sm:text-display-lg lg:text-display-xl text-white max-w-4xl mx-auto lg:-translate-y-[max(7rem,calc(50svh-12.5rem))]">
          L&apos;immobilier au Bénin en toute <br />
          <span className="homera-accent text-[1.06em]">simplicité</span>
        </h1>

        {/* Subtitle */}
        <p className="text-stone-300 text-sm sm:text-[0.9375rem] max-w-2xl mx-auto font-sans font-normal leading-relaxed lg:-translate-y-[max(7rem,calc(50svh-12.5rem))]">
          Immobilier en toute sérénité, sans surprise ni intermédiaire douteux — la plateforme de confiance pour tous vos projets au Bénin.
        </p>

        <div ref={searchBarRef} className="mt-8 mx-auto flex h-17 w-full max-w-4xl items-center overflow-x-auto rounded-full border border-stone-200/50 bg-card p-2 shadow-2xl scrollbar-none dark:border-white/10 dark:bg-[#2B1A12] [&::-webkit-scrollbar]:hidden">
          <div className="flex h-12 min-w-140 flex-1 items-center sm:min-w-0">
            {renderSelectDropdown("project")}
            <span className="h-7 w-px shrink-0 bg-stone-200 dark:bg-white/10" aria-hidden="true" />
            {renderSelectDropdown("location")}
            <span className="h-7 w-px shrink-0 bg-stone-200 dark:bg-white/10" aria-hidden="true" />
            {renderSelectDropdown("propertyType")}
            <span className="h-7 w-px shrink-0 bg-stone-200 dark:bg-white/10" aria-hidden="true" />
            <div className="relative flex h-12 min-w-0 flex-1 items-center">
              <input
                type="text"
                inputMode="decimal"
                aria-label="Montant"
                placeholder="Montant"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                onFocus={(event) => openDropdown("budget", event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    openDropdown("budget", event.currentTarget);
                    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("[role=option]")?.focus());
                  }
                  if (event.key === "Enter") setIsDropdownOpen(false);
                }}
                className="h-12 w-full min-w-0 rounded-full bg-transparent py-3 pl-2 pr-7 text-center text-[13px] font-medium text-stone-700 outline-none placeholder:text-stone-500 transition-colors hover:bg-stone-100 focus:bg-stone-100 dark:text-stone-100 dark:placeholder:text-stone-400 dark:hover:bg-white/5 dark:focus:bg-white/5"
              />
              <ChevronDown className={`pointer-events-none absolute right-2 h-3.5 w-3.5 text-stone-400 transition-transform duration-150 ${isDropdownOpen && activeDropdown === "budget" ? "rotate-180" : ""}`} aria-hidden="true" />
            </div>
            <button
              type="button"
              aria-label="Rechercher"
              title="Rechercher"
              className="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2A170F] text-white transition-colors hover:bg-[#3A2116] focus:outline-none focus:ring-2 focus:ring-homera-terracotta focus:ring-offset-2"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        {activeDropdown && dropdownPosition && typeof document !== "undefined" && createPortal(
          <div
            id="homera-search-dropdown"
            ref={menuRef}
            role="listbox"
            aria-label={dropdownLabels[activeDropdown]}
            aria-hidden={!isDropdownOpen}
            inert={!isDropdownOpen}
            className={`homera-dropdown-menu fixed z-50 overflow-y-auto rounded-xl border border-stone-200 bg-[#fffdf9] p-1.5 text-stone-800 shadow-xl transition-all duration-150 ease-out motion-reduce:transition-none dark:border-white/10 dark:bg-[#2B1A12] dark:text-white ${isDropdownOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100 homera-dropdown-enter" : "pointer-events-none translate-y-1 scale-[.99] opacity-0"}`}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: dropdownPosition.maxHeight,
            }}
            onKeyDown={(event) => {
              const menuOptions = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? [])];
              const currentIndex = menuOptions.indexOf(event.target as HTMLButtonElement);
              if (event.key === "ArrowDown") {
                event.preventDefault();
                menuOptions[(currentIndex + 1) % menuOptions.length]?.focus();
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                menuOptions[(currentIndex - 1 + menuOptions.length) % menuOptions.length]?.focus();
              }
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={activeValue === option.value}
                onClick={() => chooseOption(option)}
                className={`flex min-h-10 w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-[13px] leading-snug transition-colors hover:bg-stone-100 focus:bg-stone-100 focus:outline-none dark:hover:bg-white/10 dark:focus:bg-white/10 ${activeValue === option.value ? "font-semibold text-homera-terracotta" : "font-normal"}`}
              >
                <span>{option.label}</span>
                {activeValue === option.value && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";

/* ==================================================================
   HOMERA — FICHE D’UN BIEN : ONGLETS DE CONTENU
   ------------------------------------------------------------------
   Les panneaux sont rendus côté serveur et transmis tout prêts : seul
   l’onglet actif est visible. L’ancre (#fiche-…) active l’onglet visé
   pour que les liens internes (« Voir les équipements ») aboutissent
   vraiment, y compris depuis la colonne latérale.
   ================================================================== */

export type DetailTab = {
  /** Identifiant stable : sert aussi d’ancre (#fiche-apercu, …). */
  id: string;
  label: string;
  content: ReactNode;
};

export function PropertyDetailTabs({ tabs }: { tabs: DetailTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    const ids = new Set(tabs.map((tab) => tab.id));
    const fromHash = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!ids.has(id)) return;
      setActive(id);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  const activate = (id: string) => {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const move = (direction: 1 | -1) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    if (!next) return;
    activate(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Contenu de la fiche"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          }
        }}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={tab.id}
              tabIndex={selected ? 0 : -1}
              onClick={() => activate(tab.id)}
              className={
                "whitespace-nowrap border-b-2 px-4 py-3 text-body-sm font-medium transition-colors " +
                (selected
                  ? "border-homera-terracotta text-homera-terracotta"
                  : "border-transparent text-muted hover:border-border hover:text-foreground")
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <section
          key={tab.id}
          role="tabpanel"
          id={tab.id}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="scroll-mt-24 pt-8"
        >
          {tab.content}
        </section>
      ))}
    </div>
  );
}

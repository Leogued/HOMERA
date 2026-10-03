"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useVisitor } from "@/components/providers/VisitorProvider";
/* ================================================================== HOMERA — BOUTON FAVORI ------------------------------------------------------------------ Un seul bouton par bien, dans la carte comme sur la fiche : `aria-pressed` porte l’état, le libellé dit ce que fait le clic, et une confirmation annoncée suit l’action. Aucun compte n’est demandé : le favori reste dans le navigateur. ================================================================== */ export function FavoriteButton({
  propertyId,
  title,
  size = "card",
  withLabel = false,
  tone = "onMedia",
}: {
  propertyId: string;
  /** Titre du bien, pour un libellé compréhensible hors contexte visuel. */ title: string;
  size?: "card" | "detail";
  withLabel?: boolean;
  /** « onMedia » : posé sur une photo ; « onSurface » : posé sur une page claire. */ tone?: "onMedia" | "onSurface";
}) {
  const { isFavorite, toggleFavorite, ready } = useVisitor();
  const [announcement, setAnnouncement] = useState("");
  const active = isFavorite(propertyId);
  const action = active ? "Retirer des favoris" : "Ajouter aux favoris";
  const dimension = size === "detail" ? "min-h-11 gap-2 px-4" : "h-10 w-10";
  return (
    <button
      type="button"
      onClick={(event) => {
        // La carte entière est un objet de liste : on n’ouvre pas la fiche ici.
        event.stopPropagation();
        const next = !active;
        toggleFavorite(propertyId);
        setAnnouncement(next ? `${title} ajouté à vos favoris` : `${title} retiré de vos favoris`);
      }}
      data-cursor="none"
      aria-pressed={active}
      aria-label={`${action} : ${title}`}
      title={action}
      className={`homera-press inline-flex ${dimension} items-center justify-center gap-2 rounded-full border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-homera-amber ${active ? "border-homera-terracotta bg-homera-terracotta text-white" : tone === "onSurface" ? "border-border bg-card text-foreground hover:border-homera-terracotta hover:text-homera-terracotta" : "border-white/35 bg-black/35 text-white backdrop-blur-md hover:border-homera-amber hover:bg-black/55"}`}
    >
      {" "}
      <Heart
        aria-hidden="true"
        className={`h-[18px] w-[18px] transition-transform duration-300 ease-standard ${active ? "scale-110 fill-current" : "scale-100"} ${active ? "" : tone === "onSurface" ? "text-homera-terracotta" : ""}`}
      />{" "}
      {withLabel && <span className="text-note font-medium">{active ? "En favori" : "Favori"}</span>}{" "}
      {/* Annonce réservée aux lecteurs d’écran : jamais de doublon visuel. */}{" "}
      <span className="sr-only" role="status">
        {" "}
        {ready ? announcement : ""}{" "}
      </span>{" "}
    </button>
  );
}

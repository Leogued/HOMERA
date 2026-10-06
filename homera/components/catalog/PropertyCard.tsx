"use client";
import Link from "next/link";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bath, Bed, CalendarCheck, Eye, MapPin, Maximize, ShieldCheck } from "lucide-react";
import type { Property } from "@/lib/content";
import { FEATURE_LABELS, INTENT_LABELS, TYPE_LABELS, formatPropertyPrice, formatSurface } from "@/lib/format";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { FavoriteButton } from "@/components/catalog/FavoriteButton";
import { TextRoll } from "@/components/ui/TextRoll";

/* ==================================================================
   HOMERA — CARTE DE BIEN, UNE SEULE FOIS
   ------------------------------------------------------------------
   Deux dispositions, un seul contenu :
   • « grid »    — grille de résultats de l’explorateur et des pages
                   de projet : la carte est un objet de liste, un seul
                   lien couvre toute la surface, le clavier s’arrête
                   une fois dessus, Entrée ou Espace ouvre la fiche ;
   • « gallery » — carrousel de l’accueil : la photo ouvre l’aperçu
                   natif, avec la profondeur propre à la galerie.

   Contrat d’accessibilité tenu dans les deux cas :
   • un seul arrêt de tabulation pour consulter le bien ;
   • un seul bouton « Favori » (aria-pressed), hors du lien, avec
     retour visuel immédiat et annonce réservée aux lecteurs d’écran ;
   • le libellé d’action (« Voir la fiche » / « Voir le bien ») reste
     toujours lisible, sans devenir un second piège au clavier ;
   • la date de vérification et la référence sont lisibles d’emblée.

   Aucun badge d’ancienneté : la donnée reste vérifiable telle quelle.
   ================================================================== */

export function PropertyCard(props: {
  property: Property;
  layout?: "grid" | "gallery";
  /** Galerie : carte centrée dans le carrousel. */
  active?: boolean;
  onOpen?: () => void;
  onFocus?: () => void;
  priority?: boolean;
}) {
  const router = useRouter();
  const { property, layout = "grid" } = props;
  const href = `/biens/${property.id}`;
  const features = (property.features ?? []).slice(0, 3);

  const badges = (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-[2] flex flex-wrap items-start justify-between gap-2 text-micro text-white sm:inset-x-5 sm:top-5">
      <span className="flex flex-wrap gap-2">
        <span className="rounded-full border border-white/30 bg-homera-brown/70 px-3 py-1.5 font-semibold uppercase tracking-[.12em]">
          {INTENT_LABELS[property.intent]} · {TYPE_LABELS[property.type]}
        </span>
        {property.availabilityStatus === "indisponible" && <span className="rounded-full border border-white/35 bg-error/85 px-3 py-1.5 font-semibold">Indisponible</span>}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-homera-brown/70 px-3 py-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-homera-amber" aria-hidden="true" />
        Vérifié HOMERA
      </span>
    </div>
  );

  const reference = (
    <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[2] flex items-center justify-between gap-3 sm:inset-x-5 sm:bottom-5">
      <span className="homera-num font-mono text-caption tracking-[.06em] text-homera-amber">
        {property.homeraId}
      </span>
    </div>
  );

  const specs = (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-note text-muted">
      {property.bedrooms > 0 && (
        <li className="homera-num inline-flex items-center gap-2">
          <Bed className="h-4 w-4" aria-hidden="true" />
          {property.bedrooms} ch.
        </li>
      )}
      {property.bathrooms > 0 && (
        <li className="homera-num inline-flex items-center gap-2">
          <Bath className="h-4 w-4" aria-hidden="true" />
          {property.bathrooms} sdb.
        </li>
      )}
      <li className="homera-num inline-flex items-center gap-2">
        <Maximize className="h-4 w-4" aria-hidden="true" />
        {formatSurface(property.surface)}
      </li>
      {property.rooms ? <li className="homera-num inline-flex items-center gap-2">{property.rooms} pièces</li> : null}
    </ul>
  );

  const location = (
    <p className="flex items-center gap-1.5 text-caption text-muted">
      <MapPin className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
      {property.district}, {property.city}
    </p>
  );

  const price = (
    <p className="homera-num shrink-0 text-body font-semibold text-foreground">{formatPropertyPrice(property)}</p>
  );

  /**
   * Un lien ouvre sur Entrée ; l’objet de liste s’ouvre aussi sur Espace,
   * comme un bouton, sans perdre l’adresse réelle ni le repli sans JavaScript.
   */
  const openOnSpace = (event: ReactKeyboardEvent<HTMLAnchorElement>) => {
    if (event.key !== " ") return;
    event.preventDefault();
    router.push(href);
  };

  /* ------------------------------------------------------------------
     Galerie (accueil) — ouvre l’aperçu, garde la profondeur du carrousel
     ------------------------------------------------------------------ */
  if (layout === "gallery") {
    return (
      <article
        data-gallery-item
        data-card
        data-active={props.active}
        onFocusCapture={(event) => {
          if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) props.onFocus?.();
        }}
        className="homera-property-object group/card relative shrink-0 snap-center"
      >
        <div className="homera-property-photo relative overflow-hidden rounded-media bg-homera-brown shadow-[0_35px_75px_-45px_rgba(62,36,24,.55)]">
          <Reveal y={0} blur={0} clip clipRadius={24} duration={1050}>
            <Visual
              mediaKey={property.media}
              alt={property.alt}
              sizes="(min-width: 1280px) 52rem, (min-width: 1024px) 70vw, 85vw"
              veil="none"
              quality={72}
              priority={props.priority}
              className="aspect-[16/10] w-full"
              imageClassName="homera-property-image"
            />
          </Reveal>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(28,17,11,.80),transparent_48%,rgba(28,17,11,.2))]"
          />
          {badges}
          {/* Seul arrêt de tabulation de la photo : l’aperçu du bien. */}
          <button
            type="button"
            onClick={props.onOpen}
            data-cursor="property"
            aria-label={`Voir le bien : ${property.title}`}
            className="absolute inset-0 z-[3] rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-homera-amber"
          >
            <span className="sr-only">Voir le bien</span>
          </button>
          <div className="absolute right-4 top-1/2 z-[4] -translate-y-1/2 sm:right-5">
            <FavoriteButton propertyId={property.id} title={property.title} />
          </div>
          <div className="pointer-events-none absolute inset-x-5 bottom-5 z-[4] flex items-center justify-between gap-3 sm:inset-x-7 sm:bottom-7">
            <span className="homera-num font-mono text-caption tracking-[.06em] text-homera-amber">
              {property.homeraId}
            </span>
            <span className="homera-property-explore inline-flex items-center gap-2 rounded-full border border-white/35 bg-homera-paper/95 px-4 py-2 text-caption font-semibold text-homera-brown">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Voir le bien
            </span>
          </div>
        </div>

        <div className="homera-property-caption mt-5 px-1 sm:px-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <div className="mb-2">{location}</div>
              <h3 className="homera-property-title max-w-lg font-serif text-display-xs leading-snug text-foreground sm:text-display-sm">
                {property.title}
              </h3>
            </div>
            {price}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {specs}
            {/* Même action que la photo : affordance souris, sans second arrêt clavier. */}
            <button
              type="button"
              onClick={props.onOpen}
              tabIndex={-1}
              aria-hidden="true"
              data-cursor="property"
              className="homera-underline inline-flex min-h-10 items-center gap-2 homera-accent-ink text-note font-medium"
            >
              <TextRoll>Voir le bien</TextRoll>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <p className="homera-property-secondary mt-2 flex min-h-5 items-center gap-2 text-caption text-muted">
            <CalendarCheck className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
            Vérifié le {property.verifiedOn} · Mandat valide
          </p>
        </div>
      </article>
    );
  }

  /* ------------------------------------------------------------------
     Grille — un seul lien couvre la carte ; le favori vit à côté du lien
     ------------------------------------------------------------------ */
  return (
    <article
      data-card
      className="homera-lift group/card relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-[0_4px_20px_rgba(62,36,24,0.06)]"
    >
      <div className="relative overflow-hidden">
        <Visual
          mediaKey={property.media}
          alt={property.alt}
          sizes="(min-width: 1280px) 26rem, (min-width: 768px) 45vw, 92vw"
          veil="none"
          quality={70}
          priority={props.priority}
          className="aspect-[16/10] w-full"
          imageClassName="homera-property-image"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(28,17,11,.72),transparent_55%)]"
        />
        {badges}
        <div className="absolute bottom-4 right-4 z-[3] sm:bottom-5 sm:right-5">
          <FavoriteButton propertyId={property.id} title={property.title} />
        </div>
        {reference}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {location}
        {/* Pas de lien ici : le titre reste du texte, la carte entière est le lien. */}
        <h3 className="font-serif text-display-xs leading-snug text-foreground transition-colors duration-300 group-hover/card:text-homera-terracotta">
          {property.title}
        </h3>
        <div className="flex flex-wrap items-end justify-between gap-3">
          {price}
          <span className="text-caption text-muted">
            {property.surface >= 300 && property.type === "terrain" ? "Terrain" : TYPE_LABELS[property.type]}
          </span>
        </div>
        {features.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {features.map((feature) => (
              <li
                key={feature}
                className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-caption text-muted"
              >
                {FEATURE_LABELS[feature]}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          {specs}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-caption text-muted">
              <CalendarCheck className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
              Vérifié le {property.verifiedOn}
            </p>
            <span className="homera-underline inline-flex min-h-10 items-center gap-2 homera-accent-ink text-note font-medium">
              <TextRoll>Voir la fiche</TextRoll>
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-300 ease-standard group-hover/card:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </div>

      {/* Le lien étiré : une seule cible, toute la carte, un seul arrêt clavier. */}
      <Link
        href={href}
        onKeyDown={openOnSpace}
        data-cursor="property"
        aria-label={`Voir la fiche : ${property.title}, ${property.district}, ${property.city}`}
        className="absolute inset-0 z-[2] rounded-card outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-homera-terracotta"
      />
    </article>
  );
}

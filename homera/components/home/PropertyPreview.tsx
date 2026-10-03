"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Bath, Bed, CalendarCheck, MapPin, Maximize, ShieldCheck, X } from "lucide-react";
import { DEMO_DATA, type Property } from "@/lib/content";
import { INTENT_LABELS, TYPE_LABELS, formatPropertyPrice, formatSurface } from "@/lib/format";
import { Visual } from "@/components/ui/Visual";
import { CopyReference } from "@/components/ui/CopyReference"; /** Aperçu natif : top layer, Échap, focus piégé et rendu à la demande. */
export function PropertyPreview({ property, onClose }: { property: Property; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="property-preview-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="homera-property-dialog homera-noscrollbar"
    >
      {" "}
      <div className="relative overflow-hidden rounded-modal bg-card text-foreground">
        {" "}
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label="Fermer l’aperçu du bien"
          className="homera-press absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-homera-brown/85 text-white"
        >
          {" "}
          <X className="h-5 w-5" aria-hidden="true" />{" "}
        </button>{" "}
        <Visual
          mediaKey={property.media}
          alt={property.alt}
          sizes="(min-width: 900px) 54rem, 94vw"
          veil="none"
          quality={74}
          className="aspect-[16/9] w-full"
        />{" "}
        <div className="p-5 sm:p-8">
          {" "}
          <p className="homera-accent-ink text-caption font-semibold uppercase tracking-[.2em]">
            {" "}
            {INTENT_LABELS[property.intent]} · {TYPE_LABELS[property.type]}{" "}
          </p>{" "}
          <h2 id="property-preview-title" className="mt-3 font-serif text-display-xs sm:text-display-sm">
            {property.title}
          </h2>{" "}
          <p className="mt-3 flex items-center gap-2 text-body-sm text-muted">
            {" "}
            <MapPin className="h-4 w-4" aria-hidden="true" /> {property.district}, {property.city}{" "}
          </p>{" "}
          <p className="homera-num mt-5 text-xl font-semibold text-foreground">{formatPropertyPrice(property)}</p>{" "}
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-y border-border py-4 text-body-sm text-muted">
            {" "}
            {property.bedrooms > 0 && (
              <li className="inline-flex items-center gap-2">
                <Bed className="h-4 w-4" aria-hidden="true" />
                {property.bedrooms} chambres
              </li>
            )}{" "}
            {property.bathrooms > 0 && (
              <li className="inline-flex items-center gap-2">
                <Bath className="h-4 w-4" aria-hidden="true" />
                {property.bathrooms} salles de bain
              </li>
            )}{" "}
            <li className="inline-flex items-center gap-2">
              <Maximize className="h-4 w-4" aria-hidden="true" />
              {formatSurface(property.surface)}
            </li>{" "}
          </ul>{" "}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {" "}
            <p id="property-preview-reference" className="homera-num font-mono text-body-sm font-medium">
              {property.homeraId}
            </p>{" "}
            <CopyReference value={property.homeraId} targetId="property-preview-reference" />{" "}
          </div>{" "}
          <div className="mt-5 flex flex-wrap gap-4 text-note text-muted">
            {" "}
            <p className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
              Éléments de la fiche contrôlés
            </p>{" "}
            <p className="inline-flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-homera-terracotta" aria-hidden="true" />
              Vérification : {property.verifiedOn}
            </p>{" "}
          </div>{" "}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/biens/${property.id}`}
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white transition-colors"
            >
              Voir la fiche complète
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/contact?bien=${property.homeraId}`}
              className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-border px-5 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              Demander une visite
            </Link>
          </div>
          {DEMO_DATA && (
            <p className="mt-5 text-caption leading-relaxed text-muted">
              Fiche de démonstration et visuel illustratif. Ce bien n’est pas une offre commerciale réelle. Le statut
              ne constitue pas une garantie juridique.
            </p>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </dialog>
  );
}

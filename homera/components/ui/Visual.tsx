import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { media } from "@/lib/content";

/* ==================================================================
   HOMERA — VISUEL
   ------------------------------------------------------------------
   Un seul composant pour toutes les images de la page : dimensions
   réelles, placeholder flou (aucun saut de mise en page), tailles
   responsives, chargement différé natif et voile de lisibilité pour
   le texte posé sur la photo.
   ================================================================== */

type Veil = "none" | "soft" | "strong";

const veilClasses: Record<Veil, string | null> = {
  none: null,
  soft: "bg-gradient-to-t from-[rgba(20,12,8,0.62)] via-transparent to-[rgba(20,12,8,0.18)]",
  strong: null,
};

export function Visual({
  mediaKey,
  alt,
  sizes,
  className = "",
  imageClassName = "",
  veil = "soft",
  priority = false,
  hoverable = false,
  quality = 72,
  style,
  children,
}: {
  mediaKey: string;
  alt: string;
  /** Attribut `sizes` réel : évite de télécharger une image inutilement grande. */
  sizes: string;
  className?: string;
  imageClassName?: string;
  veil?: Veil;
  priority?: boolean;
  /** Active le zoom lent au survol (voir `.homera-media`). */
  hoverable?: boolean;
  quality?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const asset = media(mediaKey);

  return (
    <div
      className={`homera-media ${className}`}
      style={style}
      data-hoverable={hoverable ? "true" : undefined}
    >
      {asset ? (
        <Image
          src={asset.src}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          placeholder="blur"
          blurDataURL={asset.blurDataURL}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className={`object-cover ${imageClassName}`}
        />
      ) : (
        /* Repli typographique HOMERA tant que le visuel n’est pas fourni */
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(145deg,#3e2418_0%,#2a170f_55%,#c65d3b_140%)]"
        />
      )}

      {veil === "strong" ? (
        <div className="homera-media-veil" aria-hidden="true" />
      ) : veil === "soft" ? (
        <div className={`pointer-events-none absolute inset-0 z-[1] ${veilClasses.soft}`} aria-hidden="true" />
      ) : null}

      {children}
    </div>
  );
}

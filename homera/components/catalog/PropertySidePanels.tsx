"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarX2, Check, ChevronLeft, ChevronRight, Compass, Flag, Images, Loader2, MapPin, ShieldCheck, X } from "lucide-react";
import { Visual } from "@/components/ui/Visual";
import { apiPost, messageOf } from "@/lib/api-client";
import { REPORT_REASONS } from "@/lib/reports";
import { COMMUNE_MAP_NODES } from "@/lib/commune-map-data";

/* ==================================================================
   HOMERA — FICHE D’UN BIEN : GALERIE, DISPONIBILITÉ, SIGNALEMENT
   ------------------------------------------------------------------
   Trois briques qui manquaient à la fiche et qui changent sa valeur :

   • la galerie montre le bien tel que le propriétaire l’a déposé, dans
     l’ordre qu’il a choisi — pas un visuel unique ;
   • la disponibilité affiche les périodes réellement déclarées, avec
     la date de retour quand elle est connue ;
   • le signalement écrit en base : il arrive aux administrateurs, il
     n’est pas « envoyé » dans le vide.
   ================================================================== */

/* ---------------- Galerie ---------------- */

export function PropertyGallery({
  gallery,
  title,
  fallbackKey,
  fallbackAlt,
  sizes = "(min-width: 1280px) 52vw, (min-width: 1024px) 47vw, 92vw",
  typeLabel,
}: {
  gallery: { mediaKey: string; alt: string }[];
  title: string;
  fallbackKey: string;
  fallbackAlt: string;
  sizes?: string;
  /** Pastille posée sur le visuel principal (type de bien). */
  typeLabel?: string;
}) {
  const photos = gallery.length ? gallery : [{ mediaKey: fallbackKey, alt: fallbackAlt }];
  const [index, setIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const safeIndex = Math.min(index, photos.length - 1);
  const current = photos[safeIndex];
  const at = (offset: number) => photos[(safeIndex + offset + photos.length) % photos.length];
  const move = (offset: number) => setIndex((safeIndex + offset + photos.length) % photos.length);
  const lightbox = (
    <PhotoLightbox
      photos={photos}
      title={title}
      index={safeIndex}
      open={galleryOpen}
      onClose={() => setGalleryOpen(false)}
      onIndex={setIndex}
      onMove={move}
    />
  );

  /* Une seule photo : pas de commandes précédent/suivant fictives. */
  if (photos.length === 1) {
    return (
      <>
        <div id="fiche-galerie" className="relative scroll-mt-24 overflow-hidden rounded-media border border-border bg-surface-hover">
          <Visual
            mediaKey={current.mediaKey}
            alt={current.alt}
            sizes={sizes}
            quality={82}
            priority
            veil="none"
            className="aspect-[16/10] w-full sm:aspect-[2/1]"
          />
          {typeLabel ? (
            <p className="absolute bottom-4 left-4 rounded-full border border-border/70 bg-background/90 px-3.5 py-1.5 text-caption font-semibold text-foreground backdrop-blur-sm">
              {typeLabel}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label={`Agrandir la photo de ${title}`}
            className="homera-press absolute bottom-4 right-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-border/70 bg-background/90 px-4 text-caption font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-background"
          >
            <Images className="h-4 w-4" aria-hidden="true" /> Voir la photo
          </button>
        </div>
        {lightbox}
      </>
    );
  }

  const sideOffsets = photos.length === 2 ? [1] : [1, 2];
  return (
    <>
      <div id="fiche-galerie" className="scroll-mt-24">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:grid-rows-2">
          <div className="relative col-span-2 row-span-1 min-h-0 overflow-hidden rounded-media border border-border bg-surface-hover sm:col-span-3 sm:row-span-2 sm:min-h-[22rem]">
            <Visual
              mediaKey={current.mediaKey}
              alt={current.alt}
              sizes={sizes}
              quality={82}
              priority
              veil="none"
              className="aspect-[16/10] w-full sm:aspect-auto sm:h-full sm:min-h-[22rem]"
            />
            {typeLabel ? (
              <p className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3.5 py-1.5 text-caption font-semibold text-foreground backdrop-blur-sm">
                <Compass className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                {typeLabel}
              </p>
            ) : null}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border border-border/70 bg-background/90 p-1 text-foreground shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Photo précédente"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-12 text-center text-micro font-semibold tabular-nums">{safeIndex + 1} / {photos.length}</span>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Photo suivante"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          {sideOffsets.map((offset, itemIndex) => {
            const photo = at(offset);
            const photoNumber = ((safeIndex + offset) % photos.length) + 1;
            const isLastTile = itemIndex === sideOffsets.length - 1;
            return (
              <div
                key={`${photo.mediaKey}-${offset}`}
                className={`relative min-h-0 overflow-hidden rounded-media border border-border bg-surface-hover sm:col-span-1 ${sideOffsets.length === 1 ? "sm:row-span-2" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setIndex((safeIndex + offset) % photos.length)}
                  aria-label={`Afficher la photo ${photoNumber} sur ${photos.length}`}
                  className="absolute inset-0 block h-full w-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-homera-terracotta"
                >
                  <Visual
                    mediaKey={photo.mediaKey}
                    alt=""
                    sizes="(min-width: 1280px) 17vw, (min-width: 1024px) 15vw, 46vw"
                    quality={72}
                    veil="none"
                    className="aspect-[16/10] w-full sm:aspect-auto sm:h-full"
                  />
                </button>
                {isLastTile && (
                  <button
                    type="button"
                    onClick={() => setGalleryOpen(true)}
                    aria-label={`Voir les ${photos.length} photos en grand format`}
                    className="homera-press absolute bottom-3 right-3 z-2 inline-flex min-h-9 items-center gap-2 rounded-full border border-white/25 bg-homera-night/80 px-3.5 text-caption font-semibold text-homera-cream shadow-sm backdrop-blur-sm transition-colors hover:bg-homera-night"
                  >
                    <Images className="h-4 w-4" aria-hidden="true" /> Voir les photos
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {lightbox}
    </>
  );
}

function PhotoLightbox({
  photos,
  title,
  index,
  open,
  onClose,
  onIndex,
  onMove,
}: {
  photos: { mediaKey: string; alt: string }[];
  title: string;
  index: number;
  open: boolean;
  onClose: () => void;
  onIndex: (index: number) => void;
  onMove: (offset: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const photo = photos[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Galerie photos de ${title}`}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onMove(-1);
        if (event.key === "ArrowRight") onMove(1);
      }}
      className="m-auto h-[min(92dvh,58rem)] w-[min(96vw,90rem)] max-w-none overflow-hidden rounded-modal border border-border bg-background p-0 text-foreground shadow-[var(--shadow-card-hover)] backdrop:bg-homera-night/90"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-note font-semibold">{title}</p>
            <p className="mt-0.5 text-caption text-muted">Photo {index + 1} sur {photos.length}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la galerie"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="relative min-h-0 flex-1 bg-homera-night/95">
          <Visual
            mediaKey={photo.mediaKey}
            alt={photo.alt}
            sizes="96vw"
            quality={88}
            priority
            veil="none"
            className="h-full w-full"
            imageClassName="object-contain"
          />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onMove(-1)}
                aria-label="Photo précédente"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-homera-night/75 text-homera-cream shadow-sm transition-colors hover:bg-homera-night sm:left-6"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                aria-label="Photo suivante"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-homera-night/75 text-homera-cream shadow-sm transition-colors hover:bg-homera-night sm:right-6"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        {photos.length > 1 && (
          <nav aria-label="Choisir une photo" className="flex shrink-0 gap-2 overflow-x-auto border-t border-border bg-card p-3 sm:px-5">
            {photos.map((item, itemIndex) => (
              <button
                key={`${item.mediaKey}-${itemIndex}`}
                type="button"
                onClick={() => onIndex(itemIndex)}
                aria-current={itemIndex === index ? "true" : undefined}
                aria-label={`Afficher la photo ${itemIndex + 1}`}
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${itemIndex === index ? "border-homera-terracotta" : "border-transparent hover:border-border"}`}
              >
                <Visual mediaKey={item.mediaKey} alt="" sizes="80px" quality={54} veil="none" className="h-full w-full" />
              </button>
            ))}
          </nav>
        )}
      </div>
    </dialog>
  );
}

/* ---------------- Disponibilité ---------------- */

export type AvailabilityWindow = { start: string; end: string; kind: string; reason: string };

export function PropertyAvailability({
  status,
  windows,
  note = "",
}: {
  status: string;
  windows: AvailabilityWindow[];
  note?: string;
}) {
  const day = (value: string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(value.length <= 10 ? `${value}T00:00:00Z` : value),
    );
  const future = windows.filter((entry) => entry.kind !== "disponible" && entry.end >= new Date().toISOString().slice(0, 10));

  return (
    <section aria-labelledby="detail-availability" className="mt-10 rounded-card border border-border bg-card p-5">
      <h2 id="detail-availability" className="font-serif text-display-xs">Disponibilité</h2>
      {status === "indisponible" ? (
        <p className="mt-3 flex items-start gap-2 text-note text-error">
          <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Ce bien est déclaré indisponible à la date d’aujourd’hui. Les demandes de visite sont suspendues sur ce dossier.
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-note text-success">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Disponible à la date d’aujourd’hui, sous réserve de confirmation du créneau par le propriétaire ou l’agent mandaté.
        </p>
      )}
      {note && <p className="mt-2 text-caption leading-relaxed text-muted">{note}</p>}
      {future.length > 0 && (
        <ul className="mt-4 space-y-2">
          {future.map((entry) => (
            <li key={`${entry.start}-${entry.end}`} className="rounded-xl border border-border bg-background px-3 py-2 text-caption">
              <span className="font-semibold">
                Du {day(entry.start)} au {day(entry.end)}
              </span>
              {entry.reason && <span className="mt-0.5 block text-muted">{entry.reason}</span>}
            </li>
          ))}
        </ul>
      )}
      {future.length === 0 && (
        <p className="mt-4 text-caption text-muted">Aucune période d’indisponibilité déclarée à venir.</p>
      )}
    </section>
  );
}

/* ---------------- Profil vérifié ---------------- */

export type VerifiedOwner = {
  name: string;
  memberSince: string;
  publishedProperties: number;
  verifiedProperties: number;
  emailVerified: boolean;
};

export function VerifiedOwnerCard({ owner, verifiedOn }: { owner: VerifiedOwner | null; verifiedOn: string | null }) {
  if (!owner) return null;
  const since = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(owner.memberSince.length <= 10 ? `${owner.memberSince}T00:00:00Z` : owner.memberSince),
  );
  return (
    <section aria-labelledby="detail-owner" className="mt-10 rounded-card border border-border bg-card p-5">
      <h2 id="detail-owner" className="flex items-center gap-2 font-serif text-display-xs">
        <ShieldCheck className="h-5 w-5 text-homera-terracotta" aria-hidden="true" />
        Interlocuteur vérifié
      </h2>
      <p className="mt-3 text-note font-semibold">{owner.name}</p>
      <p className="mt-1 text-caption text-muted">Membre HOMERA depuis {since}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <dt className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">Biens publiés</dt>
          <dd className="homera-num mt-1 text-caption font-medium">{owner.publishedProperties}</dd>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <dt className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">Dossiers vérifiés</dt>
          <dd className="homera-num mt-1 text-caption font-medium">{owner.verifiedProperties}</dd>
        </div>
      </dl>
      <ul className="mt-4 space-y-1.5 text-caption text-muted">
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          Adresse e-mail {owner.emailVerified ? "confirmée" : "en attente de confirmation"}
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          {verifiedOn ? `Bien contrôlé le ${verifiedOn}` : "Bien en cours de contrôle"}
        </li>
      </ul>
      <p className="mt-4 text-micro leading-relaxed text-muted">
        Le contrôle HOMERA porte sur le dossier déclaré (identité, titre, mandat). Il ne remplace ni l’avis
        d’un notaire ni une vérification foncière officielle.
      </p>
    </section>
  );
}

/* ---------------- Repère de localisation ---------------- */

export function PropertyLocationCard({
  city,
  district,
  description,
  highlights,
}: {
  city: string;
  district: string;
  description: string;
  highlights: { label: string; detail: string }[];
}) {
  const commune = COMMUNE_MAP_NODES.find((entry) => entry.name === city);
  const safeHighlights = highlights
    .filter((entry) => !/\d|\bmin(?:ute)?s?\b|\bkm\b|kilom[eè]tres?|m[eè]tres?/i.test(entry.detail))
    .slice(0, 2);

  return (
    <section aria-labelledby="detail-location-card" className="rounded-card border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-homera-terracotta" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="detail-location-card" className="text-body-sm font-semibold text-foreground">
            {district}, {city}
          </h2>
          <p className="mt-1 text-caption leading-relaxed text-muted">{description}</p>
        </div>
      </div>

      {commune ? (
        <div className="relative mt-4 overflow-hidden rounded-media border border-border bg-background">
          <svg
            viewBox="0 0 600 225"
            role="img"
            aria-label={`Repère schématique de la commune ${city}, quartier ${district}. Il ne précise pas l’adresse du bien.`}
            className="block h-40 w-full sm:h-44"
          >
            <path d="M 0 182 Q 160 174 330 172 T 600 160 L 600 225 L 0 225 Z" fill="var(--homera-terracotta)" fillOpacity=".08" />
            <path d="M 0 182 Q 160 174 330 172 T 600 160" fill="none" stroke="var(--homera-terracotta)" strokeWidth="2" strokeDasharray="5 5" strokeOpacity=".65" />
            <ellipse cx="322" cy="122" rx="48" ry="20" fill="var(--homera-amber)" fillOpacity=".10" stroke="var(--border)" />
            <ellipse cx="472" cy="134" rx="38" ry="14" fill="var(--homera-amber)" fillOpacity=".10" stroke="var(--border)" />
            <path d="M 108 162 Q 220 164 334 158 L 286 78 M 334 158 Q 415 138 498 112" fill="none" stroke="var(--border)" strokeWidth="2" />
            <text x="322" y="125" textAnchor="middle" fill="var(--muted)" fontSize="9" fontWeight="600" letterSpacing="1.2">LAC NOKOUÉ</text>
            <text x="500" y="207" textAnchor="end" fill="var(--muted)" fontSize="9" fontWeight="600" letterSpacing="1.1">LITTORAL ATLANTIQUE</text>
            {COMMUNE_MAP_NODES.map((point) => {
              const active = point.name === city;
              return (
                <g key={point.name} aria-hidden="true">
                  {active && <circle cx={point.x} cy={point.y} r="22" fill="var(--homera-terracotta)" fillOpacity=".16" />}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 9 : 5}
                    fill={active ? "var(--homera-terracotta)" : "var(--card)"}
                    stroke={active ? "var(--homera-terracotta)" : "var(--muted)"}
                    strokeWidth="2"
                  />
                  <text x={point.x} y={point.y - 15} textAnchor={point.labelAlign} fill={active ? "var(--foreground)" : "var(--muted)"} fontSize={active ? "12" : "10"} fontWeight={active ? "700" : "500"}>
                    {point.name}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="absolute bottom-2 left-2 rounded-full border border-border/70 bg-background/90 px-2.5 py-1 text-micro font-medium text-muted backdrop-blur-sm">
            Repère communal approximatif
          </p>
          <p className="absolute right-2 top-2 rounded-full border border-border/70 bg-background/90 px-2.5 py-1 text-micro font-semibold text-foreground backdrop-blur-sm">
            {district}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex min-h-36 items-center justify-center rounded-media border border-dashed border-border bg-background px-5 text-center">
          <p className="text-caption leading-relaxed text-muted">Aucun repère cartographique n’est disponible pour {city}. L’adresse exacte n’est pas affichée.</p>
        </div>
      )}

      {safeHighlights.length > 0 && (
        <ul className="mt-4 grid gap-3 border-t border-border pt-4">
          {safeHighlights.map((item) => (
            <li key={item.label}>
              <p className="text-micro font-semibold uppercase tracking-[0.13em] text-homera-terracotta">{item.label}</p>
              <p className="mt-1 text-caption leading-relaxed text-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/explorer?ville=${encodeURIComponent(city)}&quartier=${encodeURIComponent(district)}`}
        className="homera-underline mt-4 inline-flex min-h-9 items-center gap-2 text-caption font-semibold homera-accent-ink"
      >
        Explorer ce quartier <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}

/* ---------------- Signalement ---------------- */


export function ReportListing({ propertyId, reference }: { propertyId: string; reference: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const send = async () => {
    setOutcome(null);
    if (detail.trim().length < 10) {
      setOutcome({ tone: "error", text: "Décrivez le problème en quelques mots (10 caractères minimum)." });
      return;
    }
    setBusy(true);
    const result = await apiPost<{ id: string }>(`/api/properties/${propertyId}/report`, { reason, detail });
    setBusy(false);
    if (!result.ok) {
      setOutcome({ tone: "error", text: messageOf(result) });
      return;
    }
    setOutcome({
      tone: "ok",
      text: "Signalement enregistré. Il arrive dans la file de modération HOMERA et sera traité par un administrateur — vous n’avez rien d’autre à envoyer.",
    });
    setDetail("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 text-caption font-semibold text-muted transition-colors hover:text-error"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        Signaler cette annonce
      </button>
    );
  }

  return (
    <section aria-labelledby="detail-report" className="mt-6 rounded-card border border-border bg-card p-5">
      <h2 id="detail-report" className="flex items-center gap-2 text-note font-semibold">
        <AlertTriangle className="h-4 w-4 text-error" aria-hidden="true" />
        Signaler l’annonce {reference}
      </h2>
      <label className="mt-4 block text-caption font-semibold" htmlFor="report-reason">Motif
        <select
          id="report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-note"
        >
          {REPORT_REASONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-caption font-semibold" htmlFor="report-detail">Précisions
        <textarea
          id="report-detail"
          rows={3}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          maxLength={1000}
          className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-note"
          placeholder="Décrivez précisément ce qui vous semble faux. Ces éléments sont transmis à l’équipe de modération."
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void send()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-btn bg-error px-4 text-note font-semibold text-white disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Envoyer le signalement
        </button>
        <button type="button" onClick={() => { setOpen(false); setOutcome(null); }} className="inline-flex min-h-11 items-center rounded-btn border border-border px-4 text-note font-semibold">
          Annuler
        </button>
      </div>
      {outcome && (
        <p role="status" className={`mt-3 rounded-xl border px-3 py-2 text-caption font-semibold ${outcome.tone === "ok" ? "border-success/20 bg-success/[0.05] text-success" : "border-error/25 bg-error/[0.05] text-error"}`}>
          {outcome.text}
        </p>
      )}
    </section>
  );
}

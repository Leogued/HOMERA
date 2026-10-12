"use client";

import { useState } from "react";
import { AlertTriangle, CalendarX2, Check, ChevronLeft, ChevronRight, Flag, Loader2, ShieldCheck } from "lucide-react";
import { Visual } from "@/components/ui/Visual";
import { apiPost, messageOf } from "@/lib/api-client";
import { REPORT_REASONS } from "@/lib/reports";

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
  sizes = "(min-width: 1024px) 44vw, 92vw",
}: {
  gallery: { mediaKey: string; alt: string }[];
  title: string;
  fallbackKey: string;
  fallbackAlt: string;
  sizes?: string;
}) {
  const photos = gallery.length ? gallery : [{ mediaKey: fallbackKey, alt: fallbackAlt }];
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, photos.length - 1);
  const current = photos[safeIndex];

  return (
    <div>
      <div className="relative overflow-hidden rounded-media border border-border bg-surface-hover">
        <Visual
          mediaKey={current.mediaKey}
          alt={current.alt}
          sizes={sizes}
          quality={80}
          priority
          veil="none"
          className="aspect-[16/10] w-full"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((safeIndex - 1 + photos.length) % photos.length)}
              aria-label="Visuel précédent"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm transition-colors hover:bg-background"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((safeIndex + 1) % photos.length)}
              aria-label="Visuel suivant"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm transition-colors hover:bg-background"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <p className="absolute bottom-3 right-3 rounded-full bg-background/85 px-3 py-1 text-micro font-semibold tabular-nums text-foreground">
              {safeIndex + 1} / {photos.length}
            </p>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={`Visuels du bien : ${title}`}>
          {photos.map((photo, photoIndex) => (
            <li key={`${photo.mediaKey}-${photoIndex}`}>
              <button
                type="button"
                onClick={() => setIndex(photoIndex)}
                aria-current={photoIndex === safeIndex}
                className={`block overflow-hidden rounded-lg border-2 transition-colors ${photoIndex === safeIndex ? "border-homera-terracotta" : "border-transparent hover:border-border"}`}
              >
                <Visual
                  mediaKey={photo.mediaKey}
                  alt=""
                  sizes="96px"
                  quality={50}
                  veil="none"
                  className="h-16 w-24"
                />
                <span className="sr-only">Voir le visuel {photoIndex + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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

export function VerifiedOwnerCard({ owner, verifiedOn }: { owner: VerifiedOwner | null; verifiedOn: string }) {
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
          Bien contrôlé le {verifiedOn}
        </li>
      </ul>
      <p className="mt-4 text-micro leading-relaxed text-muted">
        Le contrôle HOMERA porte sur le dossier déclaré (identité, titre, mandat). Il ne remplace ni l’avis
        d’un notaire ni une vérification foncière officielle.
      </p>
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

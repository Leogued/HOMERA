import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, Clock, History } from "lucide-react";
import { PageHero } from "@/components/catalog/PageHero";

/* ==================================================================
   HISTORIQUE PUBLIC D’UN BIEN
   ------------------------------------------------------------------
   La chronologie est construite côté serveur à partir du journal
   d’audit : chaque ligne correspond à un événement réellement
   enregistré, daté par le serveur. Aucune étape illustrative : un
   dossier sans événement affiche son état actuel, et c’est tout.
   ================================================================== */

export type PropertyHistoryData = {
  reference: string;
  title: string;
  place: string;
  propertyId: string;
  verifiedOn: string | null;
  publishedAt: string | null;
  events: { title: string; date: string; detail: string; status: "done" | "current" }[];
};

const ICONS = [History, Clock, CheckCircle2];

export function PropertyHistory({ history }: { history: PropertyHistoryData }) {
  const { reference, title, place, events } = history;
  return (
    <>
      <PageHero
        crumbs={[
          { label: "Accueil", href: "/" },
          { label: "Explorer", href: "/explorer" },
          { label: "Historique du bien" },
        ]}
        eyebrow="Traçabilité du bien"
        title="Une histoire lisible, étape par étape"
        intro="Cette chronologie reprend les événements réellement enregistrés dans le journal HOMERA, avec leur date serveur. Elle ne remplace pas les actes originaux ni une consultation auprès d’un professionnel du droit."
        facts={[
          { label: "Référence", value: reference },
          { label: "Localisation", value: place },
          { label: "Événements", value: String(events.length) },
        ]}
        actions={
          <Link
            href={`/biens/${history.propertyId}`}
            className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-semibold text-foreground hover:border-homera-terracotta hover:text-homera-terracotta"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour à la fiche
          </Link>
        }
      />
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="mb-7 rounded-card border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-homera-terracotta">{reference}</p>
          <h2 className="mt-2 font-serif text-display-sm">{title}</h2>
          <p className="mt-2 text-body-sm text-muted">{place}</p>
        </div>

        <ol className="space-y-0" aria-label={`Historique de ${reference}`}>
          {events.map((event, index) => {
            const Icon = ICONS[Math.min(index, ICONS.length - 1)];
            const last = index === events.length - 1;
            return (
              <li key={`${event.title}-${event.date}-${index}`} className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-4 pb-7 last:pb-0">
                {!last && <span className="absolute bottom-0 left-[21px] top-10 w-px bg-border" aria-hidden="true" />}
                <span
                  className={`relative z-[1] flex h-11 w-11 items-center justify-center rounded-full border ${
                    event.status === "done"
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-warning/30 bg-warning/10 text-warning"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div
                  className={`rounded-card border p-4 sm:p-5 ${
                    event.status === "current" ? "border-warning/30 bg-warning/[0.04]" : "border-border bg-card"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-body-sm font-semibold">{event.title}</h3>
                    <time className="text-caption text-muted">{event.date}</time>
                  </div>
                  <p className="mt-2 text-note leading-relaxed text-muted">{event.detail}</p>
                  <p className="mt-3 text-micro font-semibold uppercase tracking-[0.12em] text-muted-light">
                    {event.status === "done" ? "Événement journalisé" : "État au jour de la consultation"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 rounded-card border border-info/25 bg-info/[0.05] p-5">
          <p className="flex items-center gap-2 text-note font-semibold">
            <CalendarClock className="h-4 w-4 text-info" aria-hidden="true" />
            Comment lire cet historique ?
          </p>
          <p className="mt-2 text-caption leading-relaxed text-muted">
            Chaque ligne correspond à une entrée du journal HOMERA, horodatée par le serveur au moment de l’action. Les
            échanges internes, les pièces du dossier et les commentaires d’instruction restent réservés au propriétaire
            et à l’administration : seuls les faits opposables sont rendus publics. Un contrôle documentaire ne
            constitue ni un titre de propriété ni une garantie juridique.
          </p>
          <Link
            href="/services"
            className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold text-homera-terracotta hover:underline"
          >
            Comprendre les services HOMERA
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}

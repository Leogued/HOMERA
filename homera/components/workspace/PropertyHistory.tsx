import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, FileText, House, KeyRound, UserRound } from "lucide-react";
import { PROPERTIES } from "@/lib/content";
import { DEMO_OWNER_LISTINGS } from "@/lib/portal-data";
import { PageHero } from "@/components/catalog/PageHero";

export function PropertyHistory({ reference }: { reference: string }) {
  const property = PROPERTIES.find((entry) => entry.id === reference || entry.homeraId === reference);
  const ownerListing = DEMO_OWNER_LISTINGS.find((entry) => entry.reference === reference || entry.id === reference);
  const propertyRef = property?.homeraId ?? ownerListing?.reference ?? reference;
  const title = property?.title ?? ownerListing?.title ?? "Bien HOMERA";
  const city = property ? `${property.district}, ${property.city}` : ownerListing ? `${ownerListing.district}, ${ownerListing.city}` : "Dossier immobilier";
  const timeline = property ? [
    { icon: House, title: "Dossier créé", date: "14 août 2026", detail: "La fiche de bien a reçu une référence HOMERA unique.", status: "done" },
    { icon: UserRound, title: "Propriétaire identifié", date: "15 août 2026", detail: "L’identité déclarée a été rapprochée des pièces du dossier.", status: "done" },
    { icon: KeyRound, title: "Agent autorisé", date: "18 août 2026", detail: "Un mandat nominatif a été associé à cette référence de bien.", status: "done" },
    { icon: BadgeCheck, title: "Vérification documentaire", date: property.verifiedOn, detail: "Les pièces indiquées sur la fiche ont été examinées à cette date. Ce contrôle ne constitue pas une garantie juridique.", status: "done" },
    { icon: CheckCircle2, title: "Publication", date: property.publishedAt, detail: "Le bien a été rendu consultable dans le catalogue public HOMERA.", status: "done" },
    { icon: FileText, title: "Dernière mise à jour", date: "21 septembre 2026", detail: "Informations de fiche révisées dans le jeu de démonstration.", status: "done" },
    { icon: UserRound, title: "Changement de propriétaire", date: "Aucun événement déclaré", detail: "Aucun changement de propriétaire n’est enregistré dans cet historique pilote.", status: "future" },
  ] : [
    { icon: House, title: "Dossier créé", date: "30 septembre 2026", detail: "Référence réservée dans les exemples de gestion propriétaire.", status: "done" },
    { icon: BadgeCheck, title: "Vérification", date: "En cours", detail: "Le statut dépend du dossier de démonstration présenté dans l’espace propriétaire.", status: "current" },
    { icon: CheckCircle2, title: "Publication", date: "À venir", detail: "La publication attend la validation documentaire.", status: "future" },
    { icon: UserRound, title: "Changement de propriétaire", date: "Aucun événement déclaré", detail: "Aucun changement de propriétaire n’est enregistré.", status: "future" },
  ];
  return <>
    <PageHero crumbs={[{ label: "Accueil", href: "/" }, { label: "Explorer", href: "/explorer" }, { label: "Historique du bien" }]} eyebrow="Traçabilité du bien" title="Une histoire lisible, étape par étape" intro="Cette chronologie distingue les événements enregistrés des contrôles déclarés. Elle ne remplace pas les actes originaux ni une consultation auprès d’un professionnel du droit." facts={[{ label: "Référence", value: propertyRef }, { label: "Localisation", value: city }, { label: "Événements", value: String(timeline.length) }]} actions={<Link href={property ? `/biens/${property.id}` : "/explorer"} className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-semibold text-foreground hover:border-homera-terracotta hover:text-homera-terracotta"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{property ? "Retour à la fiche" : "Retour à l’exploration"}</Link>} />
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 lg:px-8"><div className="mb-7 rounded-card border border-border bg-card p-5 shadow-[var(--shadow-card)]"><p className="text-caption font-semibold uppercase tracking-[0.16em] text-homera-terracotta">{propertyRef}</p><h2 className="mt-2 font-serif text-display-sm">{title}</h2><p className="mt-2 text-body-sm text-muted">{city}</p></div>
      <ol className="space-y-0" aria-label={`Historique de ${propertyRef}`}>{timeline.map((event, index) => <li key={`${event.title}-${index}`} className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-4 pb-7 last:pb-0">{index < timeline.length - 1 && <span className="absolute bottom-0 left-[21px] top-10 w-px bg-border" aria-hidden="true" />}<span className={`relative z-[1] flex h-11 w-11 items-center justify-center rounded-full border ${event.status === "done" ? "border-success/30 bg-success/10 text-success" : event.status === "current" ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-background text-muted-light"}`}><event.icon className="h-4 w-4" aria-hidden="true" /></span><div className={`rounded-card border p-4 sm:p-5 ${event.status === "current" ? "border-warning/30 bg-warning/[0.04]" : "border-border bg-card"}`}><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-body-sm font-semibold">{event.title}</h3><time className="text-caption text-muted">{event.date}</time></div><p className="mt-2 text-note leading-relaxed text-muted">{event.detail}</p><p className="mt-3 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-muted-light">{event.status === "done" ? "Événement du jeu de démonstration" : event.status === "current" ? "État actuel" : "Aucun événement enregistré"}</p></div></li>)}</ol>
      <div className="mt-8 rounded-card border border-info/25 bg-info/[0.05] p-5"><p className="flex items-center gap-2 text-note font-semibold"><CalendarClock className="h-4 w-4 text-info" aria-hidden="true" />Comment lire cet historique ?</p><p className="mt-2 text-caption leading-relaxed text-muted">Les dates et événements affichés ici servent à illustrer la traçabilité. En production, chaque entrée devra inclure sa source, son auteur, une empreinte et un horodatage vérifiable.</p><Link href="/services/gestion-immobiliere" className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold text-homera-terracotta hover:underline">Comprendre les services HOMERA<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
    </div>
  </>;
}

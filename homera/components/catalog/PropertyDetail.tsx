import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  Bed,
  Building2,
  CalendarCheck,
  Check,
  FileText,
  Layers,
  MapPin,
  Maximize,
  Ruler,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DEMO_DATA, FEATURE_LABELS, type Property } from "@/lib/content";
import { DEMO_AGENT_AUTHORIZATIONS } from "@/lib/portal-data";
import {
  INTENT_LABELS,
  LAND_TITLE_LABELS,
  TYPE_LABELS,
  daysBetween,
  formatPropertyPrice,
  formatSurface,
  recencyLabel,
} from "@/lib/format";
import { LATEST_PUBLISHED_AT, searchCatalog, EMPTY_QUERY } from "@/lib/properties";
import { CopyReference } from "@/components/ui/CopyReference";
import { FavoriteButton } from "@/components/catalog/FavoriteButton";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { Breadcrumbs } from "@/components/catalog/PageHero";
import { PropertyCard } from "@/components/catalog/PropertyCard";
/* ================================================================== HOMERA — FICHE D’UN BIEN ------------------------------------------------------------------ Ce qu’un visiteur doit pouvoir lire sans compte : ce qu’est le bien, ce qu’il coûte, où il se trouve, et — surtout — ce qui a été contrôlé, par qui et quand. Aucune promesse juridique : la fiche décrit un dossier, elle ne le garantit pas. ================================================================== */ const PROJECT_HREF: Record<
  Property["intent"],
  string
> = { acheter: "/acheter", louer: "/louer", sejour: "/sejour" };
export function PropertyDetail({ property }: { property: Property }) {
  const facts = [
    { label: "Type de bien", value: TYPE_LABELS[property.type], icon: Building2 },
    {
      label: property.type === "terrain" ? "Surface du terrain" : "Surface",
      value: formatSurface(property.surface),
      icon: Maximize,
    },
    ...(property.rooms ? [{ label: "Pièces", value: `${property.rooms}`, icon: Layers }] : []),
    ...(property.bedrooms > 0 ? [{ label: "Chambres", value: `${property.bedrooms}`, icon: Bed }] : []),
    ...(property.bathrooms > 0 ? [{ label: "Salles d’eau", value: `${property.bathrooms}`, icon: Bath }] : []),
    ...(property.floor ? [{ label: "Niveau", value: property.floor, icon: Ruler }] : []),
    ...(property.landTitle
      ? [{ label: "Situation foncière", value: LAND_TITLE_LABELS[property.landTitle], icon: FileText }]
      : []),
    ...(property.minNights
      ? [
          {
            label: "Durée minimale",
            value: `${property.minNights} nuit${property.minNights > 1 ? "s" : ""}`,
            icon: CalendarCheck,
          },
        ]
      : []),
    { label: "Ville", value: property.city, icon: MapPin },
    ...(property.availabilityStatus === "indisponible" ? [{ label: "Disponibilité", value: "Indisponible", icon: CalendarCheck }] : []),
  ];
  const similar = searchCatalog({ ...EMPTY_QUERY, intent: property.intent, types: [property.type] })
    .filter((entry) => entry.id !== property.id)
    .slice(0, 3);
  const fresh = daysBetween(property.publishedAt, LATEST_PUBLISHED_AT);
  return (
    <article className="bg-background text-foreground">
      {" "}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {" "}
        <Breadcrumbs
          items={[
            { label: "Accueil", href: "/" },
            { label: "Explorer", href: "/explorer" },
            { label: INTENT_LABELS[property.intent], href: PROJECT_HREF[property.intent] },
            { label: property.title },
          ]}
        />{" "}
        <Link
          href="/explorer"
          className="homera-underline mt-6 inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink"
        >
          {" "}
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Revenir aux résultats{" "}
        </Link>{" "}
        {/* ---------------- En-tête du bien ---------------- */}{" "}
        <header className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1.35fr_1fr]">
          {" "}
          <div>
            {" "}
            <div className="flex flex-wrap items-center gap-2 text-micro font-semibold uppercase tracking-[.14em]">
              {" "}
              <span className="rounded-full homera-cta px-3 py-1.5 text-white ">
                {" "}
                {INTENT_LABELS[property.intent]}{" "}
              </span>{" "}
              <span className="rounded-full border border-border px-3 py-1.5 text-muted">
                {TYPE_LABELS[property.type]}
              </span>{" "}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-homera-terracotta/30 bg-homera-terracotta/[0.08] px-3 py-1.5 homera-accent-ink">
                {" "}
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Vérifié HOMERA{" "}
              </span>{" "}
              {property.availabilityStatus === "indisponible" && <span className="rounded-full border border-error/25 bg-error/[0.08] px-3 py-1.5 text-error">Indisponible</span>}{" "}
              {fresh <= 7 && (
                <span className="rounded-full bg-homera-amber px-3 py-1.5 text-homera-night">Nouveau</span>
              )}{" "}
            </div>{" "}
            <h1 className="mt-5 max-w-2xl font-serif text-display-md sm:text-display-lg">{property.title}</h1>{" "}
            <p className="mt-4 flex items-center gap-2 text-body-sm text-muted">
              {" "}
              <MapPin className="h-4 w-4 text-homera-terracotta" aria-hidden="true" /> {property.district},{" "}
              {property.city}{" "}
            </p>{" "}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {" "}
              <p className="homera-num font-serif text-display-sm"> {formatPropertyPrice(property)} </p>{" "}
              <span className="text-caption text-muted">Prix affiché par le propriétaire</span>{" "}
            </div>{" "}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {" "}
              {property.availabilityStatus === "indisponible" ? (
                <button type="button" disabled className="inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-btn bg-surface-hover px-5 text-body-sm font-semibold text-muted opacity-80" aria-label="Bien indisponible, demande de visite désactivée">
                  Bien indisponible
                </button>
              ) : (
                <Link
                  href={`/client/visites/nouvelle?bien=${property.id}`}
                  className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white transition-colors "
                >
                  Demander une visite <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}{" "}
              <Link
                href="/contact"
                className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn border border-border px-5 text-body-sm font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
              >
                {" "}
                Poser une question{" "}
              </Link>{" "}
              <FavoriteButton
                propertyId={property.id}
                title={property.title}
                size="detail"
                withLabel
                tone="onSurface"
              />{" "}
              <span className="text-caption text-muted">
                {" "}
                Référence <span className="homera-num font-mono text-foreground">{property.homeraId}</span> · publié{" "}
                {recencyLabel(property.publishedAt, LATEST_PUBLISHED_AT)}{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          <Reveal y={0} blur={0} clip clipRadius={24} duration={900} immediate>
            {" "}
            <Visual
              mediaKey={property.media}
              alt={property.alt}
              sizes="(min-width: 1024px) 44vw, 92vw"
              veil="none"
              quality={74}
              priority
              className="aspect-[16/10] w-full rounded-media"
              imageClassName="homera-property-image"
            />{" "}
          </Reveal>{" "}
        </header>{" "}
        {/* ---------------- Corps de fiche ---------------- */}{" "}
        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_22rem]">
          {" "}
          <div className="space-y-12">
            {" "}
            <section aria-labelledby="detail-description">
              {" "}
              <h2 id="detail-description" className="font-serif text-display-xs">
                Le bien
              </h2>{" "}
              <p className="mt-4 max-w-2xl text-body-sm leading-relaxed text-muted sm:text-body">
                {" "}
                {property.description ??
                  "La description détaillée de ce bien est en cours de rédaction. Demandez la fiche complète lors de votre prise de contact."}{" "}
              </p>{" "}
              {property.features && property.features.length > 0 && (
                <>
                  {" "}
                  <h3 className="mt-8 text-label uppercase text-muted">Équipements déclarés</h3>{" "}
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {" "}
                    {property.features.map((feature) => (
                      <li
                        key={feature}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-note text-foreground"
                      >
                        {" "}
                        <Check className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />{" "}
                        {FEATURE_LABELS[feature]}{" "}
                      </li>
                    ))}{" "}
                  </ul>{" "}
                </>
              )}{" "}
            </section>{" "}
            <section aria-labelledby="detail-facts">
              {" "}
              <h2 id="detail-facts" className="font-serif text-display-xs">
                Caractéristiques
              </h2>{" "}
              <dl className="mt-5 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
                {" "}
                {facts.map((fact) => (
                  <div key={fact.label} className="flex items-start gap-3 border-b border-border pb-3">
                    {" "}
                    <fact.icon className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />{" "}
                    <div>
                      {" "}
                      <dt className="text-caption uppercase tracking-[0.14em] text-muted">{fact.label}</dt>{" "}
                      <dd className="homera-num mt-0.5 text-body-sm font-medium text-foreground">{fact.value}</dd>{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </dl>{" "}
            </section>{" "}
            <section
              aria-labelledby="detail-verification"
              className="rounded-card border border-border bg-card p-6 sm:p-8"
            >
              {" "}
              <h2 id="detail-verification" className="font-serif text-display-xs">
                Ce qui a été contrôlé
              </h2>{" "}
              <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-muted">
                {" "}
                Chaque bien publié sous identifiant HOMERA passe par le même protocole. Voici ce que la fiche atteste
                — et ce qu’elle n’atteste pas.{" "}
              </p>{" "}
              <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {" "}
                {[
                  {
                    icon: FileText,
                    title: "Pièces de propriété examinées",
                    detail: "Titre, ACD ou convention, selon le cas déclaré.",
                  },
                  {
                    icon: Users,
                    title: "Propriétaire identifié",
                    detail: "Le titulaire du droit est identifié dans le dossier.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Mandat vérifié",
                    detail: "L’autorisation de commercialiser et son étendue sont contrôlées.",
                  },
                  {
                    icon: CalendarCheck,
                    title: "Vérification datée",
                    detail: `Contrôle effectué le ${property.verifiedOn}.`,
                  },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    {" "}
                    <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />{" "}
                    <div>
                      {" "}
                      <p className="text-body-sm font-medium text-foreground">{item.title}</p>{" "}
                      <p className="mt-1 text-caption leading-relaxed text-muted">{item.detail}</p>{" "}
                    </div>{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
              <p className="mt-6 border-t border-border pt-4 text-caption leading-relaxed text-muted">
                {" "}
                Le statut « Vérifié HOMERA » atteste d’un contrôle documentaire à la date indiquée. Il ne constitue ni
                un titre de propriété, ni une garantie juridique : la vérification finale relève du notaire et des
                autorités compétentes.{" "}
              </p>{" "}
              <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-4">
                <Link href={`/historique/${property.homeraId}`} className="homera-underline inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold homera-accent-ink">
                  Consulter l’historique du bien <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                {DEMO_AGENT_AUTHORIZATIONS.filter((authorization) => authorization.propertyId === property.id && authorization.status === "active").map((authorization) => (
                  <Link key={authorization.agentId} href={`/verification-agent?agent=${authorization.agentId}&bien=${authorization.propertyRef}`} className="homera-underline inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold homera-accent-ink">
                    Vérifier l’agent autorisé <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>{" "}
          </div>{" "}
          {/* ---------------- Colonne latérale ---------------- */}{" "}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {" "}
            <div className="rounded-card border border-border bg-card p-6">
              {" "}
              <h2 className="text-label uppercase text-muted">Référence du bien</h2>{" "}
              <p id="detail-reference" className="homera-num mt-3 font-mono text-display-xs text-foreground">
                {property.homeraId}
              </p>{" "}
              <div className="mt-4">
                {" "}
                <CopyReference value={property.homeraId} targetId="detail-reference" />{" "}
              </div>{" "}
              <dl className="mt-6 space-y-3 border-t border-border pt-5 text-note">
                {" "}
                <div className="flex items-center justify-between gap-3">
                  {" "}
                  <dt className="text-muted">Vérifié le</dt>{" "}
                  <dd className="homera-num text-foreground">{property.verifiedOn}</dd>{" "}
                </div>{" "}
                <div className="flex items-center justify-between gap-3">
                  {" "}
                  <dt className="text-muted">Mis en ligne</dt>{" "}
                  <dd className="text-foreground">{recencyLabel(property.publishedAt, LATEST_PUBLISHED_AT)}</dd>{" "}
                </div>{" "}
                <div className="flex items-center justify-between gap-3">
                  {" "}
                  <dt className="text-muted">Projet</dt>{" "}
                  <dd className="text-foreground">{INTENT_LABELS[property.intent]}</dd>{" "}
                </div>{" "}
              </dl>{" "}
            </div>{" "}
            <div className="rounded-card border border-homera-terracotta/25 bg-homera-terracotta/[0.06] p-6">
              {" "}
              <h2 className="font-serif text-display-xs">Organiser une visite</h2>{" "}
              <p className="mt-2 text-note leading-relaxed text-muted">
                {" "}
                Indiquez vos créneaux : un mandataire identifié vous répond et vous confirme l’accès au bien.{" "}
              </p>{" "}
              <Link
                href={`/client/visites/nouvelle?bien=${property.id}`}
                className="homera-press mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-btn homera-cta text-note font-medium text-white "
              >
                {" "}
                Demander une visite <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
              </Link>{" "}
            </div>{" "}
            {DEMO_DATA && (
              <p className="text-caption leading-relaxed text-muted">
                {" "}
                Fiche de démonstration du système pilote HOMERA : le bien et le visuel sont illustratifs et ne
                constituent pas une offre commerciale.{" "}
              </p>
            )}{" "}
          </aside>{" "}
        </div>{" "}
        {/* ---------------- Biens comparables ---------------- */}{" "}
        {similar.length > 0 && (
          <section aria-labelledby="detail-similar" className="mt-20">
            {" "}
            <div className="flex flex-wrap items-end justify-between gap-4">
              {" "}
              <h2 id="detail-similar" className="font-serif text-display-sm">
                {" "}
                {TYPE_LABELS[property.type]}s disponibles {INTENT_LABELS[property.intent].toLowerCase()}{" "}
              </h2>{" "}
              <Link
                href={PROJECT_HREF[property.intent]}
                className="homera-underline inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink"
              >
                {" "}
                Voir la page {INTENT_LABELS[property.intent]}{" "}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />{" "}
              </Link>{" "}
            </div>{" "}
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {" "}
              {similar.map((entry) => (
                <li key={entry.id} className="h-full">
                  {" "}
                  <PropertyCard property={entry} layout="grid" />{" "}
                </li>
              ))}{" "}
            </ul>{" "}
          </section>
        )}{" "}
      </div>{" "}
    </article>
  );
}

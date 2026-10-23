import Link from "next/link";
import {
  ArrowRight,
  Bath,
  Bed,
  Briefcase,
  Building2,
  CalendarCheck,
  Car,
  Check,
  Clock,
  Droplets,
  Fence,
  FileCheck,
  FileText,
  Layers,
  Leaf,
  MapPin,
  Maximize,
  Route,
  Ruler,
  ShieldCheck,
  Snowflake,
  Sofa,
  Store,
  Sun,
  Users,
  UtensilsCrossed,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { DEMO_DATA, FEATURE_LABELS, type Property, type PropertyFeature } from "@/lib/content";
import {
  buildPropertyEditorialSynthesis,
  getNeighborhoodContext,
  getPropertyCommitmentGuide,
} from "@/lib/editorial-guides";
import {
  INTENT_LABELS,
  LAND_TITLE_LABELS,
  TYPE_LABELS,
  daysBetween,
  formatFCFA,
  formatPropertyPrice,
  formatSurface,
  recencyLabel,
} from "@/lib/format";
import { LATEST_PUBLISHED_AT } from "@/lib/properties";
import {
  PropertyAvailability, PropertyGallery, ReportListing, VerifiedOwnerCard,
  type AvailabilityWindow, type VerifiedOwner,
} from "@/components/catalog/PropertySidePanels";
import { CopyReference } from "@/components/ui/CopyReference";
import { AskQuestionLink } from "@/components/catalog/AskQuestionLink";
import { FavoriteButton } from "@/components/catalog/FavoriteButton";
import { Reveal } from "@/components/ui/Reveal";
import { PropertyCard } from "@/components/catalog/PropertyCard";
import { PropertyDetailTabs } from "@/components/catalog/PropertyDetailTabs";
/* ================================================================== HOMERA — FICHE D’UN BIEN ------------------------------------------------------------------ Ce qu’un visiteur doit pouvoir lire sans compte : ce qu’est le bien, ce qu’il coûte, où il se trouve, et — surtout — ce qui a été contrôlé, par qui et quand. Aucune promesse juridique : la fiche décrit un dossier, elle ne le garantit pas. La fiche ne porte aucune navigation : galerie, titre, garanties, onglets de contenu et colonne de réservation. ================================================================== */ const PROJECT_HREF: Record<
  Property["intent"],
  string
> = { acheter: "/acheter", louer: "/louer", sejour: "/sejour" };
const PERIOD_EYEBROW: Record<string, string> = {
  "/ jour": "Tarif journalier",
  "/ mois": "Loyer mensuel",
  "/ nuitée": "Prix par nuit",
};
const FEATURE_ICONS: Record<PropertyFeature, LucideIcon> = {
  meuble: Sofa,
  climatisation: Snowflake,
  "cuisine-equipee": UtensilsCrossed,
  piscine: Waves,
  jardin: Leaf,
  terrasse: Sun,
  parking: Car,
  gardien: ShieldCheck,
  groupe: Zap,
  "eau-courante": Droplets,
  "titre-foncier": FileText,
  acd: FileCheck,
  cloture: Fence,
  "acces-routier": Route,
  vitrine: Store,
  bureaux: Briefcase,
};
export function PropertyDetail({
  property,
  similar = [],
  availability = { status: property.availabilityStatus ?? "disponible", windows: [], note: "" },
  owner = null,
  mandate = null,
}: {
  property: Property;
  /** Biens comparables calculés par le serveur (même intention, gamme de prix voisine). */
  similar?: Property[];
  /** Périodes réellement déclarées par le propriétaire. */
  availability?: { status: string; windows: AvailabilityWindow[]; note?: string };
  /** Profil public du propriétaire : ce qu’un visiteur a le droit de savoir. */
  owner?: VerifiedOwner | null;
  /** Mandat d’agent réellement opposable sur ce bien, ou `null`. */
  mandate?: { agentId: string; agentName: string; matricule: string | null; mandateType: string; expiresAt: string } | null;
}) {
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
    { label: "Quartier", value: property.district, icon: MapPin },
    ...(property.availabilityStatus === "indisponible" ? [{ label: "Disponibilité", value: "Indisponible", icon: CalendarCheck }] : []),
  ];
  const fresh = daysBetween(property.publishedAt, LATEST_PUBLISHED_AT);
  const verified = property.verificationStatus !== "en-verification";
  const unavailable = property.availabilityStatus === "indisponible";
  /* Parcours imposé par le bien : une seule voie, jamais les deux boutons à la fois. */
  const directBooking = !unavailable && property.rentalMode === "direct";
  const features = property.features ?? [];
  const priceEyebrow = property.pricePeriod ? (PERIOD_EYEBROW[property.pricePeriod] ?? "Tarif") : "Prix de vente";
  /* Chaque ligne reprend les montants du cadre économique : rien n’est dû
     en dehors de ce qui est écrit ici et dans l’onglet « Conditions ». */
  const feeLine =
    property.intent === "louer"
      ? `Caution ${formatFCFA(property.price)} · aucun frais caché`
      : property.intent === "sejour"
        ? "Frais de service inclus · aucun frais caché"
        : "Commission selon mandat vérifié · frais notariés séparés";
  const editorialParagraphs = buildPropertyEditorialSynthesis(property);
  const neighborhood = getNeighborhoodContext(property.city, property.district);
  const commitmentGuide = getPropertyCommitmentGuide(property);
  const statusPill = verified ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-caption font-semibold text-success">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> HOMERA vérifié
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-homera-amber/50 bg-homera-amber/10 px-3 py-1.5 text-caption font-semibold text-homera-night">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> En cours de vérification
    </span>
  );
  return (
    <article className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ---------------- Galerie ---------------- */}
        <Reveal y={0} blur={0} clip clipRadius={24} duration={900} immediate>
          <PropertyGallery
            gallery={property.gallery ?? []}
            title={property.title}
            fallbackKey={property.media}
            fallbackAlt={property.alt}
            typeLabel={TYPE_LABELS[property.type]}
          />
        </Reveal>
        {/* ---------------- Titre du bien ---------------- */}
        <div className="mt-8">
          <p className="flex items-center gap-2 text-label uppercase text-homera-terracotta">
            <MapPin className="h-4 w-4" aria-hidden="true" /> {TYPE_LABELS[property.type]}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-display-md sm:text-display-lg">{property.title}</h1>
          <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-body-sm text-muted">
            <li className="flex items-center gap-1.5 font-medium text-foreground">
              <MapPin className="h-4 w-4 text-homera-terracotta" aria-hidden="true" /> {property.district},{" "}
              {property.city}
            </li>
            <li>{statusPill}</li>
            {unavailable && (
              <li>
                <span className="inline-flex items-center rounded-full border border-error/25 bg-error/[0.08] px-3 py-1.5 text-caption font-semibold text-error">
                  Indisponible
                </span>
              </li>
            )}
            {fresh <= 7 && !unavailable && (
              <li>
                <span className="inline-flex items-center rounded-full bg-homera-amber px-3 py-1.5 text-caption font-semibold text-homera-night">
                  Nouveau
                </span>
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <Maximize className="h-4 w-4" aria-hidden="true" /> {formatSurface(property.surface)}
            </li>
            {property.rooms ? (
              <li className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" aria-hidden="true" /> {property.rooms} pièce
                {property.rooms > 1 ? "s" : ""}
              </li>
            ) : null}
            {property.bedrooms > 0 && (
              <li className="flex items-center gap-1.5">
                <Bed className="h-4 w-4" aria-hidden="true" /> {property.bedrooms} chambre
                {property.bedrooms > 1 ? "s" : ""}
              </li>
            )}
            {property.bathrooms > 0 && (
              <li className="flex items-center gap-1.5">
                <Bath className="h-4 w-4" aria-hidden="true" /> {property.bathrooms} salle
                {property.bathrooms > 1 ? "s" : ""} d’eau
              </li>
            )}
            {features.slice(0, 3).map((feature) => {
              const Icon = FEATURE_ICONS[feature];
              return (
                <li key={feature} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4" aria-hidden="true" /> {FEATURE_LABELS[feature]}
                </li>
              );
            })}
          </ul>
        </div>
        {/* ---------------- Garanties ---------------- */}
        {verified ? (
          <dl className="mt-6 grid grid-cols-1 gap-4 rounded-card border border-border bg-card p-5 sm:grid-cols-3 sm:p-6">
            <div className="flex items-start gap-3 sm:border-l sm:border-border sm:pl-5 sm:first:border-l-0 sm:first:pl-0">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-homera-terracotta" aria-hidden="true" />
              <div>
                <dt className="text-body-sm font-semibold text-foreground">Dossier contrôlé</dt>
                <dd className="mt-0.5 text-caption leading-relaxed text-muted">Documents et informations vérifiés</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:border-l sm:border-border sm:pl-5 sm:first:border-l-0 sm:first:pl-0">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-homera-terracotta" aria-hidden="true" />
              <div>
                <dt className="text-body-sm font-semibold text-foreground">
                  {mandate ? "Mandat vérifié" : "Propriétaire identifié"}
                </dt>
                <dd className="mt-0.5 text-caption leading-relaxed text-muted">
                  {mandate ? mandate.agentName : "Titulaire identifié au dossier"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:border-l sm:border-border sm:pl-5 sm:first:border-l-0 sm:first:pl-0">
              <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-homera-terracotta" aria-hidden="true" />
              <div>
                <dt className="text-body-sm font-semibold text-foreground">Contrôle daté</dt>
                <dd className="homera-num mt-0.5 text-caption leading-relaxed text-muted">
                  Dernière vérification : {property.verifiedOn}
                </dd>
              </div>
            </div>
          </dl>
        ) : (
          <p className="mt-6 flex items-start gap-3 rounded-card border border-homera-amber/50 bg-homera-amber/10 p-5 text-body-sm text-homera-night">
            <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            Vérification en cours : ce dossier n’a pas encore été contrôlé. Les garanties ci-dessous s’appliqueront
            une fois le contrôle terminé.
          </p>
        )}
        {/* ---------------- Contenu & réservation ---------------- */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_22rem]">
          <div>
            <PropertyDetailTabs
              tabs={[
                {
                  id: "fiche-apercu",
                  label: "Aperçu",
                  content: (
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.45fr_1fr]">
                      <div>
                        <h2 className="font-serif text-display-xs">À propos de ce bien</h2>
                        <div className="mt-4 space-y-4 text-body-sm leading-relaxed text-muted sm:text-body">
                          {editorialParagraphs.map((paragraph, index) => (
                            <p key={index} className={index === 0 ? "text-foreground" : "text-muted"}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                        {features.length > 0 && (
                          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {features.slice(0, 4).map((feature) => {
                              const Icon = FEATURE_ICONS[feature];
                              return (
                                <li
                                  key={feature}
                                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
                                >
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-homera-terracotta/10 text-homera-terracotta">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                  <span className="text-note font-medium text-foreground">
                                    {FEATURE_LABELS[feature]}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {features.length > 4 && (
                          <a
                            href="#fiche-equipements"
                            className="homera-underline mt-5 inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink"
                          >
                            Voir les {features.length} équipements{" "}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                      <div className="space-y-6">
                        <section
                          aria-labelledby="detail-facts"
                          className="rounded-card border border-border bg-card p-6"
                        >
                          <h2 id="detail-facts" className="font-serif text-display-xs">
                            Caractéristiques principales
                          </h2>
                          <dl className="mt-3 divide-y divide-border">
                            {facts.map((fact) => (
                              <div key={fact.label} className="flex items-center gap-3 py-2.5">
                                <fact.icon
                                  className="h-4 w-4 shrink-0 text-homera-terracotta"
                                  aria-hidden="true"
                                />
                                <dt className="text-note text-muted">{fact.label}</dt>
                                <dd className="homera-num ml-auto text-right text-note font-medium text-foreground">
                                  {fact.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                        <section
                          aria-labelledby="detail-confiance"
                          className="rounded-card border border-border bg-card p-6"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div>
                              <h2 id="detail-confiance" className="text-body-sm font-semibold text-foreground">
                                La confiance HOMERA
                              </h2>
                              <p className="mt-1 text-caption leading-relaxed text-muted">
                                {verified
                                  ? "Chaque bien est vérifié par nos équipes avant publication."
                                  : "Dossier déposé : les contrôles de nos équipes sont en cours."}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                            {statusPill}
                            {verified && (
                              <p className="text-caption text-muted">
                                Vérification effectuée le{" "}
                                <span className="homera-num font-medium text-foreground">
                                  {property.verifiedOn}
                                </span>
                              </p>
                            )}
                          </div>
                          <Link
                            href={`/historique/${property.homeraId}`}
                            className="homera-underline mt-3 inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold homera-accent-ink"
                          >
                            Consulter l’historique du bien <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </section>
                      </div>
                    </div>
                  ),
                },
                {
                  id: "fiche-equipements",
                  label: "Équipements",
                  content: (
                    <div>
                      <h2 className="font-serif text-display-xs">Équipements déclarés</h2>
                      {features.length > 0 ? (
                        <>
                          <p className="mt-2 text-body-sm text-muted">
                            {features.length} équipement{features.length > 1 ? "s" : ""} déclaré
                            {features.length > 1 ? "s" : ""} par le propriétaire au dossier.
                          </p>
                          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {features.map((feature) => {
                              const Icon = FEATURE_ICONS[feature];
                              return (
                                <li
                                  key={feature}
                                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
                                >
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-homera-terracotta/10 text-homera-terracotta">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                  <span className="text-note font-medium text-foreground">
                                    {FEATURE_LABELS[feature]}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      ) : (
                        <p className="mt-2 text-body-sm text-muted">Aucun équipement déclaré au dossier.</p>
                      )}
                    </div>
                  ),
                },
                {
                  id: "fiche-localisation",
                  label: "Localisation",
                  content: (
                    <section
                      aria-labelledby="detail-neighborhood"
                      className="rounded-card border border-border bg-card/60 p-6 sm:p-8"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-label uppercase homera-accent-ink">Cadre de vie & localisation</p>
                          <h2 id="detail-neighborhood" className="mt-2 font-serif text-display-xs">
                            {neighborhood.title}
                          </h2>
                          <p className="mt-1 text-caption font-medium text-foreground">{neighborhood.vibe}</p>
                        </div>
                        <Link
                          href={`/explorer?villes=${encodeURIComponent(property.city)}&quartiers=${encodeURIComponent(property.district)}`}
                          className="homera-press inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-caption font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
                        >
                          Autres biens à {property.district} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                      <p className="mt-4 max-w-2xl text-body-sm leading-relaxed text-muted">{neighborhood.summary}</p>
                      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-3">
                        {neighborhood.highlights.map((item) => (
                          <div key={item.label} className="rounded-xl border border-border bg-background/70 p-4">
                            <dt className="text-micro font-semibold uppercase tracking-[0.14em] text-homera-terracotta">
                              {item.label}
                            </dt>
                            <dd className="mt-2 text-caption leading-relaxed text-muted">{item.detail}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ),
                },
                {
                  id: "fiche-verifications",
                  label: "Vérifications",
                  content: (
                    <div>
                      <section
                        aria-labelledby="detail-verification"
                        className="rounded-card border border-border bg-card p-6 sm:p-8"
                      >
                        {verified ? (
                          <>
                            <h2 id="detail-verification" className="font-serif text-display-xs">
                              Ce qui a été contrôlé
                            </h2>
                            <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-muted">
                              Chaque bien publié sous identifiant HOMERA passe par le même protocole. Voici ce que la
                              fiche atteste — et ce qu’elle n’atteste pas.
                            </p>
                            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                  <item.icon
                                    className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta"
                                    aria-hidden="true"
                                  />
                                  <div>
                                    <p className="text-body-sm font-medium text-foreground">{item.title}</p>
                                    <p className="mt-1 text-caption leading-relaxed text-muted">{item.detail}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-6 border-t border-border pt-4 text-caption leading-relaxed text-muted">
                              Le statut « Vérifié HOMERA » atteste d’un contrôle documentaire à la date indiquée. Il ne
                              constitue ni un titre de propriété, ni une garantie juridique : la vérification finale
                              relève du notaire et des autorités compétentes.
                            </p>
                          </>
                        ) : (
                          <>
                            <h2 id="detail-verification" className="font-serif text-display-xs">
                              Vérification en cours
                            </h2>
                            <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-muted">
                              Ce dossier est publié avant la fin des contrôles : aucune garantie ne s’applique tant que
                              le statut « HOMERA vérifié » n’est pas affiché. Voici ce que nos équipes contrôlent avant
                              publication définitive.
                            </p>
                            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                              {[
                                {
                                  icon: FileText,
                                  title: "Pièces de propriété à examiner",
                                  detail: "Titre, ACD ou convention, selon le cas déclaré.",
                                },
                                {
                                  icon: Users,
                                  title: "Propriétaire à identifier",
                                  detail: "Le titulaire du droit sera identifié dans le dossier.",
                                },
                                {
                                  icon: ShieldCheck,
                                  title: "Mandat à vérifier",
                                  detail: "L’autorisation de commercialiser et son étendue seront contrôlées.",
                                },
                                {
                                  icon: CalendarCheck,
                                  title: "Contrôle à dater",
                                  detail: "La date du contrôle sera inscrite au dossier.",
                                },
                              ].map((item) => (
                                <li key={item.title} className="flex items-start gap-3">
                                  <item.icon
                                    className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta"
                                    aria-hidden="true"
                                  />
                                  <div>
                                    <p className="text-body-sm font-medium text-foreground">{item.title}</p>
                                    <p className="mt-1 text-caption leading-relaxed text-muted">{item.detail}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-4">
                          <Link
                            href={`/historique/${property.homeraId}`}
                            className="homera-underline inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold homera-accent-ink"
                          >
                            Consulter l’historique du bien <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                          {mandate ? (
                            <Link
                              href={`/verification-agent?agent=${mandate.agentId}&bien=${property.homeraId}`}
                              className="homera-underline inline-flex min-h-9 items-center gap-1.5 text-caption font-semibold homera-accent-ink"
                            >
                              Vérifier l’agent autorisé <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                          ) : null}
                        </div>
                      </section>
                      <VerifiedOwnerCard owner={owner} verifiedOn={verified ? property.verifiedOn : null} />
                    </div>
                  ),
                },
                {
                  id: "fiche-conditions",
                  label: "Conditions",
                  content: (
                    <div>
                      <section
                        aria-labelledby="detail-commitment"
                        className="rounded-card border border-border bg-card p-6 sm:p-8"
                      >
                        <p className="text-label uppercase homera-accent-ink">Aide à la décision</p>
                        <h2 id="detail-commitment" className="mt-2 font-serif text-display-xs">
                          {commitmentGuide.title}
                        </h2>
                        <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-muted">
                          {commitmentGuide.subtitle}
                        </p>
                        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                          {commitmentGuide.metrics.map((metric) => (
                            <div key={metric.label} className="rounded-xl border border-border bg-background/70 p-4">
                              <dt className="text-micro font-semibold uppercase tracking-[0.14em] text-muted">
                                {metric.label}
                              </dt>
                              <dd className="homera-num mt-2 font-serif text-display-xs text-foreground">
                                {metric.value}
                              </dd>
                              <p className="mt-1.5 text-caption leading-relaxed text-muted">{metric.note}</p>
                            </div>
                          ))}
                        </dl>
                        <div className="mt-7 border-t border-border pt-6">
                          <h3 className="text-note font-semibold text-foreground">{commitmentGuide.stepsTitle}</h3>
                          <ol className="mt-4 space-y-4">
                            {commitmentGuide.steps.map((step) => (
                              <li key={step.title} className="rounded-xl border border-border bg-background/45 p-4">
                                <p className="text-body-sm font-medium text-foreground">{step.title}</p>
                                <p className="mt-1.5 text-caption leading-relaxed text-muted">{step.detail}</p>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </section>
                      <section
                        aria-labelledby="detail-economics"
                        className="mt-8 rounded-card border border-border bg-card p-6 sm:p-8"
                      >
                        <h2 id="detail-economics" className="font-serif text-display-xs">
                          Cadre économique HOMERA
                        </h2>
                        {property.intent === "louer" && (
                          <>
                            <dl className="mt-4 space-y-2.5 text-note">
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted">{priceEyebrow}</dt>
                                <dd className="homera-num font-semibold text-foreground">
                                  {formatFCFA(property.price)}
                                </dd>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted">Caution / garantie</dt>
                                <dd className="homera-num font-semibold text-foreground">
                                  {formatFCFA(property.price)}
                                </dd>
                              </div>
                              <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
                                <dt className="text-muted">Frais cachés client</dt>
                                <dd className="homera-num font-semibold text-success">0 FCFA</dd>
                              </div>
                            </dl>
                            <p className="mt-3 text-caption leading-relaxed text-muted">
                              Aucun paiement de loyer ou de caution n’est demandé avant la visite terminée,
                              l’acceptation du dossier et la signature du contrat de location.
                            </p>
                          </>
                        )}
                        {property.intent === "sejour" && (
                          <>
                            <dl className="mt-4 space-y-2.5 text-note">
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted">Prix par nuit</dt>
                                <dd className="homera-num font-semibold text-foreground">
                                  {formatFCFA(property.price)}
                                </dd>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted">Durée minimale</dt>
                                <dd className="homera-num font-semibold text-foreground">
                                  {property.minNights ?? 2} nuits
                                </dd>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted">Frais de service HOMERA</dt>
                                <dd className="text-caption font-semibold text-success">Inclus dans le tarif</dd>
                              </div>
                              <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
                                <dt className="font-semibold text-foreground">
                                  Total séjour ({property.minNights ?? 2} nuits)
                                </dt>
                                <dd className="homera-num font-serif text-body-sm text-homera-terracotta">
                                  {formatFCFA(property.price * (property.minNights ?? 2))}
                                </dd>
                              </div>
                            </dl>
                            <p className="mt-3 text-caption leading-relaxed text-muted">
                              Le paiement intervient uniquement au moment de la confirmation de la réservation.
                            </p>
                          </>
                        )}
                        {property.intent === "acheter" && (
                          <>
                            <dl className="mt-4 space-y-2.5 text-note">
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted">Prix affiché du bien</dt>
                                <dd className="homera-num font-semibold text-foreground">
                                  {formatFCFA(property.price)}
                                </dd>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-muted">Commission HOMERA</dt>
                                <dd className="text-caption font-semibold text-foreground">Selon mandat vérifié</dd>
                              </div>
                              <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
                                <dt className="text-muted">Frais notariés &amp; ANDF</dt>
                                <dd className="text-caption font-semibold text-foreground">Séparés (étude notariale)</dd>
                              </div>
                            </dl>
                            <p className="mt-3 text-caption leading-relaxed text-muted">
                              HOMERA ne mélange jamais le prix du bien, la commission d’accompagnement et les frais
                              notariés dans un montant unique.
                            </p>
                          </>
                        )}
                      </section>
                      <PropertyAvailability
                        status={availability.status}
                        windows={availability.windows}
                        note={availability.note}
                      />
                    </div>
                  ),
                },
              ]}
            />
            <div className="mt-10">
              <ReportListing propertyId={property.id} reference={property.homeraId} />
            </div>
          </div>
          {/* ---------------- Colonne de réservation ---------------- */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card border border-border bg-card p-6">
              <p className="text-label uppercase text-muted">{priceEyebrow}</p>
              <p className="homera-num mt-2 font-serif text-display-sm">{formatPropertyPrice(property)}</p>
              <p className="mt-1 text-caption text-muted">Prix affiché par le propriétaire</p>
              <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-caption leading-relaxed text-muted">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" /> {feeLine}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="rounded-full border border-border px-3 py-1.5 text-caption font-medium text-muted">
                  {TYPE_LABELS[property.type]}
                </span>
                {statusPill}
              </div>
              <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-note">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Référence</dt>
                  <dd id="detail-reference" className="homera-num font-mono text-foreground">
                    {property.homeraId}
                  </dd>
                </div>
                {verified ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">Vérifié le</dt>
                    <dd className="homera-num text-foreground">{property.verifiedOn}</dd>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">Contrôle</dt>
                    <dd className="text-foreground">En cours</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Mis en ligne</dt>
                  <dd className="text-foreground">{recencyLabel(property.publishedAt, LATEST_PUBLISHED_AT)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Projet</dt>
                  <dd className="text-foreground">{INTENT_LABELS[property.intent]}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <CopyReference value={property.homeraId} targetId="detail-reference" />
              </div>
              <div className="mt-5 border-t border-border pt-5">
                {unavailable ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-btn bg-surface-hover px-5 text-body-sm font-semibold text-muted opacity-80"
                      aria-label="Bien indisponible, demande de visite désactivée"
                    >
                      Bien indisponible
                    </button>
                    <Link
                      href={PROJECT_HREF[property.intent]}
                      className="homera-press mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
                    >
                      Voir les biens disponibles <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </>
                ) : directBooking ? (
                  <Link
                    href={`/client/demandes/nouvelle?bien=${property.id}`}
                    className="homera-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white"
                  >
                    Réserver <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <Link
                    href={`/client/visites/nouvelle?bien=${property.id}`}
                    className="homera-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white"
                  >
                    Demander une visite <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
                {availability.note && (
                  <p className="mt-3 text-caption leading-relaxed text-muted">{availability.note}</p>
                )}
                <div className="mt-3 flex items-stretch gap-3">
                  <AskQuestionLink
                    propertyId={property.id}
                    reference={property.homeraId}
                    className="homera-press inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-btn border border-border px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
                  >
                    Poser une question
                  </AskQuestionLink>
                  <FavoriteButton propertyId={property.id} title={property.title} size="detail" tone="onSurface" />
                </div>
              </div>
            </div>
            {DEMO_DATA && (
              <p className="text-caption leading-relaxed text-muted">
                Fiche de démonstration du système pilote HOMERA : le bien et le visuel sont illustratifs et ne
                constituent pas une offre commerciale.
              </p>
            )}
            <section
              aria-labelledby="detail-location-card"
              className="rounded-card border border-border bg-card p-6"
            >
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-homera-terracotta" aria-hidden="true" />
                <div>
                  <h2 id="detail-location-card" className="text-body-sm font-semibold text-foreground">
                    {property.district}, {property.city}
                  </h2>
                  <p className="mt-0.5 text-caption leading-relaxed text-muted">{neighborhood.vibe}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-3 border-t border-border pt-4">
                {neighborhood.highlights.slice(0, 2).map((item) => (
                  <div key={item.label}>
                    <dt className="text-micro font-semibold uppercase tracking-[0.14em] text-homera-terracotta">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-caption leading-relaxed text-muted">{item.detail}</dd>
                  </div>
                ))}
              </dl>
              <a
                href="#fiche-localisation"
                className="homera-underline mt-4 inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink"
              >
                Voir la localisation <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </section>
          </aside>
        </div>
        {/* ---------------- Biens comparables ---------------- */}
        {similar.length > 0 && (
          <section aria-labelledby="detail-similar" className="mt-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="detail-similar" className="font-serif text-display-sm">
                {TYPE_LABELS[property.type]}s disponibles {INTENT_LABELS[property.intent].toLowerCase()}
              </h2>
              <Link
                href={PROJECT_HREF[property.intent]}
                className="homera-underline inline-flex min-h-10 items-center gap-2 text-note font-medium homera-accent-ink"
              >
                Voir la page {INTENT_LABELS[property.intent]}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {similar.map((entry) => (
                <li key={entry.id} className="h-full">
                  <PropertyCard property={entry} layout="grid" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div
        role="region"
        aria-label="Action rapide sur ce bien"
        className="sticky bottom-0 z-30 border-t border-border bg-card/95 px-5 py-3 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-micro text-muted">{property.homeraId}</p>
            <p className="homera-num truncate font-serif text-display-xs text-foreground">
              {formatPropertyPrice(property)}
            </p>
          </div>
          <Link
            href={directBooking ? `/client/demandes/nouvelle?bien=${property.id}` : `/client/visites/nouvelle?bien=${property.id}`}
            className="homera-cta inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn px-4 py-2.5 text-caption font-semibold"
          >
            {directBooking ? "Réserver" : "Planifier une visite"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

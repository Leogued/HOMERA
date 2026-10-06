import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Home,
  Paintbrush,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { SERVICES } from "@/lib/content";
import { SERVICE_DETAILED_GUIDES } from "@/lib/editorial-guides";
import { PageHero } from "@/components/catalog/PageHero";
import { Visual } from "@/components/ui/Visual";

const SERVICE_SLUGS: Record<string, string> = {
  gestion: "gestion-immobiliere",
  maintenance: "maintenance",
  demenagement: "demenagement",
  travaux: "travaux",
};
const ICONS = { gestion: Home, maintenance: Wrench, demenagement: Truck, travaux: Paintbrush };

export function serviceHref(id: string): string {
  return `/services/${SERVICE_SLUGS[id] ?? id}`;
}
export function serviceBySlug(slug: string) {
  return SERVICES.find((entry) => SERVICE_SLUGS[entry.id] === slug);
}

export function ServiceDetail({ slug }: { slug: string }) {
  const service = serviceBySlug(slug);
  if (!service) return null;
  const Icon = ICONS[service.id as keyof typeof ICONS] ?? Home;
  const detailedGuide = SERVICE_DETAILED_GUIDES[service.id];
  return (
    <>
      <PageHero
        crumbs={[
          { label: "Accueil", href: "/" },
          { label: "Services", href: "/services" },
          { label: service.title },
        ]}
        eyebrow={`Services HOMERA · ${service.index}`}
        title={service.title}
        intro={service.description}
        facts={[
          { label: "Accompagnement", value: "De bout en bout" },
          { label: "Zones couvertes", value: "Cotonou · Calavi · Porto-Novo · Ouidah" },
          { label: "Suivi", value: "Devis & compte rendu écrit" },
        ]}
        actions={
          <Link
            href={`/contact?sujet=${service.id}`}
            className="homera-press inline-flex min-h-11 items-center gap-2 rounded-btn homera-cta px-4 text-note font-semibold text-white"
          >
            Parler à un conseiller
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      {/* ---------------- Présentation & Engagements ---------------- */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:px-8">
        <div className="relative min-h-[280px] overflow-hidden rounded-card sm:min-h-[420px]">
          <Visual
            mediaKey={service.media}
            alt={service.alt}
            sizes="(min-width: 1024px) 48vw, 94vw"
            priority
            veil="soft"
            quality={72}
            className="absolute inset-0 h-full w-full"
          >
            <div className="absolute inset-x-5 bottom-5 z-[2] text-white sm:inset-x-7 sm:bottom-7">
              <p className="text-caption font-semibold uppercase tracking-[0.17em] text-homera-amber">
                {service.short}
              </p>
              <p className="mt-2 max-w-lg font-serif text-display-sm">
                Un interlocuteur identifié, un périmètre écrit et une intervention documentée.
              </p>
            </div>
          </Visual>
        </div>

        <div className="flex flex-col justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-homera-terracotta/[0.09] text-homera-terracotta">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-caption font-semibold uppercase tracking-[0.18em] text-homera-terracotta">
            Notre accompagnement
          </p>
          <h2 className="mt-2 font-serif text-display-sm">
            Des étapes claires, du premier échange au compte rendu.
          </h2>
          <ul className="mt-6 space-y-4">
            {service.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span className="text-body-sm leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-note leading-relaxed text-muted">
            Chaque demande fait l’objet d’un cadrage préalable : le besoin, le lieu d’intervention, le calendrier et le devis détaillé sont validés par écrit avant tout déplacement ou démarrage de prestation.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={`/contact?sujet=${service.id}`}
              className="homera-press inline-flex min-h-12 w-fit items-center gap-2 rounded-btn homera-cta px-5 text-note font-semibold text-white"
            >
              Décrire mon besoin
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/services#comment"
              className="homera-press inline-flex min-h-12 w-fit items-center gap-2 rounded-btn border border-border bg-card px-4 text-note font-medium text-foreground transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
            >
              Voir le fonctionnement général
            </Link>
          </div>
          <p className="mt-3 text-caption text-muted">
            Aucune réservation ou facturation automatique n’est activée dans le système pilote : votre demande prépare un échange direct avec l’équipe.
          </p>
        </div>
      </section>

      {/* ---------------- Périmètre détaillé, Publics & Livrables ---------------- */}
      {detailedGuide && (
        <>
          <section
            aria-labelledby="service-perimetre"
            className="border-y border-border bg-card/45"
          >
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="max-w-3xl">
                <p className="text-label uppercase homera-accent-ink">Méthode & exécution</p>
                <h2 id="service-perimetre" className="mt-2 font-serif text-display-sm">
                  {detailedGuide.scopeTitle}
                </h2>
                <p className="mt-3 text-body-sm leading-relaxed text-muted">{detailedGuide.scopeIntro}</p>
              </div>
              <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {detailedGuide.scopes.map((scope) => (
                  <li
                    key={scope.step}
                    className="rounded-card border border-border bg-background p-6 shadow-[var(--shadow-card)]"
                  >
                    <span className="homera-num font-serif text-display-xs homera-accent-ink">
                      {scope.step}
                    </span>
                    <h3 className="mt-3 text-body font-medium text-foreground">{scope.title}</h3>
                    <p className="mt-2 text-note leading-relaxed text-muted">{scope.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section
            aria-labelledby="service-publics"
            className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
          >
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="inline-flex items-center gap-2 text-label uppercase homera-accent-ink">
                  <Users className="h-4 w-4" aria-hidden="true" /> Profils accompagnés
                </p>
                <h2 id="service-publics" className="mt-2 font-serif text-display-sm">
                  {detailedGuide.audiencesTitle}
                </h2>
                <div className="mt-6 space-y-4">
                  {detailedGuide.audiences.map((audience) => (
                    <article
                      key={audience.profile}
                      className="rounded-card border border-border bg-card p-5"
                    >
                      <h3 className="text-body-sm font-semibold text-foreground">{audience.profile}</h3>
                      <p className="mt-2 text-note leading-relaxed text-muted">{audience.need}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-card border border-homera-terracotta/25 bg-homera-terracotta/[0.05] p-6 sm:p-8">
                <p className="inline-flex items-center gap-2 text-label uppercase homera-accent-ink">
                  <FileCheck2 className="h-4 w-4" aria-hidden="true" /> Preuves & traçabilité
                </p>
                <h2 className="mt-2 font-serif text-display-xs">
                  {detailedGuide.deliverablesTitle}
                </h2>
                <p className="mt-2 text-note leading-relaxed text-muted">
                  Pour vous permettre de décider et de contrôler chaque étape — que vous soyez sur place à Cotonou ou à distance :
                </p>
                <ul className="mt-6 space-y-3 border-t border-border pt-5">
                  {detailedGuide.deliverables.map((deliverable) => (
                    <li key={deliverable} className="flex items-start gap-3 text-note leading-relaxed text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" />
                      <span>{deliverable}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/contact?sujet=${service.id}`}
                  className="homera-press mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-btn homera-cta px-4 text-note font-semibold text-white"
                >
                  Demander un devis personnalisé <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* ---------------- Questions fréquentes ---------------- */}
            <div className="mt-16 border-t border-border pt-12">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <p className="text-label uppercase text-muted">Questions fréquentes</p>
                  <h2 className="mt-2 font-serif text-display-xs">
                    Tout savoir sur {service.title.toLowerCase()}
                  </h2>
                  <p className="mt-2 text-note leading-relaxed text-muted">
                    Une situation particulière ou un bien déjà identifié ? Indiquez sa référence lors de votre prise de contact.
                  </p>
                </div>
                <div className="space-y-3">
                  {detailedGuide.faqs.map((faq) => (
                    <details
                      key={faq.question}
                      className="group rounded-card border border-border bg-card px-5 py-4 transition-colors open:border-homera-terracotta/35"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body-sm font-medium text-foreground">
                        <span>{faq.question}</span>
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-homera-terracotta transition-transform duration-200 group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <p className="mt-3 border-t border-border pt-3 text-note leading-relaxed text-muted">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ---------------- Navigation vers les autres services ---------------- */}
      <nav aria-label="Autres services HOMERA" className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-muted">
            À découvrir également dans l’écosystème HOMERA
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {SERVICES.filter((entry) => entry.id !== service.id).map((entry) => (
              <li key={entry.id}>
                <Link
                  href={serviceHref(entry.id)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-note font-medium hover:border-homera-terracotta hover:text-homera-terracotta"
                >
                  {entry.title}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}

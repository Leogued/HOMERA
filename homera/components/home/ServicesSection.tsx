"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Home, Paintbrush, Truck, Wrench, type LucideIcon } from "lucide-react";
import { SERVICES, type Service } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { Button } from "@/components/ui/Button";
import { TextRoll } from "@/components/ui/TextRoll";
import { useRovingFocus } from "@/lib/motion";
/* ================================================================== HOMERA — SERVICES ------------------------------------------------------------------ Un écosystème, pas une grille. Les quatre métiers se parcourent comme un sommaire : le survol, le focus clavier ou le toucher change la scène de droite — visuel, description, points concrets et bouton. L’utilisateur sent qu’il existe une vie après la remise des clés. Sur mobile, aucune compression : la scène passe au-dessus du sommaire, qui devient tactile. ================================================================== */ const ICONS: Record<
  Service["icon"],
  LucideIcon
> = { home: Home, wrench: Wrench, truck: Truck, paint: Paintbrush };
const SERVICE_EVENT = "homera:focus-service";
export function ServicesSection() {
  const router = useRouter();
  const [activeId, setActiveId] = useState(SERVICES[0].id);
  const [visited, setVisited] = useState(() => new Set([SERVICES[0].id]));
  const selectService = useCallback((id: string) => {
    setActiveId(id);
    setVisited((previous) => (previous.has(id) ? previous : new Set([...previous, id])));
  }, []);
  const requestService = (serviceId?: string) => {
    const slug = serviceId === "gestion" ? "gestion-immobiliere" : serviceId;
    router.push(slug ? `/services/${slug}` : "/services");
  };
  const active = SERVICES.find((service) => service.id === activeId) ?? SERVICES[0];
  const ActiveIcon = ICONS[active.icon];
  const { containerRef, handleKeyDown, focusItem } = useRovingFocus<HTMLDivElement>();
  /* --- Le menu peut demander un service précis (ancre #services-xxx) --- */ useEffect(() => {
    const focusService = (id: string) => {
      if (!SERVICES.some((service) => service.id === id)) return;
      selectService(id);
      requestAnimationFrame(() => {
        const index = SERVICES.findIndex((service) => service.id === id);
        focusItem(index);
      });
    };
    const onCustom = (event: Event) => focusService((event as CustomEvent<string>).detail);
    const readHash = () => {
      const match = /^#services-([a-z]+)$/i.exec(window.location.hash);
      if (match) focusService(match[1].toLowerCase());
    }; // Lecture de l’ancre après le premier rendu (jamais pendant le rendu serveur).
    const initial = requestAnimationFrame(readHash);
    window.addEventListener(SERVICE_EVENT, onCustom);
    window.addEventListener("hashchange", readHash);
    return () => {
      cancelAnimationFrame(initial);
      window.removeEventListener(SERVICE_EVENT, onCustom);
      window.removeEventListener("hashchange", readHash);
    };
  }, [focusItem, selectService]);
  return (
    <section
      id="services"
      className="homera-scene scene-bg-tint-in relative py-[var(--space-section)] sm:py-[var(--space-section-lg)]"
      aria-labelledby="services-titre"
    >
      {" "}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {" "}
        <SceneHeader
          index="07"
          eyebrow="Écosystème complémentaire"
          title={<span id="services-titre">Services sur-mesure pour votre habitat</span>}
          intro="Trouver un bien n’est que la première étape. HOMERA accompagne ensuite la gestion, l’entretien, le déménagement et la valorisation de votre patrimoine."
        />{" "}
        <div className="mt-14 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-14">
          {" "}
          {/* ---------------- Scène : le service actif ---------------- */}{" "}
          <div
            id="services-panel"
            role="tabpanel"
            aria-labelledby={`services-${active.id}`}
            className="relative order-2 lg:order-1"
          >
            {" "}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_40px_100px_-70px_rgba(28,17,11,0.9)]">
              {" "}
              {/* Visuels à la demande, puis conservés pour les prochains passages. */}{" "}
              <div className="relative h-[16rem] w-full sm:h-[19rem]">
                {" "}
                {SERVICES.map((service) => (
                  <div
                    key={service.id}
                    aria-hidden={service.id !== active.id}
                    className="absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-standard"
                    style={{
                      opacity: service.id === active.id ? 1 : 0,
                      transform: service.id === active.id ? "scale(1)" : "scale(1.04)",
                    }}
                  >
                    {" "}
                    {visited.has(service.id) && (
                      <Visual
                        mediaKey={service.media}
                        alt={service.alt}
                        sizes="(min-width: 1024px) 48vw, 92vw"
                        veil="strong"
                        quality={70}
                        className="h-full w-full"
                      />
                    )}{" "}
                  </div>
                ))}{" "}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-start justify-between p-5">
                  {" "}
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-micro font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    {" "}
                    <ActiveIcon className="h-3.5 w-3.5 text-homera-amber" aria-hidden="true" /> {active.index} —
                    Écosystème HOMERA{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              <div className="homera-service-stage-copy relative grid p-6 sm:p-7">
                {" "}
                {SERVICES.map((service) => (
                  <ServiceCopy
                    key={service.id}
                    service={service}
                    active={service.id === active.id}
                    onRequest={() => requestService(service.id)}
                  />
                ))}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {/* ---------------- Sommaire interactif ---------------- */}{" "}
          <div
            ref={containerRef}
            role="tablist"
            aria-orientation="vertical"
            aria-label="Services HOMERA"
            onKeyDown={handleKeyDown}
            className="order-1 space-y-2 lg:order-2"
          >
            {" "}
            {SERVICES.map((service) => {
              const Icon = ICONS[service.icon];
              const isActive = service.id === active.id;
              return (
                <Reveal key={service.id} y={22} delay={SERVICES.indexOf(service) * 80}>
                  {" "}
                  <button
                    type="button"
                    role="tab"
                    id={`services-${service.id}`}
                    data-roving-item
                    aria-selected={isActive}
                    aria-label={service.title}
                    aria-controls="services-panel"
                    tabIndex={isActive ? 0 : -1}
                    data-active={isActive}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse" && !containerRef.current?.querySelector(":focus-visible"))
                        selectService(service.id);
                    }}
                    onFocus={() => selectService(service.id)}
                    onClick={() => {
                      selectService(service.id);
                      window.history.replaceState(null, "", `#services-${service.id}`);
                    }}
                    className={`homera-service-tab group/tab relative flex w-full scroll-mt-32 items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-[border-color,background-color,transform] duration-500 ease-standard sm:p-5 ${isActive ? "border-homera-terracotta/45 bg-card shadow-[0_30px_70px_-60px_rgba(28,17,11,0.9)]" : "border-transparent bg-transparent hover:border-border hover:bg-card/60"}`}
                  >
                    {" "}
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-[3px] origin-top bg-gradient-to-b from-homera-terracotta to-homera-amber transition-transform duration-700 ease-standard"
                      style={{ transform: `scaleY(${isActive ? 1 : 0})` }}
                    />{" "}
                    <span
                      className={`homera-num text-caption font-semibold tracking-[0.2em] transition-colors duration-300 ${isActive ? "text-homera-terracotta" : "text-muted-light"}`}
                    >
                      {" "}
                      {service.index}{" "}
                    </span>{" "}
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${isActive ? "bg-homera-terracotta/12 text-homera-terracotta" : "bg-muted/10 text-muted"}`}
                    >
                      {" "}
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />{" "}
                    </span>{" "}
                    <span className="min-w-0 flex-1">
                      {" "}
                      <span className="block text-body-sm font-semibold text-foreground"> {service.title} </span>{" "}
                      <span className="mt-0.5 block text-note leading-relaxed text-muted">{service.short}</span>{" "}
                      <span className="homera-service-tab-detail" aria-hidden={!isActive}>
                        {" "}
                        <span className="min-h-0 overflow-hidden">
                          <span className="mt-4 block text-caption leading-relaxed text-muted">
                            {service.description}
                          </span>
                          <span className="mt-3 block homera-accent-ink text-caption font-medium">
                            Découvrir ce service →
                          </span>
                        </span>{" "}
                      </span>{" "}
                    </span>{" "}
                    <ArrowRight
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 transition-all duration-500 ease-standard ${isActive ? "translate-x-0 text-homera-terracotta opacity-100" : "-translate-x-1 text-muted opacity-0 group-hover/tab:translate-x-0 group-hover/tab:opacity-70"}`}
                    />{" "}
                  </button>{" "}
                </Reveal>
              );
            })}{" "}
          </div>{" "}
        </div>{" "}
        {/* CTA conservé */}{" "}
        <Reveal y={18} className="mt-14 text-center">
          {" "}
          <Button variant="outline" size="lg" onClick={() => requestService()} className="homera-press gap-2">
            {" "}
            <TextRoll>Demander un service sur-mesure</TextRoll> <ArrowRight className="h-4 w-4" aria-hidden="true" />{" "}
          </Button>{" "}
        </Reveal>{" "}
      </div>{" "}
    </section>
  );
} /** La grille superpose les textes : sa hauteur est celle du plus long. Choisir un autre service ne déplace donc pas le CTA ou la section suivante. */
function ServiceCopy({ service, active, onRequest }: { service: Service; active: boolean; onRequest: () => void }) {
  const Icon = ICONS[service.icon];
  return (
    <div className="homera-service-copy space-y-4" data-active={active} aria-hidden={!active} inert={!active}>
      {" "}
      <div className="flex items-start justify-between gap-4">
        {" "}
        <div>
          {" "}
          <h3 className="font-serif text-display-xs text-foreground">{service.title}</h3>{" "}
          <p className="homera-accent-ink mt-1 text-caption uppercase tracking-[.16em]">{service.short}</p>{" "}
        </div>{" "}
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-homera-terracotta/10 text-homera-terracotta">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>{" "}
      </div>{" "}
      <p className="text-body-sm leading-relaxed text-muted">{service.description}</p>{" "}
      <ul className="space-y-2">
        {" "}
        {service.bullets.map((bullet, index) => (
          <li
            key={bullet}
            className="homera-service-bullet flex items-start gap-2.5 text-note text-foreground"
            style={{ animationDelay: `${index * 65}ms` }}
          >
            <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-homera-terracotta" aria-hidden="true" />
            <span>{bullet}</span>
          </li>
        ))}{" "}
      </ul>{" "}
      <div className="pt-1">
        <Button variant="outline" onClick={onRequest} className="homera-press gap-2">
          <TextRoll>Demander ce service</TextRoll>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>{" "}
    </div>
  );
}

"use client";
import { useCallback, useRef, useState } from "react";
import { ArrowDown, CheckCircle2, ShieldCheck } from "lucide-react";
import { DEMO_DATA, DOSSIER, PROPERTIES, type DossierField } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Visual } from "@/components/ui/Visual";
import { CopyReference } from "@/components/ui/CopyReference";
import { TextRoll } from "@/components/ui/TextRoll";
import { phase } from "@/lib/motion-math";
import { scrollToStory, useMotionPreferences, useSceneMotion, useStoryCapable } from "@/lib/motion";
const PLACEMENT: Record<DossierField["position"], string> = {
  "top-left": "lg:col-start-1 lg:row-start-1",
  "top-right": "lg:col-start-3 lg:row-start-1",
  "mid-left": "lg:col-start-1 lg:row-start-2",
  "mid-right": "lg:col-start-3 lg:row-start-2",
  "bottom-left": "lg:col-start-1 lg:row-start-3",
  "bottom-right": "lg:col-start-3 lg:row-start-3",
};
const FIELD_ORDER = ["localisation", "statut", "proprietaire", "verification", "agent", "date"];
const FIELDS = FIELD_ORDER.map(
  (id) => DOSSIER.fields.find((field) => field.id === id)!,
); /* Signature : le code est d'abord seul. Le scroll lui attache un lieu, un statut, un propriétaire, un mandat et une date. Rien ne remplace le code au centre ; le dossier se construit autour de lui. */
export function PropertyDossier() {
  const story = useStoryCapable();
  const { reduced } = useMotionPreferences();
  const [activeField, setActiveField] = useState(-1);
  const activeRef = useRef(-1);
  const reference = PROPERTIES[0];
  const update = useCallback((element: HTMLDivElement, progress: number) => {
    const photo = phase(progress, 0.08, 0.27);
    const core = element.querySelector<HTMLElement>(".homera-dossier-core");
    const code = element.querySelector<HTMLElement>("#dossier-reference");
    const centerShift =
      core && code ? Math.max(0, core.offsetHeight / 2 - code.offsetTop - code.offsetHeight / 2) : 180;
    element.style.setProperty("--dossier-controls-visibility", progress > 0.15 ? "visible" : "hidden");
    element.style.setProperty("--dossier-photo", photo.toFixed(4));
    element.style.setProperty("--dossier-reference-y", `${((1 - photo) * centerShift).toFixed(2)}px`);
    let active = -1;
    element.querySelectorAll<HTMLElement>("[data-dossier-field]").forEach((field, index) => {
      const start = 0.2 + index * 0.125;
      const reveal = phase(progress, start, start + 0.105);
      field.style.setProperty("--field-reveal", reveal.toFixed(4));
      if (progress >= start) active = index;
    });
    element.querySelectorAll<HTMLElement>("[data-dossier-field]").forEach((field, index) => {
      field.dataset.current = String(index === active);
    });
    if (activeRef.current !== active) {
      activeRef.current = active;
      setActiveField(active);
    }
  }, []);
  const trackRef = useSceneMotion<HTMLDivElement>(update, { enabled: story, mode: "sticky", response: 65 });
  return (
    <section
      id="bien-homera"
      className="homera-scene scene-bg-tint-out relative py-[var(--space-section)] sm:py-[var(--space-section-lg)]"
      aria-labelledby="bien-homera-titre"
    >
      {" "}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {" "}
        <SceneHeader
          index="05"
          eyebrow="Le bien HOMERA"
          align="center"
          title={<span id="bien-homera-titre">Chaque bien possède une identité.</span>}
          intro="Chez HOMERA, un bien n’est pas seulement une annonce. Une référence unique relie le lieu à son dossier."
        />{" "}
        <div ref={trackRef} className="homera-story-track homera-dossier mt-10">
          {" "}
          <div data-story-sticky className="homera-story-sticky flex flex-col justify-center">
            {" "}
            <div className="homera-dossier-orbit grid gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1.65fr_1fr] lg:grid-rows-3 lg:gap-x-10 lg:gap-y-5">
              {" "}
              <div className="homera-dossier-core relative sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:self-center">
                {" "}
                <div className="homera-dossier-reference relative z-[2] text-center">
                  {" "}
                  <p className="homera-dossier-caption mb-3 text-micro font-semibold uppercase tracking-[.23em] text-muted">
                    L’identité du lieu
                  </p>{" "}
                  <p
                    id="dossier-reference"
                    className="homera-num whitespace-nowrap font-mono text-figure-fluid font-medium tracking-[.02em] text-foreground"
                  >
                    {DOSSIER.reference}
                  </p>{" "}
                  <div className="homera-dossier-reference-tools mt-4 text-homera-terracotta">
                    <CopyReference value={DOSSIER.reference} targetId="dossier-reference" />
                  </div>{" "}
                </div>{" "}
                <div className="homera-dossier-photo relative mx-auto mt-6 max-w-[29rem] overflow-hidden rounded-card border border-border shadow-[0_32px_75px_-45px_rgba(62,36,24,.65)]">
                  {" "}
                  <Visual
                    mediaKey={reference.media}
                    alt={reference.alt}
                    sizes="(min-width: 1024px) 32vw, 92vw"
                    veil="strong"
                    quality={74}
                    className="h-[18rem] w-full sm:h-[20rem]"
                  />{" "}
                  <div className="absolute inset-x-0 bottom-0 z-[2] p-5 text-white">
                    {" "}
                    <p className="mb-2 inline-flex items-center gap-2 text-micro font-semibold uppercase tracking-[.18em] text-homera-amber">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {DOSSIER.status}
                    </p>{" "}
                    <p className="font-serif text-display-xs">
                      {DOSSIER.fields.find((field) => field.id === "propriete")?.value}
                    </p>{" "}
                    <p className="mt-2 text-caption text-homera-cream-dark">
                      {reference.district}, {reference.city}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {FIELDS.map((field) => (
                <div
                  key={field.id}
                  id={`dossier-field-${field.id}`}
                  data-dossier-field
                  data-side={field.position.includes("left") ? "left" : "right"}
                  className={`homera-dossier-field relative rounded-xl border border-border/60 bg-card/35 p-4 ${PLACEMENT[field.position]}`}
                >
                  {" "}
                  <span className="homera-dossier-connector" aria-hidden="true" />{" "}
                  <p className="text-micro font-semibold uppercase tracking-[.16em] text-foreground">{field.label}</p>{" "}
                  <p className="homera-num mt-2 text-body-sm font-medium leading-relaxed text-foreground">
                    {field.value}
                  </p>{" "}
                </div>
              ))}{" "}
            </div>{" "}
            <div className="homera-story-tools mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-border/60 pt-5">
              {" "}
              <p className="max-w-lg text-center text-caption leading-relaxed text-muted">
                <CheckCircle2 className="mr-2 inline h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                {DOSSIER.note}
              </p>{" "}
              {story && (
                <button
                  type="button"
                  onClick={() => scrollToStory(trackRef.current, 0.98, reduced)}
                  className="homera-underline min-h-10 homera-accent-ink text-caption font-medium"
                >
                  <TextRoll>Voir toute la fiche</TextRoll>
                </button>
              )}{" "}
              <a
                href="#protocole"
                className="homera-underline inline-flex min-h-10 items-center gap-2 text-caption font-medium text-muted"
              >
                {story ? "Passer le récit" : "Comprendre la méthode"}
                <ArrowDown className="h-3 w-3" aria-hidden="true" />
              </a>{" "}
            </div>{" "}
            <span
              aria-hidden="true"
              className="homera-story-indicator mx-auto mt-4 text-micro tracking-[.18em] text-muted"
            >
              {activeField < 0
                ? "UNE RÉFÉRENCE UNIQUE"
                : `${String(activeField + 1).padStart(2, "0")} / 06 — ${FIELDS[activeField].label.toUpperCase()}`}
            </span>{" "}
          </div>{" "}
        </div>{" "}
        {DEMO_DATA && (
          <p className="mt-5 text-center text-micro leading-relaxed text-muted">
            Dossier de démonstration · visuel illustratif · aucune garantie juridique implicite.
          </p>
        )}{" "}
      </div>{" "}
    </section>
  );
}

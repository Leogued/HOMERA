"use client";
import { useState } from "react";
import { AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { DEMO_DATA, VERIFICATION_STEPS } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
/* Un même dossier traverse sept états, au rythme du visiteur : carrousel manuel façon coverflow — carte centrale nette, voisines en retrait, flèches précédent/suivant. Aucune lecture automatique, aucun pilotage par le scroll. Colonne unique centrée, sans visuel latéral. */
export function VerificationProtocol() {
  const [active, setActive] = useState(0);
  const goTo = (index: number) => {
    setActive(Math.max(0, Math.min(VERIFICATION_STEPS.length - 1, index)));
  };
  return (
    <section
      id="protocole"
      className="homera-scene homera-protocol homera-on-dark relative overflow-hidden"
      aria-labelledby="protocole-titre"
    >
      {" "}
      <div className="relative z-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {" "}
        <SceneHeader
          tone="dark"
          align="center"
          title={
            <span id="protocole-titre">
              La confiance se construit.{" "}
              <span className="homera-accent text-homera-amber">Une vérification à la fois.</span>
            </span>
          }
          intro="Sept étapes pour examiner un dossier, documenter les vérifications et déterminer si un bien peut être publié sur HOMERA."
        />{" "}
        <div className="mt-12">
          {" "}
          <div className="flex flex-col justify-center">
            {" "}
            <div className="mx-auto max-w-3xl">
                {" "}
                <ol className="homera-protocol-coverflow" aria-roledescription="carrousel" aria-label="Étapes de vérification">
                  {" "}
                  {VERIFICATION_STEPS.map((step, index) => {
                    return (
                      <li
                        key={step.num}
                        id={`protocol-step-${index}`}
                        data-active={active === index}
                        data-offset={index - active}
                        aria-hidden={active !== index ? true : undefined}
                        inert={active !== index}
                        className="homera-protocol-card scroll-mt-32 rounded-xl border border-white/20 bg-white/5 p-6 sm:p-8"
                      >
                        {" "}
                        <h3 className="max-w-lg font-serif text-display-fluid text-homera-paper">{step.title}</h3>{" "}
                        <p className="mt-6 max-w-md text-body-sm leading-[1.8] text-homera-cream-dark">
                          {step.narrative}
                        </p>{" "}
                        <p className="mt-5 max-w-md border-l border-homera-amber/45 pl-4 text-note leading-[1.7] text-homera-cream-dark">
                          {step.detail}
                        </p>{" "}
                      </li>
                    );
                  })}{" "}
                </ol>{" "}
                <div className="mt-7 flex items-center justify-center gap-3">
                    {" "}
                    <button
                      type="button"
                      onClick={() => goTo(active - 1)}
                      disabled={active === 0}
                      aria-label="Étape précédente"
                      className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-homera-paper disabled:opacity-30"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </button>{" "}
                    <button
                      type="button"
                      onClick={() => goTo(active + 1)}
                      disabled={active === VERIFICATION_STEPS.length - 1}
                      aria-label="Étape suivante"
                      className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-homera-paper disabled:opacity-30"
                    >
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>{" "}
                  </div>
            </div>{" "}
            <div className="mt-10 flex items-center justify-between gap-5 border-t border-white/15 pt-5 text-caption text-homera-cream-dark">
              {" "}
              <p className="inline-flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-homera-amber" aria-hidden="true" />
                Un dossier, une méthode, une trace.
              </p>{" "}
              <a
                href="#services"
                className="homera-underline inline-flex min-h-10 items-center gap-2 text-homera-cream-dark"
              >
                Découvrir les services
                <ArrowDown className="h-3 w-3" aria-hidden="true" />
              </a>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <aside className="mt-12 flex items-start gap-4 rounded-2xl border border-white/20 bg-white/[.035] p-5 sm:p-6">
          {" "}
          <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-homera-amber" aria-hidden="true" />{" "}
          <div>
            {" "}
            <h3 className="text-body-sm font-semibold text-homera-paper">
              Ce que « Vérifié par HOMERA » signifie réellement
            </h3>{" "}
            <p className="mt-2 max-w-4xl text-note leading-[1.8] text-homera-cream-dark">
              HOMERA ne dit pas « ce bien est juridiquement parfait ». La promesse est précise :{" "}
              <strong className="font-semibold text-homera-paper">
                ce bien a fait l’objet d’un processus de vérification portant sur les éléments indiqués dans sa fiche
              </strong>{" "}
              (identité du propriétaire, mandat d’agent, localisation, photos).
            </p>{" "}
            {DEMO_DATA && (
              <p className="mt-3 text-caption text-homera-cream-dark">
                Visualisation d’un dossier de démonstration, pas d’un audit réel.
              </p>
            )}{" "}
          </div>{" "}
        </aside>{" "}
      </div>{" "}
    </section>
  );
}

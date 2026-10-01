"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, ArrowDown, ArrowLeft, ArrowRight, Award, Check, CheckCircle, FileCheck, Lock, Search, ShieldCheck, UserCheck, type LucideIcon } from "lucide-react";
import { DEMO_DATA, DOSSIER, VERIFICATION_STEPS, type VerificationStep } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Visual } from "@/components/ui/Visual";
import { scrollToStory, useMotionPreferences, useRovingFocus, useSceneMotion, useStoryCapable } from "@/lib/motion";
import { storyIndex, storyPosition } from "@/lib/motion-math";

const ICONS: Record<VerificationStep["icon"], LucideIcon> = {
  file: FileCheck, lock: Lock, search: Search, user: UserCheck, shield: ShieldCheck, check: CheckCircle, award: Award,
};

/* Un même dossier traverse sept états. La colonne centrale se transforme,
   la pièce visuelle de droite reste un objet continu. Sur mobile et en
   mouvement réduit, les sept étapes sont intégralement dépliées. */
export function VerificationProtocol() {
  const story = useStoryCapable();
  const { reduced } = useMotionPreferences();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const update = useCallback((element: HTMLDivElement, progress: number) => {
    const next = storyIndex(progress, VERIFICATION_STEPS.length);
    element.style.setProperty("--protocol-progress", progress.toFixed(4));
    if (activeRef.current !== next) { activeRef.current = next; setActive(next); }
  }, []);
  const trackRef = useSceneMotion<HTMLDivElement>(update, { enabled: story, mode: "sticky", response: 65 });
  const { containerRef, handleKeyDown } = useRovingFocus<HTMLElement>();
  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(VERIFICATION_STEPS.length - 1, index));
    if (story) scrollToStory(trackRef.current, storyPosition(next, VERIFICATION_STEPS.length), reduced);
    else document.getElementById(`protocol-step-${next}`)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  };

  return (
    <section id="protocole" className="homera-scene homera-protocol homera-on-dark relative" aria-labelledby="protocole-titre">
      <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SceneHeader index="06" eyebrow="Transparence & rigueur" tone="dark"
          title={<span id="protocole-titre">La confiance se construit.<br /><span className="homera-accent text-[#e0a45e]">Une vérification à la fois.</span></span>}
          intro="Le protocole HOMERA : sept mouvements pour rendre un dossier lisible avant d’accorder l’autorisation de publication."
          className="max-w-3xl" />
        <div ref={trackRef} className="homera-story-track homera-protocol-track mt-12">
          <div data-story-sticky className="homera-story-sticky flex flex-col justify-center">
            <div className="homera-protocol-layout grid items-center gap-8 lg:grid-cols-[6rem_1.1fr_1fr] lg:gap-12">
              <nav ref={containerRef} aria-label="Étapes du protocole HOMERA" onKeyDown={handleKeyDown} className="homera-protocol-nav relative">
                <span aria-hidden="true" className="homera-protocol-line"><span /></span>
                <ol className="relative grid grid-cols-7 gap-1 lg:flex lg:flex-col lg:gap-3">
                  {VERIFICATION_STEPS.map((step, index) => (
                    <li key={step.num}>
                      <button type="button" data-roving-item onClick={() => goTo(index)}
                        aria-label={`${step.num} — ${step.title}`} aria-controls={`protocol-step-${index}`}
                        aria-current={story && active === index ? "step" : undefined}
                        className="homera-press homera-protocol-number mx-auto flex h-11 w-full max-w-11 lg:mx-0 items-center justify-center rounded-full border text-[12px] font-medium"
                        data-current={story && active === index} data-past={story && index < active}>
                        <span className="homera-num">{step.num}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="min-w-0">
                <ol className="homera-protocol-copy-list">
                  {VERIFICATION_STEPS.map((step, index) => {
                    const Icon = ICONS[step.icon];
                    return (
                      <li key={step.num} id={`protocol-step-${index}`} data-active={active === index}
                        aria-hidden={story && active !== index ? true : undefined} inert={story && active !== index}
                        className="homera-protocol-copy scroll-mt-32">
                        <span className="mb-5 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.2em] text-[#e0a45e]">
                          <Icon className="h-4 w-4" aria-hidden="true" /> Mouvement {step.num}
                        </span>
                        <h3 className="max-w-lg font-serif text-[clamp(1.5rem,2.6vw,2.6rem)] leading-[1.15] text-[#faf6ef]">{step.title}</h3>
                        <p className="mt-6 max-w-md text-[14px] leading-[1.8] text-[#ebdcc6]">{step.narrative}</p>
                        <p className="mt-5 max-w-md border-l border-[#e0a45e]/45 pl-4 text-[12px] leading-[1.7] text-[#ebdcc6]">{step.detail}</p>
                      </li>
                    );
                  })}
                </ol>
                {story && <div className="mt-7 flex items-center gap-3">
                  <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Étape précédente" className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-[#faf6ef] disabled:opacity-30"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => goTo(active + 1)} disabled={active === VERIFICATION_STEPS.length - 1} aria-label="Étape suivante" className="homera-press flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-[#faf6ef] disabled:opacity-30"><ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                  <span className="homera-num ml-2 text-[11px] tracking-[.16em] text-[#ebdcc6]">{VERIFICATION_STEPS[active].num} / 07</span>
                </div>}
              </div>
              <ProtocolVisual stage={story ? active : 6} />
            </div>
            <div className="homera-story-tools mt-10 flex items-center justify-between gap-5 border-t border-white/15 pt-5 text-[11px] text-[#ebdcc6]">
              <p className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[#e0a45e]" aria-hidden="true" />Un dossier, une méthode, une trace.</p>
              <a href="#services" className="homera-underline inline-flex min-h-10 items-center gap-2 text-[#ebdcc6]">{story ? "Passer le récit" : "Découvrir les services"}<ArrowDown className="h-3 w-3" aria-hidden="true" /></a>
            </div>
          </div>
        </div>
        <aside className="mt-12 flex items-start gap-4 rounded-2xl border border-white/20 bg-white/[.035] p-5 sm:p-6">
          <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-[#e0a45e]" aria-hidden="true" />
          <div>
            <h3 className="text-[13px] font-semibold text-[#faf6ef]">Ce que « Vérifié par HOMERA » signifie réellement</h3>
            <p className="mt-2 max-w-4xl text-[12.5px] leading-[1.8] text-[#ebdcc6]">HOMERA ne dit pas « ce bien est juridiquement parfait ». La promesse est précise : <strong className="font-semibold text-[#faf6ef]">ce bien a fait l’objet d’un processus de vérification portant sur les éléments indiqués dans sa fiche</strong> (identité du propriétaire, mandat d’agent, localisation, photos).</p>
            {DEMO_DATA && <p className="mt-3 text-[11px] text-[#ebdcc6]">Visualisation d’un dossier de démonstration, pas d’un audit réel.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ProtocolVisual({ stage }: { stage: number }) {
  const step = VERIFICATION_STEPS[stage];
  const Icon = ICONS[step.icon];
  return (
    <div className="homera-protocol-object relative mx-auto w-full max-w-[27rem]" role="img" aria-label={`Dossier illustratif ${DOSSIER.reference} : ${step.title}`}>
      <div aria-hidden="true" className="homera-protocol-paper absolute inset-0 rounded-[1.5rem] border border-white/20 bg-[#5a3726]" />
      <div className="homera-protocol-record relative overflow-hidden rounded-[1.5rem] border border-white/25 bg-[#faf6ef] text-[#3e2418]" data-stage={stage}>
        <div className="flex items-center justify-between border-b border-[#3e2418]/15 px-5 py-4">
          <span className="text-[10px] font-semibold uppercase tracking-[.2em]">Dossier HOMERA</span>
          <Icon className="h-4 w-4 text-[#c65d3b]" aria-hidden="true" />
        </div>
        <div className="relative">
          <Visual mediaKey="prop-villa" alt="" sizes="(min-width: 1024px) 28vw, 85vw" veil="none" quality={68} className="h-[10rem] w-full" />
          <div className="homera-protocol-scan" aria-hidden="true" data-show={stage === 1 || stage === 4} />
          <span className="absolute bottom-3 left-4 rounded-full border border-white/30 bg-[#3e2418]/85 px-3 py-1 text-[10px] font-medium text-[#faf6ef]">Fidjrossè · Cotonou</span>
        </div>
        <div className="p-5">
          <p className="homera-num font-mono text-[14px] font-medium">{DOSSIER.reference}</p>
          <div className="mt-5 space-y-3">
            {["Informations du bien", "Pièces documentaires", "Identité & mandat"].map((label, index) => (
              <div key={label} className="flex items-center justify-between gap-3 text-[11px]">
                <span>{label}</span>
                <span className="homera-protocol-check flex h-5 w-5 items-center justify-center rounded-full border border-[#3e2418]/25" data-checked={stage >= index + 1}>
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
          <div className="homera-protocol-agent mt-5 flex items-center gap-3 border-t border-[#3e2418]/15 pt-4" data-show={stage >= 3}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3e2418]/8"><UserCheck className="h-4 w-4 text-[#c65d3b]" aria-hidden="true" /></span>
            <div><p className="text-[10px] text-[#6b5545]">Mandataire habilité</p><p className="homera-num mt-1 font-mono text-[11px]">HOM-A-0214</p></div>
          </div>
          <div className="mt-5 flex min-h-7 items-center justify-between gap-3 text-[10px]">
            <span className="homera-num text-[#6b5545]">Mouvement {step.num} / 07</span>
            <span className="homera-protocol-stamp inline-flex items-center gap-1.5 rounded-full border border-[#c65d3b]/45 bg-[#c65d3b]/8 px-2.5 py-1 font-semibold text-[#3e2418]" data-show={stage >= 4}><ShieldCheck className="h-3 w-3" aria-hidden="true" />{stage >= 6 ? "Publiable" : "Statut attribué"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

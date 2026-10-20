import Link from "next/link";
import { Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
/* Signature : preuves réelles uniquement. La section lit TESTIMONIALS et
   n'affiche que des récits fournis et vérifiés ; sans récit, elle propose
   honnêtement d'en écrire un — jamais de faux avis (règle éditoriale). */
export function Testimonials() {
  const hasVoices = TESTIMONIALS.length > 0;
  return (
    <section
      id="temoignages"
      className="homera-scene relative py-[var(--space-section)] sm:py-[var(--space-section-lg)]"
      aria-labelledby="temoignages-titre"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SceneHeader
          align="center"
          title={
            <span id="temoignages-titre">
              {hasVoices ? "Ils avancent avec HOMERA." : "Les premiers récits arrivent bientôt."}
            </span>
          }
          intro={
            hasVoices
              ? "Des parcours réels, racontés par celles et ceux qui les ont vécus."
              : "Vous avez visité, loué ou acheté avec HOMERA ? Votre expérience aidera les prochains à avancer en confiance."
          }
        />
        {hasVoices ? (
          <>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((voice, index) => (
                <Reveal
                  key={voice.name}
                  delay={index * 90}
                  y={20}
                  className="rounded-xl border border-border/60 bg-card p-6"
                >
                  <figure className="flex h-full flex-col">
                    <Quote className="h-5 w-5 text-homera-terracotta" aria-hidden="true" />
                    <blockquote className="mt-4 flex-1 font-serif text-display-xs leading-relaxed text-foreground">
                      « {voice.quote} »
                    </blockquote>
                    <figcaption className="mt-5 border-t border-border/60 pt-4">
                      <p className="text-note font-semibold text-foreground">{voice.name}</p>
                      <p className="mt-1 text-caption text-muted">{voice.context}</p>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
            <Reveal y={16} className="mt-8 text-center">
              <Link
                href="/contact"
                className="homera-underline text-note font-medium text-homera-terracotta transition-colors hover:text-foreground"
              >
                Vous aussi, racontez votre expérience
              </Link>
            </Reveal>
          </>
        ) : (
          <Reveal y={16} className="mt-8 text-center">
            <Link
              href="/contact"
              className="homera-underline text-note font-medium text-homera-terracotta transition-colors hover:text-foreground"
            >
              Raconter mon expérience
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}

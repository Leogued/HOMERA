"use client";

import { ArrowUpRight, Clock } from "lucide-react";
import { EDITORIAL } from "@/lib/content";
import { SceneHeader } from "@/components/ui/Scene";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
import { useMotionPreferences } from "@/lib/motion";

/* ==================================================================
   HOMERA — L’UNIVERS ÉDITORIAL
   ------------------------------------------------------------------
   Un magazine digital, pas un blog. Le bandeau de rubriques défile en
   continu (il s’arrête dès qu’on le regarde ou qu’on le parcourt au
   clavier), puis sept sujets se déplient : architecture, quartiers,
   styles de vie, maisons, appartements, terrains, inspirations.

   Objectif : montrer que HOMERA documente le contexte avant de parler
   de prix — et donner envie de continuer à lire.
   ================================================================== */

export function EditorialSection() {
  const { reduced } = useMotionPreferences();
  const stories = EDITORIAL.stories;
  const [lead, ...rest] = stories;

  return (
    <section
      id="magazine"
      className="homera-scene scene-bg-tint relative py-20 sm:py-24"
      aria-labelledby="magazine-titre"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SceneHeader
          index="08"
          eyebrow="Le magazine"
          title={<span id="magazine-titre">{EDITORIAL.title}</span>}
          intro={EDITORIAL.intro}
        />

        {/* Bandeau de rubriques : respiration éditoriale, jamais décorative */}
        <Reveal y={16} className="mt-10">
          <div
            className="homera-marquee-wrap homera-noscrollbar relative flex overflow-hidden border-y border-border py-4"
            aria-hidden="true"
          >
            <div
              className="homera-marquee gap-10 pr-10"
              style={{ animationPlayState: reduced ? "paused" : "running" }}
            >
              {[...EDITORIAL.categories, ...EDITORIAL.categories].map((category, index) => (
                <span
                  key={`${category}-${index}`}
                  className="flex shrink-0 items-center gap-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-light"
                >
                  {category}
                  <span className="h-1 w-1 rounded-full bg-homera-terracotta/60" />
                </span>
              ))}
            </div>
          </div>
          <ul className="sr-only">
            {EDITORIAL.categories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        </Reveal>

        {/* Sujet de couverture + sélection */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
          <Reveal y={0} blur={0} clip clipRadius={28} duration={1100}>
            <a
              href="#magazine"
              data-cursor="explore"
              className="group relative block overflow-hidden rounded-[1.75rem] border border-border"
              aria-label={`Lire : ${lead.title}`}
            >
              <Visual
                mediaKey={lead.media}
                alt={lead.alt}
                sizes="(min-width: 1024px) 46vw, 92vw"
                hoverable
                veil="none"
                quality={70}
                className="h-[24rem] w-full sm:h-[30rem]"
                imageClassName="transition-transform duration-[1400ms] ease-[cubic-bezier(.22,.61,.28,1)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(18,11,7,0.92)_0%,rgba(18,11,7,0.5)_42%,rgba(18,11,7,0.08)_75%)]"
              />
              <div className="absolute inset-0 z-[2] flex flex-col justify-between p-6 text-white sm:p-8">
                <span className="inline-flex w-max items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
                  {lead.category}
                </span>
                <div>
                  <h3 className="max-w-xl font-serif text-display-sm leading-tight transition-transform duration-700 ease-[cubic-bezier(.22,.61,.28,1)] group-hover:-translate-y-1 sm:text-[2.1rem]">
                    {lead.title}
                  </h3>
                  <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-stone-200/90">
                    {lead.excerpt}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-3 text-[11.5px] uppercase tracking-[0.2em] text-stone-300">
                    <Clock className="h-3.5 w-3.5 text-homera-amber" aria-hidden="true" />
                    {lead.readingTime} de lecture
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-x-1 group-hover:-translate-y-1"
                    />
                  </span>
                </div>
              </div>
            </a>
          </Reveal>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
            {rest.slice(0, 4).map((story, index) => (
              <Reveal as="li" key={story.id} delay={index * 90} y={22}>
                <a
                  href="#magazine"
                  className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 transition-[border-color,transform] duration-500 ease-[cubic-bezier(.22,.61,.28,1)] hover:border-homera-terracotta/40 sm:p-3.5"
                >
                  <span className="relative block h-20 w-24 shrink-0 overflow-hidden rounded-xl sm:h-[5.5rem] sm:w-28">
                    <Visual
                      mediaKey={story.media}
                      alt={story.alt}
                      sizes="7rem"
                      hoverable
                      veil="none"
                      quality={62}
                      className="h-full w-full"
                      imageClassName="transition-transform duration-[1200ms] ease-[cubic-bezier(.22,.61,.28,1)]"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-homera-terracotta">
                      {story.category}
                    </span>
                    <span className="mt-1 block text-[13.5px] font-semibold leading-snug text-foreground transition-transform duration-500 ease-out group-hover:-translate-y-0.5">
                      {story.title}
                    </span>
                    <span className="mt-1 block truncate text-[11.5px] text-muted">
                      {story.excerpt}
                    </span>
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-homera-terracotta"
                  />
                </a>
              </Reveal>
            ))}
          </ul>
        </div>

        {/* Sujets restants — même grammaire visuelle, rythme plus court */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(4).map((story, index) => (
            <Reveal key={story.id} delay={index * 110} y={26} blur={6}>
              <a
                href="#magazine"
                data-cursor="explore"
                className="group relative block overflow-hidden rounded-[1.5rem] border border-border"
                aria-label={`Lire : ${story.title}`}
              >
                <Visual
                  mediaKey={story.media}
                  alt={story.alt}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                  hoverable
                  veil="none"
                  quality={68}
                  className="h-[17rem] w-full"
                  imageClassName="transition-transform duration-[1300ms] ease-[cubic-bezier(.22,.61,.28,1)]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(18,11,7,0.9)_0%,rgba(18,11,7,0.35)_50%,transparent_80%)]"
                />
                <div className="absolute inset-x-0 bottom-0 z-[2] p-5 text-white">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-homera-amber">
                    {story.category}
                  </span>
                  <h3 className="mt-2 text-[15px] font-semibold leading-snug transition-transform duration-500 ease-out group-hover:-translate-y-0.5">
                    {story.title}
                  </h3>
                  <span className="mt-2 flex items-center gap-2 text-[11px] text-stone-300">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {story.readingTime}
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

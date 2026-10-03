import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Visual } from "@/components/ui/Visual";
/* ================================================================== HOMERA — EN-TÊTE DE PAGE PUBLIQUE ------------------------------------------------------------------ Un même rythme pour toutes les pages intérieures : fil d’Ariane, surtitre, titre, chapeau, puis éventuellement des repères chiffrés. Deux tons : « media » quand la page ouvre sur une image, « plain » quand elle commence directement sur le contenu. ================================================================== */ export type Crumb =
  { label: string; href?: string };
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d’Ariane">
      {" "}
      <ol className="flex flex-wrap items-center gap-1.5 text-caption text-muted">
        {" "}
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {" "}
              {item.href && !last ? (
                <Link href={item.href} className="homera-underline transition-colors hover:text-homera-terracotta">
                  {" "}
                  {item.label}{" "}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-foreground" : undefined}>
                  {" "}
                  {item.label}{" "}
                </span>
              )}{" "}
              {!last && <ChevronRight className="h-3 w-3 text-muted-light" aria-hidden="true" />}{" "}
            </li>
          );
        })}{" "}
      </ol>{" "}
    </nav>
  );
}
export function PageHero({
  crumbs,
  eyebrow,
  title,
  intro,
  tone = "plain",
  mediaKey,
  mediaAlt,
  facts,
  actions,
  children,
}: {
  crumbs: Crumb[];
  eyebrow: string;
  title: string;
  intro: string;
  tone?: "plain" | "media";
  mediaKey?: string;
  mediaAlt?: string;
  facts?: { label: string; value: string }[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const onMedia = tone === "media" && mediaKey;
  return (
    <header
      className={`homera-scene relative isolate overflow-hidden ${onMedia ? "homera-on-dark bg-homera-night text-white" : "border-b border-border bg-background text-foreground"}`}
    >
      {" "}
      {onMedia && (
        <>
          {" "}
          <Visual
            mediaKey={mediaKey}
            alt={mediaAlt ?? ""}
            sizes="100vw"
            veil="none"
            quality={68}
            priority
            className="absolute inset-0 -z-10 h-full w-full"
            imageClassName="homera-page-hero-image"
          />{" "}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-[5] bg-[linear-gradient(to_top,rgba(28,17,11,.90),rgba(28,17,11,.62)_46%,rgba(28,17,11,.34))]"
          />{" "}
        </>
      )}{" "}
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        {" "}
        <div className={onMedia ? "[&_a]:text-white/80 [&_span]:text-white/80" : ""}>
          {" "}
          <Breadcrumbs items={crumbs} />{" "}
        </div>{" "}
        <div className="mt-8 max-w-3xl">
          {" "}
          <Reveal y={14} blur={3} duration={620} immediate className="flex items-center gap-3">
            {" "}
            <span
              className={`homera-num text-caption font-semibold tracking-[0.3em] ${onMedia ? "text-homera-amber" : "homera-accent-ink"}`}
            >
              {" "}
              HOMERA{" "}
            </span>{" "}
            <span
              aria-hidden="true"
              className={`h-px w-10 ${onMedia ? "bg-white/30" : "bg-homera-terracotta/40"}`}
            />{" "}
            <span
              className={`text-micro font-semibold uppercase tracking-[0.24em] ${onMedia ? "text-white/70" : "text-muted"}`}
            >
              {" "}
              {eyebrow}{" "}
            </span>{" "}
          </Reveal>{" "}
          <Reveal
            y={22}
            duration={680}
            delay={70}
            immediate
            as="h1"
            className={`mt-5 font-serif text-display-md sm:text-display-lg ${onMedia ? "text-white" : "text-foreground"}`}
          >
            {" "}
            {title}{" "}
          </Reveal>{" "}
          <Reveal
            y={18}
            duration={640}
            delay={140}
            immediate
            as="p"
            className={`mt-4 text-body-sm leading-relaxed sm:text-body ${onMedia ? "text-homera-cream-dark" : "text-muted"}`}
          >
            {" "}
            {intro}{" "}
          </Reveal>{" "}
          {actions && (
            <Reveal y={16} duration={620} delay={200} immediate className="mt-7 flex flex-wrap items-center gap-3">
              {" "}
              {actions}{" "}
            </Reveal>
          )}{" "}
          {facts && facts.length > 0 && (
            <Reveal
              y={16}
              duration={620}
              delay={240}
              immediate
              as="dl"
              className="mt-8 flex flex-wrap gap-x-10 gap-y-4"
            >
              {" "}
              {facts.map((fact) => (
                <div key={fact.label}>
                  {" "}
                  <dt
                    className={`text-caption uppercase tracking-[0.16em] ${onMedia ? "text-white/60" : "text-muted"}`}
                  >
                    {fact.label}
                  </dt>{" "}
                  <dd
                    className={`homera-num mt-1 font-serif text-display-xs ${onMedia ? "text-white" : "text-foreground"}`}
                  >
                    {fact.value}
                  </dd>{" "}
                </div>
              ))}{" "}
            </Reveal>
          )}{" "}
        </div>{" "}
        {children}{" "}
      </div>{" "}
    </header>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Compass, SlidersHorizontal, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useVisitor } from "@/components/providers/VisitorProvider";
import { ClientHero } from "@/components/client/ClientHero";
import { PropertyCard } from "@/components/catalog/PropertyCard";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel } from "@/components/workspace/Primitives";
import { recommendationReasons, selectRecommendations } from "@/lib/recommendations";

/* ==================================================================
   HOMERA — RECOMMANDATIONS : SÉLECTION EXPLIQUÉE, PAS DE SCORE IA
   ------------------------------------------------------------------
   Les biens sont classés à partir de trois signaux réels : le projet
   déclaré à l’inscription, la recherche la plus récente et le budget
   déclaré. Sous chaque bien, les pastilles rappellent les
   correspondances exactes ; les biens déjà en favoris sont exclus.
   ================================================================== */

const PAGE_LIMIT = 8;

export function ClientRecommendations() {
  const { account } = useAuth();
  const visitor = useVisitor();

  const properties = useMemo(
    () => (account && visitor.ready ? selectRecommendations(account, visitor.favorites, visitor.searches, PAGE_LIMIT) : []),
    [account, visitor.favorites, visitor.ready, visitor.searches],
  );

  if (!account || !visitor.ready) {
    return (
      <>
        <ClientHero eyebrow="Sélection" title="Recommandations" description="Préparation de votre sélection…" />
        <p className="rounded-3xl border border-dashed border-border bg-card p-6 text-caption text-muted" role="status">
          Préparation de votre sélection…
        </p>
      </>
    );
  }

  return (
    <>
      <ClientHero
        eyebrow="Sélection"
        title="Recommandations"
        description="Des biens classés à partir de votre projet déclaré, de votre dernière recherche et de votre budget. Chaque correspondance est rappelée sous le bien — sans note ni score."
        stats={[{ icon: Compass, value: String(properties.length), label: properties.length === 1 ? "Bien proposé" : "Biens proposés" }]}
        actions={
          <>
            <Link href="/explorer" className={BUTTON_PRIMARY}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Ajuster ma recherche
            </Link>
            <Link href="/client/favoris" className={BUTTON_SECONDARY}>
              Mes favoris<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </>
        }
      />

      {properties.length === 0 ? (
        <EmptyPanel
          icon={Sparkles}
          title="Sélection épuisée"
          description="Tous les biens du catalogue sont déjà dans vos favoris : retirez-en un ou explorez les nouveautés pour recevoir de nouvelles propositions."
          action={<Link href="/explorer" className={BUTTON_PRIMARY}>Explorer les biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => {
            const reasons = recommendationReasons(property, account, visitor.searches);
            return (
              <article key={property.id} className="min-w-0">
                <PropertyCard property={property} layout="grid" />
                {reasons.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Pourquoi ce bien : ${property.title}`}>
                    {reasons.map((reason) => (
                      <li key={reason} className="inline-flex items-center gap-1 rounded-full border border-homera-terracotta/25 bg-homera-terracotta/[0.06] px-2.5 py-1 text-micro font-semibold text-homera-terracotta">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />{reason}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { takeResultsPage } from "@/lib/results-return";

/* ==================================================================
   HOMERA — RETOUR AUX RÉSULTATS
   ------------------------------------------------------------------
   Un visiteur qui a filtré, trié et feuilleté plusieurs écrans ne doit
   pas perdre ce travail après avoir ouvert une fiche.

   Le composant est d’abord un **lien** vers la page du projet : il est
   valide sans JavaScript, au survol, au clic du milieu et pour les
   moteurs de recherche. Au clic simple, s’il existe une page de
   résultats mémorisée dans la session (voir `lib/results-return.ts`),
   on y navigue explicitement : filtres, tri et pagination reviennent
   tels que le visiteur les avait laissés. Sinon (arrivée directe sur
   la fiche, stockage indisponible), le lien suit son repli naturel.

   Aucun état n’est deviné au rendu — le serveur ne connaît pas la page
   précédente — donc aucune étiquette n’est annoncée à tort : c’est
   « Retour », et le retour est réel dans les deux cas. On n’utilise ni
   le referrer (obsolète en navigation applicative) ni l’historique
   (dont le contenu précédent est imprévisible) : seule compte la
   dernière page de résultats explicitement mémorisée.
   ================================================================== */

export function BackToResults({ fallbackHref, label }: { fallbackHref: string; label: string }) {
  const router = useRouter();
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const stored = takeResultsPage();
    const current = `${window.location.pathname}${window.location.search}`;
    if (stored && stored !== current) {
      event.preventDefault();
      router.push(stored);
    }
  };

  return (
    <Link
      href={fallbackHref}
      onClick={onClick}
      aria-label={label}
      className="homera-press inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-caption font-semibold text-muted transition-colors hover:border-homera-terracotta hover:text-homera-terracotta"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Retour
    </Link>
  );
}

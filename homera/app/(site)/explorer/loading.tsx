/* ==================================================================
   SQUELETTE DE L’EXPLORATEUR
   ------------------------------------------------------------------
   L’explorateur assemble 36 fiches, leurs facettes et la carte des
   communes : le premier écran arrive donc avant les données, sous forme
   de squelette plutôt que de page vide.

   Ce fichier ne couvre **que** /explorer, volontairement. Un squelette
   posé sur tout le groupe (site) aurait une conséquence invisible mais
   réelle : Next.js envoie l’en-tête HTTP — donc le statut 200 — avant
   que la page ne réponde, et un `notFound()` rendu ensuite afficherait
   bien la page d’erreur… avec un statut 200. Les fiches de biens et les
   pages légales rendent donc un vrai 404.
   ================================================================== */

export default function SiteLoading() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Chargement de la page HOMERA"
    >
      <div className="homera-skeleton h-4 w-36 rounded-full" />
      <div className="mt-5 homera-skeleton h-11 w-full max-w-xl rounded-card" />
      <div className="mt-4 homera-skeleton h-5 w-full max-w-2xl rounded-xl" />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="homera-skeleton h-80 rounded-card" />
        <div className="homera-skeleton h-80 rounded-card" />
        <div className="homera-skeleton h-80 rounded-card" />
      </div>
    </div>
  );
}

/* ================================================================== HOMERA — SQUELETTE DE CARTE ------------------------------------------------------------------ Affiché pendant qu’une nouvelle page de résultats se met en place. Il reprend la géométrie exacte de la carte de bien (photo 16/10, titre, ligne de caractéristiques) pour que rien ne saute à l’arrivée du contenu réel. Purement décoratif : masqué aux technologies d’assistance, aucune information inventée. ================================================================== */ export function AssetPlaceholder({
  label,
}: {
  label?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-placeholder
      className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card"
    >
      {" "}
      <div className="homera-skeleton aspect-[16/10] w-full" />{" "}
      <div className="flex flex-1 flex-col gap-4 p-5">
        {" "}
        <span className="homera-skeleton h-3 w-2/5 rounded-full" />{" "}
        <span className="homera-skeleton h-5 w-4/5 rounded-full" />{" "}
        <span className="homera-skeleton h-4 w-1/3 rounded-full" />{" "}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          {" "}
          <span className="homera-skeleton h-4 w-24 rounded-full" />{" "}
          <span className="homera-skeleton h-4 w-16 rounded-full" />{" "}
        </div>{" "}
      </div>{" "}
      {label && (
        <p className="sr-only" role="status">
          {" "}
          {label}{" "}
        </p>
      )}{" "}
    </div>
  );
}

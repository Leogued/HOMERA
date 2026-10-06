import { createQrMatrix } from "@/lib/qr";

/* ================================================================== HOMERA — QR CODE ------------------------------------------------------------------ Rendu SVG d’un QR code à partir de `lib/qr.ts` (implémentation interne, aucune dépendance externe). Le composant est pur et sans état : le même arbre est produit côté serveur et côté navigateur, donc aucun risque d’erreur d’hydratation. Une marge de 4 modules (zone silencieuse) est incluse dans le `viewBox`, conformément à la norme, pour que le symbole reste lisible par un lecteur. ================================================================== */

const QUIET_ZONE = 4;

type QrCodeProps = {
  /** Contenu encodé (URL de vérification, référence…). */
  value: string;
  /** Largeur et hauteur rendues, en pixels. */
  size?: number;
  /** Nom accessible du symbole. */
  title: string;
  /** Classe appliquée au SVG (la couleur du tracé suit `currentColor`). */
  className?: string;
};

export function QrCode({ value, size = 128, title, className = "" }: QrCodeProps) {
  const matrix = createQrMatrix(value);

  let path = "";
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (matrix.modules[row][col]) path += `M${col} ${row}h1v1h-1z`;
    }
  }

  const box = matrix.size + QUIET_ZONE * 2;

  return (
    <svg
      role="img"
      aria-label={title}
      width={size}
      height={size}
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`}
      className={className}
      shapeRendering="crispEdges"
    >
      <title>{title}</title>
      <path d={path} fill="currentColor" />
    </svg>
  );
}

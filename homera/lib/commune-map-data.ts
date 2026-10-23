/**
 * Repères schématiques communs à la carte de l’explorateur et aux fiches.
 * Les coordonnées SVG expriment uniquement la position relative des communes
 * dans le corridor sud-béninois — ce ne sont pas des coordonnées de bien.
 */
export type CommuneMapNode = {
  name: string;
  axis: string;
  summary: string;
  x: number;
  y: number;
  labelAlign: "start" | "middle" | "end";
};

export const COMMUNE_MAP_NODES: CommuneMapNode[] = [
  {
    name: "Ouidah",
    axis: "Côte Ouest · Route des Pêches",
    summary: "Résidences côtières, villas de séjour et parcelles proches du littoral historique.",
    x: 108,
    y: 162,
    labelAlign: "middle",
  },
  {
    name: "Abomey-Calavi",
    axis: "Plateau Nord · Grand Nokoué",
    summary: "Pôle résidentiel en forte croissance : parcelles titrées, villas familiales et studios.",
    x: 286,
    y: 78,
    labelAlign: "middle",
  },
  {
    name: "Cotonou",
    axis: "Cœur économique · Littoral",
    summary: "Quartiers d’affaires et résidentiels prisés : Fidjrossè, Haie Vive, Ganhi, Cadjèhoun, Akpakpa.",
    x: 334,
    y: 158,
    labelAlign: "middle",
  },
  {
    name: "Porto-Novo",
    axis: "Est lagunaire · Capitale",
    summary: "Cadre résidentiel calme autour de la lagune : maisons familiales, terrains et locaux.",
    x: 498,
    y: 112,
    labelAlign: "middle",
  },
];

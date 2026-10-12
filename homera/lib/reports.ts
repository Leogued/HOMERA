/* ==================================================================
   HOMERA — MOTIFS DE SIGNALEMENT
   ------------------------------------------------------------------
   Une seule liste, partagée par le formulaire public, la validation
   serveur et l’affichage admin. Si un motif n’est pas ici, il n’est
   accepté nulle part : le serveur refuse une requête forgée à la main
   exactement comme il refuse un envoi depuis le navigateur.
   ================================================================== */

export const REPORT_REASONS = [
  { value: "prix-abusif", label: "Prix manifestement faux ou abusif" },
  { value: "photos-mensongeres", label: "Photos qui ne correspondent pas au bien" },
  { value: "bien-inexistant", label: "Le bien n’existe pas à l’adresse indiquée" },
  { value: "mandat-non-autorise", label: "Intermédiaire sans mandat" },
  { value: "coordonnees-fausses", label: "Coordonnées de contact erronées" },
  { value: "contenu-inapproprie", label: "Contenu inapproprié" },
  { value: "autre", label: "Autre motif" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((entry) => entry.value) as [ReportReason, ...ReportReason[]];

/** Libellé lisible d’un motif ; tolère une valeur inconnue (ancien signalement). */
export function reportReasonLabel(value: string): string {
  return REPORT_REASONS.find((entry) => entry.value === value)?.label ?? value;
}

/* ==================================================================
   HOMERA — Pastilles de l'espace client
   ------------------------------------------------------------------
   Définitions uniques, partagées par la barre latérale (WorkspaceShell)
   et les cartes du tableau de bord : les deux affichent toujours les
   mêmes nombres, calculés depuis les mêmes API.
   ================================================================== */

/** Visites qui comptent comme « à venir » : créneau futur, dossier vivant. */
export const LIVE_VISIT_STATUSES: readonly string[] = [
  "demandee",
  "en-attente",
  "confirmee",
  "reprogrammee",
];

/** Demandes qui comptent comme « actives » : envoyées, pas encore closes. */
export const ACTIVE_APPLICATION_STATUSES: readonly string[] = ["envoyee", "en-cours"];

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isUpcomingVisit(visit: { date: string; status: string }, today: string): boolean {
  return visit.date >= today && LIVE_VISIT_STATUSES.includes(visit.status);
}

export function isActiveApplication(application: { status: string }): boolean {
  return ACTIVE_APPLICATION_STATUSES.includes(application.status);
}

export function countUpcomingVisits(
  visits: { date: string; status: string }[],
  today: string = todayISO(),
): number {
  return visits.filter((visit) => isUpcomingVisit(visit, today)).length;
}

export function countActiveApplications(applications: { status: string }[]): number {
  return applications.filter(isActiveApplication).length;
}

export function countUnreadMessages(conversations: { unreadCount: number }[]): number {
  return conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0);
}

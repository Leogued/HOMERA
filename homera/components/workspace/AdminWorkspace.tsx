"use client";

import {
  AdminDocuments,
  AdminOverviewDashboard,
  AdminPropertiesTable,
  AdminReportsTable,
  AdminStatistics,
  AdminUsersTable,
  AdminVerificationQueue,
  AdminVisitsTable,
} from "@/components/workspace/AdminServerSections";
import { ApplicationsList as ServerApplicationsList } from "@/components/workspace/ApplicationSections";

/* ==================================================================
   HOMERA — ESPACE D’ADMINISTRATION
   ------------------------------------------------------------------
   Chaque section lit le serveur. Les chiffres sont comptés en base,
   les décisions sont écrites en base, et les droits sont vérifiés côté
   serveur : retirer un bouton de l’écran ne suffirait pas à protéger
   quoi que ce soit.
   ================================================================== */

export function AdminWorkspace({ section }: { section: string }) {
  switch (section) {
    case "verifications": return <AdminVerificationQueue />;
    case "utilisateurs": return <AdminUsersTable />;
    case "proprietaires": return <AdminUsersTable role="proprietaire" />;
    case "agents": return <AdminUsersTable role="agent" />;
    case "biens": return <AdminPropertiesTable />;
    case "visites": return <AdminVisitsTable />;
    case "demandes": return <AdminApplications />;
    case "signalements": return <AdminReportsTable />;
    case "documents": return <AdminDocuments />;
    case "statistiques": return <AdminStatistics />;
    case "dashboard": return <AdminOverviewDashboard />;
    default: return <AdminOverviewDashboard />;
  }
}

/** Vue « demandes » de l’administration : toutes les candidatures, en lecture et en arbitrage. */
function AdminApplications() {
  return <ServerApplicationsList viewpoint="agent" title="Candidatures de location" description="Toutes les candidatures déposées sur la plateforme. L’administration peut instruire n’importe quel dossier : le serveur le lui permet, le motif reste obligatoire pour un refus." />;
}

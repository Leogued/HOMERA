import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { NotificationsPage } from "@/components/workspace/CommunicationPages";
export const metadata: Metadata = { title: "Notifications — HOMERA", robots: { index: false, follow: false } };
export default function NotificationsRoute() {
  return <WorkspaceShell role="any" section="notifications"><NotificationsPage /></WorkspaceShell>;
}

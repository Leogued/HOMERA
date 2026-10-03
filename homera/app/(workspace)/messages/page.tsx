import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { MessagesPage } from "@/components/workspace/CommunicationPages";
export const metadata: Metadata = { title: "Messages — HOMERA", robots: { index: false, follow: false } };
export default function MessagesRoute() {
  return <WorkspaceShell role="any" section="messages"><MessagesPage /></WorkspaceShell>;
}

import type { ReactNode } from "react";
import { WorkspaceFooter } from "@/components/workspace/WorkspaceFooter";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <><a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-btn focus:bg-homera-brown focus:px-4 focus:py-3 focus:text-white">Aller au contenu</a><div id="contenu" tabIndex={-1}>{children}</div><WorkspaceFooter /></>;
}

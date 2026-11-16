"use client";

import { usePathname } from "next/navigation";
import { Suspense, useState, type CSSProperties, type ReactNode } from "react";
import { GlobalBar, type ShellUser } from "@/components/shell/global-bar";
import { NavSidebar } from "@/components/shell/nav-sidebar";
import { SearchDialog, useSearchDialog } from "@/components/shell/search-dialog";
import { Topbar } from "@/components/shell/topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ToastProvider } from "@/components/ui/toast";

/**
 * The chassis, as Company OS builds it: a full-width bar, a rail beneath it,
 * and the pane the page scrolls on. The body (rail + pane) is one sheet that
 * turns a corner where it meets the bar.
 *
 * The system editor is the one route that pins the rail to its icon form,
 * because the canvas needs the horizontal room.
 */
export function ClientAppShell({
  user,
  workspaceLabel,
  plan,
  isAdmin,
  children
}: {
  user: ShellUser;
  workspaceLabel: string;
  plan: string;
  isAdmin: boolean;
  children: ReactNode;
}): ReactNode {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const search = useSearchDialog();
  // Only the editor itself (/systems/[id]) needs the canvas width; its sub-pages keep the full rail.
  const compact = /^\/systems\/[^/]+\/?$/.test(pathname);

  return (
    <ToastProvider>
      <SidebarProvider
        open={compact ? false : open}
        onOpenChange={setOpen}
        className="flex-col bg-bar"
        style={{ "--sidebar-width": "var(--nav-w)" } as CSSProperties}
      >
        <a
          href="#main"
          className="t-caption-medium focus-ring-canvas sr-only rounded-8 border border-strong bg-raised px-4 text-ink outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:inline-flex focus:h-9 focus:items-center"
        >
          Skip to content
        </a>
        <GlobalBar user={user} workspaceLabel={workspaceLabel} plan={plan} onOpenSearch={search.open} />

        <div className="app-body flex min-h-0 w-full flex-1 overflow-hidden rounded-t-[var(--body-radius)] bg-canvas">
          <NavSidebar isAdmin={isAdmin} />
          <div className="workspace-canvas flex min-w-0 flex-1 flex-col overflow-y-auto bg-canvas">
            <Suspense fallback={<div className="h-[36px] shrink-0" />}>
              <Topbar />
            </Suspense>
            <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
              {children}
            </main>
          </div>
        </div>

        <SearchDialog controller={search} isAdmin={isAdmin} />
      </SidebarProvider>
    </ToastProvider>
  );
}

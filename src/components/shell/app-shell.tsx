"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import {
  NavRail,
  NavSidebar,
  type ShellUser,
} from "@/components/shell/nav-sidebar";
import {
  SearchDialog,
  useSearchDialog,
} from "@/components/shell/search-dialog";
import { Topbar } from "@/components/shell/topbar";
import { ToastProvider } from "@/components/ui/toast";
import { CelebrationCard, IntroCard } from "@/components/shell/intro";
import { OnboardingProvider } from "@/lib/onboarding";

export type { ShellUser };

const SIDEBAR_KEY = "pipes.sidebar";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "collapsed";
  } catch {
    return false;
  }
}

/**
 * Podium's chassis: two panels floating on the canvas, 6px apart. The sidebar
 * on the left (or its 56px rail when collapsed) and the main panel on the
 * right, each with 14px corners and a hairline. On phones both go edge to
 * edge and the sidebar becomes a drawer.
 *
 * The workflow editor starts on the rail, because the canvas needs the room.
 */
export function ClientAppShell({
  user,
  workspaceLabel,
  plan,
  isAdmin,
  children,
}: {
  user: ShellUser;
  workspaceLabel: string;
  plan: string;
  isAdmin: boolean;
  children: ReactNode;
}): ReactNode {
  const pathname = usePathname();
  const search = useSearchDialog();
  const editor = /^\/systems\/[^/]+\/?$/.test(pathname);
  const [collapsedPref, setCollapsedPref] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setCollapsedPref(readCollapsed()), []);
  useEffect(() => setDrawer(false), [pathname]);

  const setCollapsed = (next: boolean) => {
    setCollapsedPref(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "open");
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  };
  const collapsed = (editor || collapsedPref) && !drawer;

  return (
    <ToastProvider>
      <OnboardingProvider>
        <a
          href="#main"
          className="sr-only rounded-full bg-card px-4 text-[13px] font-medium text-foreground shadow-float outline-none focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:inline-flex focus:h-9 focus:items-center"
        >
          Skip to content
        </a>
        <div className="flex h-dvh gap-1.5 overflow-hidden bg-canvas p-1.5 max-md:gap-0 max-md:p-0">
          {collapsed ? (
            <NavRail
              workspaceLabel={workspaceLabel}
              isAdmin={isAdmin}
              onExpand={() => setCollapsed(false)}
              onSearch={search.open}
            />
          ) : null}
          {/* Collapsed on desktop still needs the drawer on phones, so the full sidebar renders whenever the drawer is open. */}
          {!collapsed || drawer ? (
            <NavSidebar
              user={user}
              workspaceLabel={workspaceLabel}
              plan={plan}
              isAdmin={isAdmin}
              onSearch={search.open}
              onCollapse={() => setCollapsed(true)}
              drawerOpen={drawer}
              onCloseDrawer={() => setDrawer(false)}
            />
          ) : null}
          <div className="workspace-canvas flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-border bg-background max-md:rounded-none max-md:border-0">
            <Suspense
              fallback={
                <div className="h-[50px] shrink-0 border-b border-border" />
              }
            >
              <Topbar onMenu={() => setDrawer(true)} onSearch={search.open} />
            </Suspense>
            <main
              id="main"
              tabIndex={-1}
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto outline-none"
            >
              {children}
            </main>
          </div>
        </div>
        <SearchDialog controller={search} isAdmin={isAdmin} />
        <IntroCard />
        <CelebrationCard workspaceLabel={workspaceLabel} />
      </OnboardingProvider>
    </ToastProvider>
  );
}

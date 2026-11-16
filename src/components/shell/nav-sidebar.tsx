"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { NavIcons, PanelLeft } from "@/components/ui/icon";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { FOOTER_ITEMS, isActive, navGroupsFor, type NavItem } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

/**
 * The rail, drawn exactly as Company OS draws it: 240px on `--surface-rail`,
 * starting under the bar, filled icons in navigation and nowhere else, and the
 * active row marked by fill and weight (never an accent bar).
 */
export function NavSidebar({ isAdmin }: { isAdmin: boolean }): ReactNode {
  const pathname = usePathname();
  const groups = navGroupsFor(isAdmin);
  const approvals = useApprovalsCount();
  const counts: Record<NonNullable<NavItem["count"]>, number> = { approvals };

  return (
    <Sidebar label="Pipes navigation">
      <NavIcons>
        <SidebarContent className="gap-2 ps-3 pe-5 pb-3 pt-2">
          {groups.map((group, index) => (
            <SidebarGroup key={group.label ?? `group-${index}`}>
              {group.label ? <SidebarGroupLabel className="ps-1.5 pe-0">{group.label}</SidebarGroupLabel> : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <NavRow key={item.href} item={item} pathname={pathname} count={item.count ? counts[item.count] : undefined} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="ps-3 pe-5 pb-2 pt-1.5">
          <SidebarMenu>
            {FOOTER_ITEMS.map((item) => (
              <NavRow key={item.href} item={item} pathname={pathname} />
            ))}
            <CollapseRow />
          </SidebarMenu>
        </SidebarFooter>
      </NavIcons>
    </Sidebar>
  );
}

const APPROVALS_POLL_MS = 30_000;

/**
 * Runs waiting for a person to approve a step, polled every 30 seconds and
 * again when the tab comes back into view. A failed read keeps the last count
 * rather than flashing to zero.
 */
function useApprovalsCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let live = true;
    const read = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/api/runs?status=waiting_approval")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (live && json?.ok && Array.isArray(json.data)) setCount(json.data.length);
        })
        .catch(() => undefined);
    };
    read();
    const timer = window.setInterval(read, APPROVALS_POLL_MS);
    document.addEventListener("visibilitychange", read);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", read);
    };
  }, []);
  return count;
}

function NavRow({ item, pathname, count }: { item: NavItem; pathname: string; count?: number }): ReactNode {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={count ? `${item.label}, ${count} waiting` : item.label}>
        <Link href={item.href} aria-current={active ? "page" : undefined}>
          <Icon strokeWidth={1.5} className={cn("shrink-0", active ? "text-ink" : "text-ink-3")} />
          <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
          {count ? (
            <span className="t-mono-micro shrink-0 tabular text-ink-3 group-data-[collapsible=icon]:hidden">
              <span className="sr-only">, </span>
              {count > 99 ? "99+" : count}
              <span className="sr-only"> waiting</span>
            </span>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapseRow(): ReactNode {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={toggleSidebar}
        tooltip={collapsed ? "Expand sidebar" : undefined}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={collapsed ? "cursor-e-resize" : "cursor-w-resize"}
      >
        <PanelLeft strokeWidth={1.5} />
        <span>Collapse</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

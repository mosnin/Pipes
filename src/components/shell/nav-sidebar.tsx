"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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

  return (
    <Sidebar label="Pipes navigation">
      <NavIcons>
        <SidebarContent className="gap-4 ps-5 pe-7 pb-5 pt-4">
          {groups.map((group, index) => (
            <SidebarGroup key={group.label ?? `group-${index}`}>
              {group.label ? <SidebarGroupLabel className="ps-3 pe-0">{group.label}</SidebarGroupLabel> : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <NavRow key={item.href} item={item} pathname={pathname} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="ps-5 pe-7 pb-4 pt-3">
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

function NavRow({ item, pathname }: { item: NavItem; pathname: string }): ReactNode {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link href={item.href} aria-current={active ? "page" : undefined}>
          <Icon strokeWidth={1.5} className={cn("shrink-0", active ? "text-ink" : "text-ink-3")} />
          <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
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

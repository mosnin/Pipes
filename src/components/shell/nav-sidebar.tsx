"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { HookList } from "@/components/rare/hook-sidebar";
import { Avatar } from "@/components/ledger/author-stamp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Contrast, CreditCard, LogOut, PanelLeft, Search, UserRound, Users } from "@/components/ui/icon";
import { FOOTER_ITEMS, isActive, navGroupsFor, type NavItem } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

export interface ShellUser {
  name: string;
  email: string;
}

interface SidebarProps {
  user: ShellUser;
  workspaceLabel: string;
  plan: string;
  isAdmin: boolean;
  onSearch: () => void;
}

/** A stable hue from a string, so a workspace keeps its colour everywhere. */
export function hueOf(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** Podium's workspace logo: the one rounded square in the chassis, a gradient from the name. */
export function WorkspaceLogo({ name, size = 18 }: { name: string; size?: number }): ReactNode {
  const h = hueOf(name);
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center font-semibold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        fontSize: size * 0.46,
        background: `linear-gradient(150deg, hsl(${h} 70% 58%), hsl(${(h + 40) % 360} 72% 46%))`,
        boxShadow: "inset 0 0 0 0.5px rgb(0 0 0 / 0.12), inset 0 1px 0 rgb(255 255 255 / 0.25)"
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Sidebar rows, measured from Podium: 30px on a 32px pitch, 13px medium, 15px icons, a soft fill when current. */
const rowBase =
  "press group flex h-[30px] w-full items-center gap-[9px] rounded-lg px-[9px] text-left text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent/50";
const rowCls = (active: boolean) =>
  cn(rowBase, active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground");
const iconCls = "size-[15px] shrink-0 stroke-[1.7]";

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
    <Link href={item.href} aria-current={active ? "page" : undefined} className={rowCls(active)}>
      <Icon className={iconCls} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count ? (
        <span className="tabular text-xs text-muted-foreground">
          <span className="sr-only">, </span>
          {count > 99 ? "99+" : count}
          <span className="sr-only"> waiting</span>
        </span>
      ) : null}
    </Link>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }): ReactNode {
  return (
    <section className={title ? "mt-[22px]" : undefined}>
      {title ? (
        <div className="mb-[5px] flex h-5 items-center pl-[9px]">
          <h2 className="text-[13px] font-normal text-muted-foreground">{title}</h2>
        </div>
      ) : null}
      {/* Titled sections get the hook rail, tying each row to its section; the top group stays plain, as in Podium. */}
      {title ? <HookList className="space-y-[2px]">{children}</HookList> : <div className="space-y-[2px]">{children}</div>}
    </section>
  );
}

const subscribeNothing = (): (() => void) => () => {};

function ThemeButton({ className }: { className?: string }): ReactNode {
  const { resolvedTheme, setTheme } = useTheme();
  // The server cannot know the theme, so the label settles after mount.
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title="Toggle theme"
      className={cn("press flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground", className)}
    >
      <Contrast className="size-[16px]" strokeWidth={1.7} />
    </button>
  );
}

/** The workspace switcher: logo, name, chevrons; the menu holds the account and sign out. */
function WorkspaceMenu({ user, workspaceLabel, plan, children }: { user: ShellUser; workspaceLabel: string; plan: string; children: ReactNode }): ReactNode {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[232px]">
        <div className="flex items-center gap-2 px-2 pb-2 pt-1">
          <span className="flex size-6 shrink-0 overflow-hidden rounded-full">
            <Avatar label={user.name} kind="human" imageUrl={null} size={24} />
          </span>
          <div className="min-w-0 text-xs">
            <div className="truncate font-medium text-foreground">{user.name}</div>
            <div className="truncate text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-2.5 px-2 py-1.5 text-[13px]">
          <WorkspaceLogo name={workspaceLabel} />
          <span className="min-w-0 flex-1 truncate">{workspaceLabel}</span>
          <span className="text-xs text-muted-foreground">{plan}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/account">
            <UserRound />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/collaboration">
            <Users />
            Invite members
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing">
            <CreditCard />
            Billing and usage
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/api/auth/logout">
            <LogOut />
            Sign out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Podium's sidebar: a 256px panel floating on the canvas. On phones it becomes a drawer. */
export function NavSidebar({
  user,
  workspaceLabel,
  plan,
  isAdmin,
  onSearch,
  onCollapse,
  drawerOpen,
  onCloseDrawer
}: SidebarProps & { onCollapse: () => void; drawerOpen: boolean; onCloseDrawer: () => void }): ReactNode {
  const pathname = usePathname();
  const approvals = useApprovalsCount();
  const counts: Record<NonNullable<NavItem["count"]>, number> = { approvals };

  return (
    <>
      {drawerOpen ? (
        <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden" onClick={onCloseDrawer} />
      ) : null}
      <aside
        aria-label="Sidebar"
        className={cn(
          "flex w-[256px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-border bg-sidebar pt-[15px]",
          drawerOpen
            ? "max-md:fixed max-md:inset-y-2 max-md:left-2 max-md:z-40 max-md:shadow-float max-md:[animation:t-enter_350ms_var(--ease-drawer)_both]"
            : "max-md:hidden"
        )}
      >
        <div className="relative flex h-[22px] items-center gap-1 pl-[14px] pr-[10px]">
          <WorkspaceMenu user={user} workspaceLabel={workspaceLabel} plan={plan}>
            <button type="button" className="press -ml-1 flex min-w-0 items-center gap-[7px] rounded-lg px-1 py-0.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-accent/50">
              <WorkspaceLogo name={workspaceLabel} />
              <span className="truncate text-[14px] font-semibold tracking-[-0.01em]">{workspaceLabel}</span>
              <ChevronsUpDown className="size-[13px] shrink-0 text-muted-foreground" strokeWidth={1.8} />
            </button>
          </WorkspaceMenu>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={onSearch}
              aria-label="Search (⌘K)"
              title="Search  ⌘K"
              className="press flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Search className="size-[15px]" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="press flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground max-md:hidden"
            >
              <PanelLeft className="size-[15px]" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <nav aria-label="Pipes" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-5">
          {navGroupsFor(isAdmin).map((group, index) => (
            <Section key={group.label ?? `group-${index}`} title={group.label}>
              {group.items.map((item) => (
                <NavRow key={item.href} item={item} pathname={pathname} count={item.count ? counts[item.count] : undefined} />
              ))}
            </Section>
          ))}
        </nav>

        <div className="flex items-center gap-0.5 px-3 pb-[14px] pt-1">
          {FOOTER_ITEMS.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press flex h-7 items-center rounded-lg px-[9px] text-[13px] font-medium",
                  active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeButton className="ml-auto" />
        </div>
      </aside>
    </>
  );
}

/** The sidebar folded to a 56px rail of icons. The editor starts here, for canvas room. */
export function NavRail({ workspaceLabel, isAdmin, onExpand, onSearch }: { workspaceLabel: string; isAdmin: boolean; onExpand: () => void; onSearch: () => void }): ReactNode {
  const pathname = usePathname();
  const railCls = (active: boolean) =>
    cn(
      "press flex size-[30px] shrink-0 items-center justify-center rounded-lg",
      active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
    );
  const groups = navGroupsFor(isAdmin);
  return (
    <nav aria-label="Sidebar" className="flex w-[56px] shrink-0 flex-col items-center gap-[2px] overflow-y-auto rounded-[14px] border border-border bg-sidebar py-[18px] max-md:hidden">
      <button type="button" onClick={onExpand} className="press group relative mb-2 flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted" aria-label="Expand sidebar" title="Expand sidebar">
        <span className="group-hover:hidden">
          <WorkspaceLogo name={workspaceLabel} size={22} />
        </span>
        <PanelLeft className="hidden size-[17px] text-muted-foreground group-hover:block" />
      </button>
      <button type="button" onClick={onSearch} className={railCls(false)} title="Search" aria-label="Search">
        <Search className={iconCls} />
      </button>
      {groups.map((group, index) => (
        <div key={group.label ?? index} className="flex flex-col items-center gap-[2px]">
          <div className="my-1 h-px w-6 bg-border" />
          {group.items.map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={railCls(active)} title={item.label} aria-label={item.label}>
                <Icon className={iconCls} />
              </Link>
            );
          })}
        </div>
      ))}
      <ThemeButton className="mt-auto size-[30px] shrink-0" />
    </nav>
  );
}

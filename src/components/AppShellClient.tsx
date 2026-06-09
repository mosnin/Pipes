"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Bell,
  LogOut,
  HelpCircle,
} from "lucide-react";
import {
  Breadcrumbs,
  SearchInput,
  Tooltip,
  StatusBadge,
} from "@/components/ui";
import { ThemeToggle } from "./ThemeToggle";
import { PrimaryNavLinks, BottomNavLinks, usePageLabel } from "./NavLinks";
import {
  CommandPalette,
  type CommandItem,
} from "@/components/editor/CommandPalette";
import { KeyboardShortcutsOverlay } from "@/components/editor/KeyboardShortcutsOverlay";
import { register } from "@/lib/keyboard/registry";

const COLLAPSE_KEY = "pipes-sidebar-collapsed";

export type AppShellClientProps = {
  user: {
    name: string;
    email: string;
    initials: string;
  };
  workspace: {
    id: string;
    name: string;
    plan: string;
    role: string;
  };
  showAdmin: boolean;
  children: React.ReactNode;
};

export function AppShellClient({
  user,
  workspace,
  showAdmin,
  children,
}: AppShellClientProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const pageLabel = usePageLabel();
  const router = useRouter();

  useEffect(() => {
    try {
      const v = localStorage.getItem(COLLAPSE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // noop
    }
  }, [collapsed]);

  // Register the global Cmd/Ctrl-K shortcut. The keyboard registry mounts a
  // single keydown listener on window; this component just publishes the
  // shortcut entry. Same for `?` to open the shortcuts overlay.
  useEffect(() => {
    const offPalette = register({
      id: "global.command-palette",
      combo: "mod+k",
      label: "Open command palette",
      group: "global",
      scope: "global",
      handler: () => setPaletteOpen(true),
    });
    const offShortcuts = register({
      id: "global.shortcuts",
      combo: "?",
      label: "Show keyboard shortcuts",
      group: "global",
      scope: "global",
      handler: () => setShortcutsOpen((v) => !v),
    });
    return () => {
      offPalette();
      offShortcuts();
    };
  }, []);

  const sidebarWidth = collapsed ? "w-[56px]" : "w-[248px]";

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Skip-to-content link for keyboard / AT users (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:text-[#111] focus:px-3 focus:py-1.5 focus:rounded-md focus:shadow-md focus:ring-2 focus:ring-indigo-500"
      >
        Skip to content
      </a>
      {/* -- Sidebar -- */}
      <aside
        aria-label="Primary navigation"
        className={[
          "flex flex-col shrink-0 h-full surface-muted border-r border-black/[0.06]",
          "transition-[width] duration-150 ease-out",
          sidebarWidth,
        ].join(" ")}
      >
        {/* Brand + workspace switcher */}
        <div
          className={[
            "shrink-0 border-b border-black/[0.06]",
            collapsed ? "px-2 py-3" : "px-3 py-3",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center min-w-0 flex-1 px-1"
              aria-label="Pipes home"
            >
              <span className="t-title font-bold tracking-[-0.04em] text-[#111] truncate">
                {collapsed ? "P" : "Pipes"}
              </span>
            </Link>
            {!collapsed && (
              <Tooltip content="Collapse sidebar" side="bottom">
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  aria-label="Collapse sidebar"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-black/[0.04] hover:text-[#111] transition-colors"
                >
                  <ChevronsLeft size={14} />
                </button>
              </Tooltip>
            )}
          </div>

          {!collapsed && (
            <button
              type="button"
              className="mt-3 w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/70 transition-colors text-left"
              aria-label="Switch workspace"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-black/[0.08] text-[10px] font-bold text-[#3C3C43] shrink-0">
                {workspace.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block t-label font-semibold text-[#111] truncate leading-tight">
                  {workspace.name}
                </span>
                <span className="block t-micro text-[#8E8E93] truncate leading-tight">
                  {workspace.role} . {workspace.plan}
                </span>
              </span>
              <ChevronDown size={12} className="text-[#8E8E93] shrink-0" />
            </button>
          )}

          {collapsed && (
            <div className="mt-2 flex justify-center">
              <Tooltip content="Expand sidebar" side="right">
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  aria-label="Expand sidebar"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-black/[0.04] hover:text-[#111] transition-colors"
                >
                  <ChevronsRight size={14} />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Primary nav */}
        <nav
          className={[
            "flex-1 overflow-y-auto",
            collapsed ? "px-1.5 py-2" : "px-2 py-2",
          ].join(" ")}
          aria-label="Primary"
        >
          <PrimaryNavLinks collapsed={collapsed} />
        </nav>

        {/* Bottom: operate nav + user card */}
        <div
          className={[
            "shrink-0 border-t border-black/[0.06]",
            collapsed ? "px-1.5 py-2" : "px-2 py-2",
          ].join(" ")}
        >
          <BottomNavLinks showAdmin={showAdmin} collapsed={collapsed} />

          <div className="my-2 h-px bg-black/[0.06] mx-1" />

          {/* User card */}
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <Tooltip content={`${user.name} (${workspace.plan})`} side="right">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
                  {user.initials}
                </span>
              </Tooltip>
              <ThemeToggle />
              <Tooltip content="Log out" side="right">
                <Link
                  href="/api/auth/logout"
                  aria-label="Log out"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut size={14} />
                </Link>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-md">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
                {user.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="t-label font-semibold text-[#111] truncate leading-tight">
                  {user.name}
                </p>
                <p className="t-micro text-[#8E8E93] truncate leading-tight">
                  {workspace.plan}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <ThemeToggle />
                <Tooltip content="Log out">
                  <Link
                    href="/api/auth/logout"
                    aria-label="Log out"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={14} />
                  </Link>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* -- Main column -- */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex items-center h-12 px-4 gap-4 border-b border-black/[0.08] bg-white/85 backdrop-blur-md"
          aria-label="Top bar"
        >
          {/* Left: breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Breadcrumbs
              items={[
                { label: workspace.name, href: "/dashboard" },
                { label: pageLabel },
              ]}
            />
          </div>

          {/* Center: search input acts as a trigger for the command palette. */}
          <div
            className="hidden md:flex items-center w-full max-w-[420px] shrink"
            onClickCapture={(e) => {
              e.preventDefault();
              setPaletteOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setPaletteOpen(true);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Open command palette"
          >
            <SearchInputWithId
              value={search}
              onChange={setSearch}
              placeholder="Search or run commands..."
            />
          </div>

          {/* Right: status + bell + avatar */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex">
              <StatusBadge tone="success" pulse>
                All systems operational
              </StatusBadge>
            </div>
            <Tooltip content="Help & docs">
              <Link
                href="/docs"
                aria-label="Help"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-black/[0.04] hover:text-[#111] transition-colors"
              >
                <HelpCircle size={14} />
              </Link>
            </Tooltip>
            <Tooltip content="Notifications">
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-black/[0.04] hover:text-[#111] transition-colors"
              >
                <Bell size={14} />
                <span
                  aria-hidden
                  className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-600"
                />
              </button>
            </Tooltip>
            <Tooltip content={user.name}>
              <Link
                href="/settings/billing"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-semibold"
                aria-label="Account"
              >
                {user.initials}
              </Link>
            </Tooltip>
          </div>
        </header>

        {/* Scrollable content */}
        <main id="main" className="flex-1 overflow-y-auto bg-white">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={useGlobalPaletteItems({
          showAdmin,
          go: (href) => router.push(href),
          openShortcuts: () => setShortcutsOpen(true),
          toggleTheme: () => {
            // Reuse ThemeToggle behavior inline so we don't depend on its
            // internal state. The single source of truth is the data attr +
            // localStorage key.
            const root = document.documentElement;
            const cur = root.getAttribute("data-color-scheme") ?? "light";
            const next = cur === "dark" ? "light" : "dark";
            root.setAttribute("data-color-scheme", next);
            try {
              localStorage.setItem("pipes-theme", next);
            } catch {
              // ignore
            }
          },
        })}
      />
      <KeyboardShortcutsOverlay
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}

function useGlobalPaletteItems(opts: {
  showAdmin: boolean;
  go: (href: string) => void;
  openShortcuts: () => void;
  toggleTheme: () => void;
}): CommandItem[] {
  const { showAdmin, go, openShortcuts, toggleTheme } = opts;
  return useMemo(() => {
    const items: CommandItem[] = [
      {
        id: "act.new-system",
        label: "New system",
        section: "actions",
        aliases: ["create", "blank"],
        run: () => go("/systems/new"),
      },
      {
        id: "act.run-validation",
        label: "Run validation",
        section: "actions",
        aliases: ["check", "verify"],
        run: () => go("/systems"),
      },
      {
        id: "act.toggle-theme",
        label: "Toggle theme",
        section: "actions",
        aliases: ["dark", "light"],
        run: toggleTheme,
      },
      {
        id: "act.sign-out",
        label: "Sign out",
        section: "actions",
        aliases: ["log out", "logout"],
        run: () => go("/api/auth/logout"),
      },
      {
        id: "nav.systems",
        label: "Systems",
        section: "navigation",
        run: () => go("/systems"),
      },
      {
        id: "nav.templates",
        label: "Templates",
        section: "navigation",
        run: () => go("/templates"),
      },
      {
        id: "nav.docs",
        label: "Documentation",
        section: "navigation",
        run: () => go("/docs"),
      },
      {
        id: "nav.settings",
        label: "Settings",
        section: "navigation",
        run: () => go("/settings"),
      },
      {
        id: "help.shortcuts",
        label: "Keyboard shortcuts",
        section: "help",
        combo: "?",
        run: openShortcuts,
      },
      {
        id: "help.docs",
        label: "Documentation",
        section: "help",
        run: () => go("/docs"),
      },
    ];
    if (showAdmin) {
      items.push({
        id: "nav.admin",
        label: "Admin",
        section: "navigation",
        run: () => go("/admin"),
      });
    }
    return items;
  }, [showAdmin, go, openShortcuts, toggleTheme]);
}

// Local wrapper around SearchInput to attach a fixed id for the global Cmd-K shortcut.
function SearchInputWithId({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  useEffect(() => {
    // The SearchInput primitive renders an <input type="search"> as the only such
    // input within its parent; attach a stable id so the keyboard shortcut can focus it.
    const root = document.querySelector(
      "header[aria-label=\"Top bar\"] input[type=search]",
    );
    if (root != null) {
      root.setAttribute("id", "global-search-input");
    }
  }, []);
  return (
    <SearchInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      kbd="Cmd+K"
    />
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, LayoutDashboard, Menu, Search } from "@/components/ui/icon";
import { findNavItem } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
  /** Set in mono: an identifier rather than a name. */
  mono?: boolean;
}

/** Sub-pages of a workflow that get a named crumb rather than a deslugified segment. */
const SYSTEM_SECTIONS: Record<string, string> = { runs: "Runs", triggers: "Triggers", handoff: "Handoff" };

function deslugify(slug: string): string {
  const words = slug.replace(/[-_]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Workflow names already read this session, shown at once while the current name is read again. */
const workflowNames = new Map<string, string>();

/** The workflow's name for the crumb; `null` until it loads (or if it cannot), when the id stands in. */
function useWorkflowName(systemId: string | undefined): string | null {
  const [name, setName] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (!systemId) return;
    let live = true;
    fetch(`/api/search/workflows/${encodeURIComponent(systemId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!live || !json?.ok || typeof json.data?.name !== "string") return;
        workflowNames.set(systemId, json.data.name);
        setName({ id: systemId, name: json.data.name });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [systemId]);
  if (!systemId) return null;
  return (name?.id === systemId ? name.name : null) ?? workflowNames.get(systemId) ?? null;
}

/** Podium's slim page bar: a 50px strip with the section icon and the breadcrumb as its title. */
export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }): ReactNode {
  const pathname = usePathname();
  const match = findNavItem(pathname);
  const systemId = pathname.startsWith("/systems/") ? pathname.split("/").filter(Boolean)[1] : undefined;
  const workflowName = useWorkflowName(systemId);
  const crumbs: Crumb[] = [];
  let Icon = LayoutDashboard;

  if (pathname.startsWith("/systems/")) {
    const segments = pathname.split("/").filter(Boolean);
    crumbs.push({ label: "Workflows", href: "/dashboard" });
    crumbs.push(
      workflowName
        ? { label: workflowName, href: `/systems/${segments[1]}` }
        : { label: segments[1] ?? "Workflow", href: `/systems/${segments[1]}`, mono: true }
    );
    if (segments[2]) crumbs.push({ label: SYSTEM_SECTIONS[segments[2]] ?? deslugify(segments[2]) });
    Icon = findNavItem("/dashboard")?.item.icon ?? Icon;
  } else if (pathname.startsWith("/runs/") && match) {
    // A single run: Runs, then the run's id, which is an identifier and set in mono.
    const runId = pathname.split("/").filter(Boolean)[1];
    Icon = match.item.icon;
    crumbs.push({ label: match.item.label, href: match.item.href });
    if (runId) crumbs.push({ label: decodeURIComponent(runId), mono: true });
  } else if (match) {
    Icon = match.item.icon;
    if (match.group) crumbs.push({ label: match.group });
    crumbs.push({ label: match.item.label, href: match.item.href });
  } else {
    crumbs.push({ label: deslugify(pathname.split("/").filter(Boolean).pop() ?? "Home") });
  }

  return (
    <header className="workspace-topbar flex h-[50px] shrink-0 items-center gap-2.5 border-b border-border px-3 md:px-5">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="press -ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
      >
        <Menu className="size-[18px]" />
      </button>
      <span aria-hidden="true" className="hidden shrink-0 text-muted-foreground md:flex">
        <Icon className="size-[16px]" strokeWidth={1.6} />
      </span>
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${index}`} className={cn("flex min-w-0 items-center", !isLast && "hidden sm:flex")}>
                {index > 0 ? <ChevronRight aria-hidden="true" strokeWidth={1.6} className="mx-1 hidden size-[14px] shrink-0 text-faint sm:block" /> : null}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className={cn("truncate rounded-lg text-[15px] text-muted-foreground transition-colors duration-150 hover:text-foreground", crumb.mono && "font-mono text-[13px]")}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined} className={cn("truncate text-[15px] font-medium tracking-[-0.01em] text-foreground", crumb.mono && "font-mono text-[13px]")}>
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <button
        type="button"
        onClick={onSearch}
        aria-label="Search"
        className="press flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
      >
        <Search className="size-[17px]" />
      </button>
    </header>
  );
}

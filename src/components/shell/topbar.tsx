"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "@/components/ui/icon";
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

/** The context line at the top of the pane: a breadcrumb, no fill, no border. */
export function Topbar(): ReactNode {
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

  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;

  return (
    <div className="workspace-topbar flex min-h-[32px] flex-wrap items-center justify-between gap-1.5 px-4 pt-3 md:px-5 lg:px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-ink-3">
        <span aria-hidden="true" className="flex shrink-0 items-center">
          <Icon className="size-[16px]" strokeWidth={1.5} />
        </span>
        {parent?.href ? (
          <Link
            href={parent.href}
            aria-label={`Back to ${parent.label}`}
            className="focus-ring-canvas flex size-[28px] shrink-0 items-center justify-center rounded-6 text-ink-3 outline-none hover:bg-state-hover hover:text-ink sm:hidden"
          >
            <ChevronLeft aria-hidden="true" strokeWidth={1.5} className="size-[16px]" />
          </Link>
        ) : null}
        <ol className="flex min-w-0 items-center">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${index}`} className={cn("flex min-w-0 items-center", !isLast && "hidden sm:flex")}>
                {index > 0 ? (
                  <ChevronRight aria-hidden="true" strokeWidth={1.5} className="mx-1 hidden size-[14px] shrink-0 text-ink-4 sm:block" />
                ) : null}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className={cn(
                      "focus-ring-canvas truncate rounded-4 text-ink-3 transition-colors duration-[var(--dur-1)] hover:text-ink",
                      crumb.mono ? "t-mono-hash" : "t-body-medium"
                    )}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined} className={cn("truncate text-ink", crumb.mono ? "t-mono-hash" : "t-body-medium")}>
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

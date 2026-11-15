"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "@/components/ui/icon";
import { findNavItem } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

function deslugify(slug: string): string {
  const words = slug.replace(/[-_]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The context line at the top of the pane: a breadcrumb, no fill, no border. */
export function Topbar(): ReactNode {
  const pathname = usePathname();
  const match = findNavItem(pathname);
  const crumbs: Crumb[] = [];
  let Icon = LayoutDashboard;

  if (pathname.startsWith("/systems/")) {
    const segments = pathname.split("/").filter(Boolean);
    crumbs.push({ label: "Systems", href: "/dashboard" });
    crumbs.push({ label: segments[1] ?? "System", href: `/systems/${segments[1]}` });
    if (segments[2]) crumbs.push({ label: deslugify(segments[2]) });
    Icon = findNavItem("/dashboard")?.item.icon ?? Icon;
  } else if (match) {
    Icon = match.item.icon;
    if (match.group) crumbs.push({ label: match.group });
    crumbs.push({ label: match.item.label, href: match.item.href });
  } else {
    crumbs.push({ label: deslugify(pathname.split("/").filter(Boolean).pop() ?? "Home") });
  }

  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;

  return (
    <div className="workspace-topbar flex min-h-[32px] flex-wrap items-center justify-between gap-3 px-6 pt-5 md:px-7 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 text-ink-3">
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
                  <ChevronRight aria-hidden="true" strokeWidth={1.5} className="mx-2 hidden size-[14px] shrink-0 text-ink-4 sm:block" />
                ) : null}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="focus-ring-canvas t-body-medium truncate rounded-4 text-ink-3 transition-colors duration-[var(--dur-1)] hover:text-ink"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined} className={cn("t-body-medium truncate text-ink", pathname.startsWith("/systems/") && index === 1 && "t-mono-hash")}>
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

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Key,
  Users,
  Shield,
  Sliders,
  MessageSquare,
  Menu,
  X,
  ScrollText,
  Building2,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Nav data
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Workspace",
    items: [
      { label: "General",          href: "/settings/workspace",     icon: Building2  },
      { label: "Billing",          href: "/settings/billing",       icon: CreditCard },
      { label: "Collaboration",    href: "/settings/collaboration", icon: Users      },
      { label: "Operations",       href: "/settings/operations",    icon: Sliders    },
      { label: "Trust and security", href: "/settings/trust",       icon: Shield     },
    ],
  },
  {
    heading: "Developer",
    items: [
      { label: "Tokens",    href: "/settings/tokens", icon: Key        },
      { label: "Audit log", href: "/settings/audit",  icon: ScrollText },
    ],
  },
  {
    heading: "Other",
    items: [
      { label: "Feedback", href: "/settings/feedback", icon: MessageSquare },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findActiveLabel(pathname: string): string | null {
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return item.label;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Nav content
// ---------------------------------------------------------------------------

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Settings sections" className="flex flex-col gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading} className="flex flex-col gap-1">
          <div className="t-overline text-ink-3 px-2 mb-1">
            {group.heading}
          </div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md t-label transition-colors",
                      isActive
                        ? "surface-canvas shadow-xs ring-1 ring-[var(--color-line)] text-ink-1 font-medium"
                        : "text-ink-2 hover:bg-[var(--color-hover)] hover:text-ink-1",
                    )}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.75}
                      className={cn(
                        "shrink-0",
                        isActive ? "text-indigo-600" : "text-ink-3",
                      )}
                    />
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function SettingsShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const activeLabel = findActiveLabel(pathname);

  const breadcrumbItems = activeLabel
    ? [
        { label: "Settings", href: "/settings/workspace" },
        { label: activeLabel },
      ]
    : [{ label: "Settings" }];

  return (
    <div className="flex w-full min-h-screen surface-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] shrink-0 sticky top-0 self-start h-screen border-r border-line bg-[var(--surface-subtle)] px-3 py-6 flex-col gap-6 overflow-y-auto">
        <div className="px-2">
          <div className="t-overline text-ink-3 mb-1">Account</div>
          <h1 className="t-h3 font-semibold text-ink-1">Settings</h1>
        </div>
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-line surface-canvas px-4">
        <span className="t-label font-semibold text-ink-1">Settings</span>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md hover:bg-[var(--color-hover)]"
          aria-label="Open settings navigation"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-[var(--surface-subtle)] px-3 py-6 flex flex-col gap-6 shadow-xl-token">
            <div className="flex items-center justify-between px-2 mb-1">
              <div>
                <div className="t-overline text-ink-3 mb-1">Account</div>
                <span className="t-h3 font-semibold text-ink-1">Settings</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md hover:bg-[var(--color-hover)]"
                aria-label="Close settings navigation"
              >
                <X size={18} />
              </button>
            </div>
            <NavContent onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      {/* Content area */}
      <main className="flex-1 min-w-0 mt-14 lg:mt-0">
        <div className="px-6 lg:px-10 pt-6 lg:pt-8 pb-2">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        <div className="px-6 lg:px-10 pb-16 pt-4">
          <div className="mx-auto max-w-3xl">{children}</div>
        </div>
      </main>
    </div>
  );
}

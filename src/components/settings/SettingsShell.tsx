"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@heroui/react";
import {
  CreditCard,
  Key,
  Users,
  Shield,
  Lock,
  Sliders,
  MessageSquare,
  Menu,
  X,
  Settings,
} from "lucide-react";

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
    heading: "ACCOUNT",
    items: [
      { label: "Billing",  href: "/settings/billing",  icon: CreditCard    },
      { label: "Tokens",   href: "/settings/tokens",   icon: Key           },
    ],
  },
  {
    heading: "WORKSPACE",
    items: [
      { label: "Collaboration", href: "/settings/collaboration", icon: Users    },
      { label: "Audit log",     href: "/settings/audit",         icon: Shield   },
      { label: "Trust",         href: "/settings/trust",         icon: Lock     },
      { label: "Operations",    href: "/settings/operations",    icon: Sliders  },
    ],
  },
  {
    heading: "SUPPORT",
    items: [
      { label: "Feedback", href: "/settings/feedback", icon: MessageSquare },
    ],
  },
];

// ---------------------------------------------------------------------------
// Shared nav content
// ---------------------------------------------------------------------------

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      {NAV_GROUPS.map((group, groupIdx) => (
        <div key={group.heading}>
          {groupIdx > 0 && <Separator className="my-1" />}

          <p className="px-2 mb-1 text-[11px] font-semibold tracking-wider text-slate-400">
            {group.heading}
          </p>

          <ul className="flex flex-col gap-0.5">
            {group.items.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={[
                      "flex items-center gap-2.5 px-2 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <Icon size={16} strokeWidth={1.75} className="shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex w-full min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 border-r border-slate-200 bg-white px-3 py-6 flex-col gap-4">
        <h1 className="text-xl font-bold text-slate-900 px-2">Settings</h1>
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-slate-500" />
          <span className="font-semibold text-slate-800">Settings</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-white px-3 py-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xl font-bold text-slate-900">Settings</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            <NavContent onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      {/* Content area */}
      <main className="flex-1 min-w-0 bg-white px-4 lg:px-8 py-6 lg:py-8 mt-14 lg:mt-0">
        {children}
      </main>
    </div>
  );
}

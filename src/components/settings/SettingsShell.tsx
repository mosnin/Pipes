"use client";

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
// Component
// ---------------------------------------------------------------------------

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex w-full min-h-screen">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-slate-200 bg-white px-3 py-6 flex flex-col gap-4">
        <h1 className="text-xl font-bold text-slate-900 px-2">Settings</h1>

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
      </aside>

      {/* Content area */}
      <main className="flex-1 bg-white p-8">
        {children}
      </main>
    </div>
  );
}

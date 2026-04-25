"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chip } from "@heroui/react";
import { Shield, Menu, X } from "lucide-react";

const ADMIN_NAV = [
  { label: "Support",  href: "/admin"          },
  { label: "Insights", href: "/admin/insights"  },
  { label: "Release",  href: "/admin/release"   },
  { label: "Issues",   href: "/admin/issues"    },
] as const;

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {ADMIN_NAV.map(({ label, href }) => {
        const isActive =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={[
              "px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
              isActive
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-default-200 text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Shield size={20} className="text-slate-700 shrink-0" />
        <h1 className="text-xl font-bold text-slate-900">Admin</h1>
        <Chip color="danger" size="sm" variant="soft">Internal</Chip>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="ml-auto lg:hidden p-2 rounded-lg hover:bg-slate-100"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Desktop nav */}
      <nav className="hidden lg:flex gap-2 mb-6 border-b border-slate-200 pb-4">
        <NavLinks />
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-white px-4 py-6 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-slate-700 shrink-0" />
                <span className="font-semibold text-slate-900">Admin</span>
                <Chip color="danger" size="sm" variant="soft">Internal</Chip>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              <NavLinks onClose={() => setMobileOpen(false)} />
            </nav>
          </aside>
        </>
      )}

      {children}
    </div>
  );
}

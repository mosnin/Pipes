"use client";

import type { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import {
  Breadcrumbs,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui";

type AdminSection = {
  id: string;
  label: string;
  href: string;
};

const ADMIN_SECTIONS: AdminSection[] = [
  { id: "overview", label: "Overview", href: "/admin" },
  { id: "insights", label: "Insights", href: "/admin/insights" },
  { id: "issues", label: "Issues", href: "/admin/issues" },
  { id: "release", label: "Release", href: "/admin/release" },
];

function resolveActiveSection(pathname: string): string {
  if (pathname === "/admin") return "overview";
  if (pathname.startsWith("/admin/insights")) return "insights";
  if (pathname.startsWith("/admin/issues")) return "issues";
  if (pathname.startsWith("/admin/release")) return "release";
  return "overview";
}

function sectionLabel(id: string): string {
  return ADMIN_SECTIONS.find((s) => s.id === id)?.label ?? "Overview";
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const activeId = resolveActiveSection(pathname);

  const handleChange = (id: string) => {
    const target = ADMIN_SECTIONS.find((s) => s.id === id);
    if (target != null) router.push(target.href);
  };

  return (
    <div className="min-h-screen surface-subtle">
      {/* Sticky sub-nav */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-white/85 border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#111] text-white shrink-0"
              aria-hidden="true"
            >
              <Shield size={14} />
            </span>
            <Breadcrumbs
              items={[
                { label: "Admin", href: "/admin" },
                { label: sectionLabel(activeId) },
              ]}
            />
            <StatusBadge tone="danger" className="ml-1">
              Internal
            </StatusBadge>
          </div>
          <SegmentedControl
            items={ADMIN_SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
            value={activeId}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Page surface */}
      <div className="max-w-7xl mx-auto px-6 py-6">{children}</div>
    </div>
  );
}

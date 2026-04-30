"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  BarChart2,
} from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip, KbdHint } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  shortcut?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const ic = "w-4 h-4 shrink-0";

const PRIMARY_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Systems", icon: <LayoutDashboard className={ic} />, shortcut: "G S" },
      { href: "/templates", label: "Templates", icon: <BookOpen className={ic} />, shortcut: "G T" },
    ],
  },
];

function adminNavEnabled(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.NEXT_PUBLIC_PIPES_ADMIN_NAV === "true";
}

function buildOperateSection(showAdmin: boolean): NavSection {
  const items: NavItem[] = [];
  if (showAdmin && adminNavEnabled()) {
    items.push({
      href: "/admin",
      label: "Admin",
      icon: <BarChart2 className={ic} />,
      shortcut: "G A",
    });
  }
  items.push({
    href: "/settings/billing",
    label: "Settings",
    icon: <Settings className={ic} />,
    shortcut: "G ,",
  });
  return { title: "Operate", items };
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}

function NavRow({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const linkClass = [
    "group flex items-center rounded-md transition-colors duration-100 select-none",
    "text-[13px] font-medium",
    collapsed ? "justify-center h-8 w-8 mx-auto" : "gap-2.5 px-2 py-1.5",
    active
      ? "bg-white shadow-xs ring-1 ring-black/5 text-[#111]"
      : "text-[#3C3C43] hover:bg-white/60 hover:text-[#111]",
  ].join(" ");

  const iconWrap = (
    <span
      className={[
        "shrink-0 inline-flex items-center justify-center transition-colors duration-100",
        active ? "text-indigo-600" : "text-[#8E8E93] group-hover:text-[#3C3C43]",
      ].join(" ")}
    >
      {item.icon}
    </span>
  );

  const link = (
    <Link href={item.href} className={linkClass} aria-label={item.label}>
      {iconWrap}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.shortcut != null && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-100 shrink-0">
              <KbdHint keys={item.shortcut.split(" ")} />
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={item.label} side="right">
        {link}
      </Tooltip>
    );
  }
  return link;
}

function SectionHeading({ title, collapsed }: { title: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-1 mx-auto h-px w-6 bg-black/[0.06]" />;
  }
  return (
    <div className="t-overline text-[#8E8E93] px-2 mt-3 mb-1">{title}</div>
  );
}

export function PrimaryNavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-0.5">
      {PRIMARY_SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          <SectionHeading title={section.title} collapsed={collapsed} />
          {section.items.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              collapsed={collapsed}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BottomNavLinks({
  showAdmin,
  collapsed = false,
}: {
  showAdmin: boolean;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const section = buildOperateSection(showAdmin);
  return (
    <div className="flex flex-col gap-0.5">
      <SectionHeading title={section.title} collapsed={collapsed} />
      {section.items.map((item) => (
        <NavRow
          key={item.href}
          item={item}
          active={isActive(pathname, item.href)}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}

/** Page label resolution exported for the topbar breadcrumbs. */
export function usePageLabel(): string {
  const pathname = usePathname();
  const all = [
    ...PRIMARY_SECTIONS.flatMap((s) => s.items),
    ...buildOperateSection(true).items,
  ];
  const match = all.find((item) => isActive(pathname, item.href));
  if (match != null) return match.label;
  if (pathname === "/" || pathname === "") return "Home";
  // Derive from last path segment
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (last.length === 0) return "Workspace";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

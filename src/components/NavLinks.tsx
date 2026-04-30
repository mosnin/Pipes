"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Zap, Settings, BarChart2 } from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const ic = "w-[17px] h-[17px] shrink-0";

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Systems",   icon: <LayoutDashboard className={ic} /> },
  { href: "/templates", label: "Templates", icon: <BookOpen className={ic} /> },
  { href: "/connect",   label: "Connect",   icon: <Zap className={ic} /> },
];

function buildBottom(showAdmin: boolean): NavItem[] {
  return [
    ...(showAdmin ? [{ href: "/admin", label: "Admin", icon: <BarChart2 className={ic} /> }] : []),
    { href: "/settings/billing", label: "Settings", icon: <Settings className={ic} /> },
  ];
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={[
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
        "text-[13px] font-medium select-none",
        active
          ? "bg-white text-[#111] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]"
          : "text-[#3C3C43] hover:text-[#111] hover:bg-white/70",
      ].join(" ")}
    >
      <span className={[
        "shrink-0 transition-colors duration-150",
        active ? "text-indigo-600" : "text-[#8E8E93] group-hover:text-[#3C3C43]",
      ].join(" ")}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function PrimaryNavLinks() {
  const pathname = usePathname();
  return (
    <>
      {PRIMARY.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
    </>
  );
}

export function BottomNavLinks({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {buildBottom(showAdmin).map((item) => (
        <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
    </>
  );
}

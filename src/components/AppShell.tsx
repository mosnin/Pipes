import Link from "next/link";
import { Avatar } from "@heroui/react";
import {
  LayoutDashboard,
  BookOpen,
  Zap,
  Settings,
  LogOut,
  BarChart2,
} from "lucide-react";
import { getAuthService } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";
import { canAccessAdmin } from "@/lib/admin/access";
import { ThemeToggle } from "./ThemeToggle";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

type NavItem = { href: string; label: string; icon: React.ReactNode };

const iconClass = "w-[18px] h-[18px] shrink-0";

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Design", icon: <LayoutDashboard className={iconClass} /> },
  { href: "/templates", label: "Templates", icon: <BookOpen className={iconClass} /> },
  { href: "/connect", label: "Connect", icon: <Zap className={iconClass} /> },
];

function NavLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 text-slate-600 hover:bg-slate-100 hover:text-slate-900
                 transition-all duration-100"
    >
      <span className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-100">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getAuthService().requireUser();
  const { ctx } = await getServerApp();
  const showAdmin = canAccessAdmin(user.email);
  const initials = getInitials(user.name);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col w-[220px] shrink-0 h-full bg-white border-r border-slate-100"
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-5 py-5 shrink-0">
          <span className="text-xl font-bold tracking-tight text-slate-900 select-none">
            Pipes
          </span>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-3 space-y-0.5" aria-label="Primary">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Bottom: settings + user */}
        <div className="px-3 pb-4 space-y-0.5 shrink-0">
          {showAdmin && (
            <NavLink item={{ href: "/admin", label: "Admin", icon: <BarChart2 className={iconClass} /> }} />
          )}
          <NavLink item={{ href: "/settings/billing", label: "Settings", icon: <Settings className={iconClass} /> }} />

          {/* User row */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl group">
              <Avatar size="sm" className="shrink-0 w-7 h-7">
                <Avatar.Fallback color="default" className="text-xs font-semibold">
                  {initials}
                </Avatar.Fallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate leading-tight">
                  {ctx.plan}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ThemeToggle />
                <Link
                  href="/api/auth/logout"
                  aria-label="Log out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}

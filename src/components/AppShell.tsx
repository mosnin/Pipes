import Link from "next/link";
import { Avatar, Chip, Separator } from "@heroui/react";
import {
  LayoutDashboard,
  Rocket,
  CreditCard,
  Users,
  ShieldCheck,
  Key,
  FileText,
  MessageSquare,
  Headphones,
  BarChart2,
  GitBranch,
  AlertCircle,
  ExternalLink,
  BookOpen,
  LogOut,
  Settings,
} from "lucide-react";
import { getAuthService } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";
import { canAccessAdmin } from "@/lib/admin/access";
import { ThemeToggle } from "./ThemeToggle";

// ── Types ──────────────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const iconClass = "w-4 h-4 shrink-0";

// ── Nav definitions ────────────────────────────────────────────────────────────

const mainGroup: NavGroup = {
  title: "Main",
  items: [
    {
      href: "/dashboard",
      label: "Systems",
      icon: <LayoutDashboard className={iconClass} />,
    },
    {
      href: "/onboarding",
      label: "Onboarding",
      icon: <Rocket className={iconClass} />,
    },
  ],
};

const settingsGroup: NavGroup = {
  title: "Settings",
  items: [
    {
      href: "/settings/billing",
      label: "Billing",
      icon: <CreditCard className={iconClass} />,
    },
    {
      href: "/settings/collaboration",
      label: "Collaboration",
      icon: <Users className={iconClass} />,
    },
    {
      href: "/settings/trust",
      label: "Trust",
      icon: <ShieldCheck className={iconClass} />,
    },
    {
      href: "/settings/tokens",
      label: "Tokens",
      icon: <Key className={iconClass} />,
    },
    {
      href: "/settings/audit",
      label: "Audit",
      icon: <FileText className={iconClass} />,
    },
    {
      href: "/settings/feedback",
      label: "Feedback",
      icon: <MessageSquare className={iconClass} />,
    },
  ],
};

const adminGroup: NavGroup = {
  title: "Admin",
  items: [
    {
      href: "/admin",
      label: "Support",
      icon: <Headphones className={iconClass} />,
    },
    {
      href: "/admin/insights",
      label: "Insights",
      icon: <BarChart2 className={iconClass} />,
    },
    {
      href: "/admin/release",
      label: "Release",
      icon: <GitBranch className={iconClass} />,
    },
    {
      href: "/admin/issues",
      label: "Issues",
      icon: <AlertCircle className={iconClass} />,
    },
  ],
};

const externalGroup: NavGroup = {
  title: "External",
  items: [
    {
      href: "/templates",
      label: "Templates",
      icon: <BookOpen className={iconClass} />,
    },
    {
      href: "/protocol",
      label: "Protocol",
      icon: <ExternalLink className={iconClass} />,
    },
  ],
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function NavGroupSection({ group }: { group: NavGroup }) {
  return (
    <div>
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none">
        {group.title}
      </p>
      <ul className="space-y-0.5" role="list">
        {group.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                         text-slate-600 hover:bg-slate-100 hover:text-slate-900
                         transition-colors duration-100"
            >
              <span className="text-slate-400 group-hover:text-slate-600 transition-colors duration-100">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getAuthService().requireUser();
  const { ctx } = await getServerApp();

  const showAdmin = canAccessAdmin(user.email);
  const initials = getInitials(user.name);

  const navGroups: NavGroup[] = [
    mainGroup,
    settingsGroup,
    ...(showAdmin ? [adminGroup] : []),
    externalGroup,
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col w-[240px] shrink-0 h-full bg-white border-r border-slate-200 overflow-y-auto"
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100 shrink-0">
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Pipes
          </span>
          <Chip
            color="accent"
            variant="soft"
            size="sm"
            className="text-[10px] font-semibold"
          >
            {ctx.plan}
          </Chip>
        </div>

        {/* User section */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
          <Avatar size="sm" className="shrink-0">
            <Avatar.Fallback color="default" className="text-xs font-semibold">
              {initials}
            </Avatar.Fallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
              {user.name}
            </p>
            <p className="text-xs text-slate-400 truncate leading-tight">
              {user.email}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 px-2 py-3 space-y-5 overflow-y-auto"
          aria-label="Primary"
        >
          {navGroups.map((group, idx) => (
            <div key={group.title}>
              <NavGroupSection group={group} />
              {idx < navGroups.length - 1 && (
                <Separator className="mt-4 bg-slate-100" />
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 border-t border-slate-100 shrink-0">
          <Link
            href="/api/auth/logout"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                       text-slate-500 hover:bg-red-50 hover:text-red-600
                       transition-colors duration-100 w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log out</span>
          </Link>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-400">Workspace</span>
            <span className="font-semibold text-slate-800 font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              {ctx.workspaceId}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Chip
              color="accent"
              variant="soft"
              size="sm"
              className="text-xs font-medium"
            >
              {ctx.plan}
            </Chip>
            <Separator orientation="vertical" className="h-4 bg-slate-200" />
            <Link
              href="/api/auth/logout"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500
                         hover:text-red-600 transition-colors duration-100"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Logout</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-white p-6">{children}</main>
      </div>
    </div>
  );
}

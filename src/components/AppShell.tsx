import Link from "next/link";
import { Avatar } from "@heroui/react";
import { LogOut } from "lucide-react";
import { getAuthService } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";
import { canAccessAdmin } from "@/lib/admin/access";
import { ThemeToggle } from "./ThemeToggle";
import { PrimaryNavLinks, BottomNavLinks } from "./NavLinks";

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getAuthService().requireUser();
  const { ctx } = await getServerApp();
  const showAdmin = canAccessAdmin(user.email);
  const initials = getInitials(user.name);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar — #F5F5F7 chrome, white main creates separation without a border ── */}
      <aside
        className="flex flex-col w-[216px] shrink-0 h-full bg-[#F5F5F7]"
        aria-label="Primary navigation"
      >
        {/* Wordmark */}
        <div className="px-5 pt-6 pb-5 shrink-0">
          <span className="text-[17px] font-semibold tracking-tight text-[#111] select-none"
                style={{ letterSpacing: "-0.03em" }}>
            Pipes
          </span>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto" aria-label="Primary">
          <PrimaryNavLinks />
        </nav>

        {/* Bottom: settings + user */}
        <div className="px-2.5 pb-3 space-y-0.5 shrink-0">
          <BottomNavLinks showAdmin={showAdmin} />

          {/* Divider */}
          <div className="my-2 h-px bg-black/[0.06] mx-1" />

          {/* User row */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl">
            <Avatar size="sm" className="shrink-0 w-6 h-6">
              <Avatar.Fallback color="default" className="text-[10px] font-semibold">
                {initials}
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="t-label font-semibold text-[#111] truncate leading-tight">{user.name}</p>
              <p className="t-caption text-[#8E8E93] truncate leading-tight">{ctx.plan}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <ThemeToggle />
              <Link
                href="/api/auth/logout"
                aria-label="Log out"
                className="p-1.5 rounded-lg text-[#8E8E93] hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main canvas — pure white ── */}
      <main className="flex-1 overflow-y-auto bg-white">
        {children}
      </main>
    </div>
  );
}

import Link from "next/link";
import { Sidebar, Topbar, Badge, Button } from "@/components/ui";
import { getAuthService } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";
import { canAccessAdmin } from "@/lib/admin/access";

const navItems = [
  ["/dashboard", "Systems"],
  ["/onboarding", "Onboarding"],
  ["/settings/billing", "Settings · Billing"],
  ["/settings/collaboration", "Settings · Collaboration"],
  ["/settings/trust", "Settings · Trust"],
  ["/settings/tokens", "Settings · Tokens"],
  ["/settings/audit", "Settings · Audit"],
  ["/settings/feedback", "Settings · Feedback"],
  ["/admin", "Admin · Support"],
  ["/admin/insights", "Admin · Insights"],
  ["/admin/release", "Admin · Release"],
  ["/admin/issues", "Admin · Issues"],
  ["/templates", "Templates"],
  ["/protocol", "Protocol"]
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getAuthService().requireUser();
  const { ctx } = await getServerApp();
  const nav = canAccessAdmin(user.email) ? navItems : navItems.filter(([href]) => !href.startsWith("/admin"));

  return (
    <div className="app-shell">
      <Sidebar>
        <h2>Pipes</h2>
        <p>{user.name}</p>
        <nav aria-label="Primary">
          {nav.map(([href, label]) => (
            <div key={href} style={{ marginBottom: 8 }}>
              <Link href={href}>{label}</Link>
            </div>
          ))}
        </nav>
      </Sidebar>
      <div className="app-content">
        <Topbar
          left={<strong>Workspace: {ctx.workspaceId}</strong>}
          right={
            <div className="nav-inline">
              <Badge tone="good">Plan: {ctx.plan}</Badge>
              <Link href="/api/auth/logout"><Button>Logout</Button></Link>
            </div>
          }
        />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

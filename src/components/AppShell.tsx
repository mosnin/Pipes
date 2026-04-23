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
        <h2 style={{ marginBottom: 2 }}>Pipes</h2>
        <p className="muted" style={{ marginTop: 0 }}>{user.name}</p>
        <nav aria-label="Primary" className="app-nav-list">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="app-nav-link">{label}</Link>
          ))}
        </nav>
      </Sidebar>
      <div className="app-content">
        <Topbar
          left={<strong>Workspace: {ctx.workspaceId}</strong>}
          right={(
            <div className="nav-inline">
              <Badge tone="good">Plan: {ctx.plan}</Badge>
              <Link href="/api/auth/logout"><Button variant="subtle">Logout</Button></Link>
            </div>
          )}
        />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

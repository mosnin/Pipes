import Link from "next/link";
import { Sidebar, Topbar, Badge, Button } from "@/components/ui";
import { getAuthService } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";
import { canAccessAdmin } from "@/lib/admin/access";

const primaryNav = [
  ["/dashboard", "Systems"],
  ["/templates", "Templates"],
  ["/settings/operations", "Agent"],
  ["/settings/billing", "Settings"]
] as const;

const settingsNav = [
  ["/settings/collaboration", "Collaboration"],
  ["/settings/trust", "Trust"],
  ["/settings/tokens", "Tokens"],
  ["/settings/audit", "Audit"],
  ["/settings/feedback", "Feedback"]
] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getAuthService().requireUser();
  const { ctx } = await getServerApp();
  const hasAdmin = canAccessAdmin(user.email);

  return (
    <div className="app-shell">
      <Sidebar>
        <div className="app-brand-block">
          <h2>Pipes</h2>
          <p className="muted">{user.name}</p>
        </div>

        <nav aria-label="Primary" className="app-nav-list">
          {primaryNav.map(([href, label]) => (
            <Link key={href} href={href} className="app-nav-link">{label}</Link>
          ))}
        </nav>

        <div className="app-subnav-block">
          <p className="muted app-subnav-title">Workspace</p>
          {settingsNav.map(([href, label]) => (
            <Link key={href} href={href} className="app-nav-link app-nav-link-subtle">{label}</Link>
          ))}
          {hasAdmin ? <Link href="/admin" className="app-nav-link app-nav-link-operator">Operator Console</Link> : null}
        </div>
      </Sidebar>

      <div className="app-content">
        <Topbar
          left={<strong>Workspace · {ctx.workspaceId}</strong>}
          right={(
            <div className="nav-inline">
              <Badge tone="good">{ctx.plan}</Badge>
              <Link href="/api/auth/logout"><Button variant="subtle">Log out</Button></Link>
            </div>
          )}
        />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

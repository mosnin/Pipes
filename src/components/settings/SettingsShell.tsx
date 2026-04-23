import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

const links = [
  ["/settings/billing", "Billing"],
  ["/settings/collaboration", "Collaboration"],
  ["/settings/trust", "Trust"],
  ["/settings/tokens", "Tokens"],
  ["/settings/audit", "Audit"],
  ["/settings/operations", "Agent Ops"]
] as const;

export function SettingsShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <nav aria-label="Settings sections" className="nav-inline settings-nav">
          {links.map(([href, label]) => <Link key={href} href={href} className="settings-link">{label}</Link>)}
        </nav>
      </Card>
      {children}
    </div>
  );
}

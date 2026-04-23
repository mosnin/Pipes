import Link from "next/link";
import { Button } from "@/components/ui";

const links = [
  ["/", "Systems"],
  ["/templates", "Templates"],
  ["/protocol", "Agent"],
  ["/docs", "Docs"]
] as const;

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell">
      <header className="marketing-header marketing-wrap">
        <Link href="/" className="brand-mark">Pipes</Link>
        <nav className="nav-inline" aria-label="Marketing pages">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/login"><Button variant="subtle">Log in</Button></Link>
          <Link href="/signup"><Button>Create workspace</Button></Link>
        </nav>
      </header>
      <main className="marketing-wrap marketing-main">{children}</main>
      <footer className="marketing-wrap marketing-footer">
        <div className="nav-inline">
          <span className="muted">Design systems with an attached agent. Review, refine, export.</span>
        </div>
      </footer>
    </div>
  );
}

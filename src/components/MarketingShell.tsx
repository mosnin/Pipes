import Link from "next/link";
import { Button } from "@/components/ui";

const links = [
  ["/pricing", "Pricing"],
  ["/templates", "Templates"],
  ["/use-cases", "Use cases"],
  ["/compare", "Compare"],
  ["/protocol", "Protocol"],
  ["/docs", "Docs"]
] as const;

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell">
      <header className="marketing-header marketing-wrap">
        <Link href="/" className="brand-mark">Pipes</Link>
        <nav className="nav-inline" aria-label="Marketing pages">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/login">Login</Link>
          <Link href="/signup"><Button>Start Building</Button></Link>
        </nav>
      </header>
      <main className="marketing-wrap marketing-main">{children}</main>
      <footer className="marketing-wrap marketing-footer">
        <div className="nav-inline">
          {links.map(([href, label]) => <Link key={`footer-${href}`} href={href}>{label}</Link>)}
          <Link href="/signup">Create workspace</Link>
        </div>
      </footer>
    </div>
  );
}

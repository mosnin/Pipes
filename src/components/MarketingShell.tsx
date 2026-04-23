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
    <div>
      <header className="marketing-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/"><strong>Pipes</strong></Link>
        <nav className="nav-inline">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/login">Login</Link>
          <Link href="/signup"><Button>Start Building</Button></Link>
        </nav>
      </header>
      <div className="marketing-wrap">{children}</div>
      <footer className="marketing-wrap" style={{ marginTop: 32, paddingBottom: 24 }}>
        <div className="nav-inline">
          {links.map(([href, label]) => <Link key={`footer-${href}`} href={href}>{label}</Link>)}
          <Link href="/signup">Create workspace</Link>
        </div>
      </footer>
    </div>
  );
}

import { MarketingShell } from "@/components/MarketingShell";
import { TryItFloatingWidget } from "@/components/marketing/TryItFloatingWidget";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      {children}
      <TryItFloatingWidget />
    </MarketingShell>
  );
}

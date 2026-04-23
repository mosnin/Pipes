import { Button, Card, PageHeader, Table } from "@/components/ui";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes pricing",
  description: "Pricing for structured system authoring, collaboration, and protocol-ready architecture workflows."
};

export default function PricingPage() {
  return (
    <div>
      <PageHeader title="Pricing" subtitle="Start with core system modeling, upgrade for deeper collaboration and protocol-heavy workflows." />
      <Card>
        <Table
          headers={["Plan", "Systems", "Collab", "Version History", "API/MCP"]}
          rows={[["Free", "3", "No", "No", "No"],["Pro", "25", "Yes", "Yes", "Yes"],["Builder", "250", "Yes", "Yes", "Yes"]]}
        />
        <div className="nav-inline">
          <TrackedLink href="/signup?source=pricing" event="pricing_cta_clicked" metadata={{ source: "pricing_primary" }}><Button>Start free workspace</Button></TrackedLink>
          <TrackedLink href="/signup?source=pricing_upgrade" event="pricing_cta_clicked" metadata={{ source: "pricing_secondary" }}><Button>Upgrade later in app</Button></TrackedLink>
        </div>
      </Card>
    </div>
  );
}

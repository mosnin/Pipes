import { Card, PageHeader } from "@/components/ui";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes protocol",
  description: "Pipes Schema v1, API, and MCP surfaces for structured system integration."
};

export default function ProtocolPage() {
  return (
    <div>
      <PageHeader title="Protocol" subtitle="Typed contract for humans, internal APIs, and external MCP agents." />
      <Card><p>Pipes Schema v1 defines systems as graph-first contracts with ports, pipes, snapshots, validation, and simulation artifacts.</p><TrackedLink href="/docs" event="protocol_docs_viewed" metadata={{ source: "protocol_page" }}>Read docs</TrackedLink></Card>
    </div>
  );
}

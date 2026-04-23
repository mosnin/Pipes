import { Card, PageHeader } from "@/components/ui";

export default function DocsPage() {
  return (
    <div>
      <PageHeader title="Docs" subtitle="Foundation documentation for product, architecture, domain model, and local dev." />
      <Card><p>See the /docs folder for structured documentation that future prompts can extend.</p></Card>
    </div>
  );
}

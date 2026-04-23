import { Card, PageHeader } from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes use cases",
  description: "Technical use cases for reusable systems: multi-agent, automation, support ops, architecture, and handoff."
};

export default function UseCasesPage() {
  const cases = publicContentService.listUseCases();
  return (
    <div>
      <PageHeader title="Use cases" subtitle="How teams apply Pipes for real architecture and operations workflows." />
      <div className="grid-2">
        {cases.map((entry) => <Card key={entry.slug}><h3>{entry.title}</h3><p>{entry.problem}</p><TrackedLink href={`/use-cases/${entry.slug}`} event="use_case_viewed" metadata={{ source: "use_cases_index", slug: entry.slug }}>View workflow</TrackedLink></Card>)}
      </div>
    </div>
  );
}

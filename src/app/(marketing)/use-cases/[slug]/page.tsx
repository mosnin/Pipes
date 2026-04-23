import { notFound } from "next/navigation";
import { Card, PageHeader, SectionHeader, Button } from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = publicContentService.getUseCase(slug);
  if (!entry) return { title: "Use case not found" };
  return { title: `${entry.title} · Pipes use case`, description: entry.fit };
}

export default async function UseCaseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = publicContentService.getUseCase(slug);
  if (!entry) notFound();
  const templates = publicContentService.listTemplates().filter((t) => (entry.templateIds as readonly string[]).includes(t.id));

  return (
    <div>
      <PageHeader title={entry.title} subtitle={entry.problem} />
      <Card><SectionHeader title="Why Pipes fits" description={entry.fit} /></Card>
      <Card><SectionHeader title="Typical workflow" />{entry.workflow.map((step) => <p key={step}>• {step}</p>)}</Card>
      <Card>
        <SectionHeader title="Relevant templates" />
        {templates.map((template) => <p key={template.id}><TrackedLink href={`/templates/${template.slug}`} event="template_detail_viewed" metadata={{ source: "use_case", useCase: entry.slug, templateId: template.id }}>{template.title}</TrackedLink></p>)}
        <TrackedLink href={`/signup?source=use_case_${entry.slug}`} event="signup_started" metadata={{ source: `use_case_${entry.slug}` }}><Button>Start from this use case</Button></TrackedLink>
      </Card>
    </div>
  );
}

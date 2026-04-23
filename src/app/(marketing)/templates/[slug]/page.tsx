import { notFound } from "next/navigation";
import { Card, PageHeader, SectionHeader, Button } from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = publicContentService.getTemplate(slug);
  if (!template) return { title: "Template not found" };
  return { title: `${template.title} template · Pipes`, description: `${template.description} ${template.preview}` };
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = publicContentService.getTemplate(slug);
  if (!template) notFound();

  return (
    <div>
      <PageHeader title={template.title} subtitle={`${template.category} · ${template.useCase}`} />
      <Card>
        <SectionHeader title="Why use this template" description={template.description} />
        <p>Complexity: {template.complexity}</p>
        <p>Preview: {template.preview}</p>
        <div className="nav-inline">
          <TrackedLink href={`/signup?source=template_detail_${template.slug}`} event="public_template_instantiate_clicked" metadata={{ templateId: template.id, source: "template_detail" }}><Button>Use this template</Button></TrackedLink>
          <TrackedLink href="/templates" event="share_page_viewed" metadata={{ source: "template_detail_back" }}>Back to templates</TrackedLink>
        </div>
      </Card>
    </div>
  );
}

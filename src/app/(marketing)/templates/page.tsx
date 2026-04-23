import { Card, PageHeader, SectionHeader, Input } from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes templates",
  description: "Discover reusable system templates for multi-agent, automation, support, and architecture workflows."
};

export default function TemplatesPage() {
  const templates = publicContentService.listTemplates();

  return (
    <div>
      <PageHeader title="Template library" subtitle="Discover structured starting points for reusable system architectures." />
      <Card><Input placeholder="Use in-app filters after signup for full workspace context." readOnly /></Card>
      <div className="grid-2" style={{ marginTop: 16 }}>
        {templates.map((template) => (
          <Card key={template.id}>
            <SectionHeader title={template.title} description={`${template.category} · ${template.useCase} · ${template.complexity}`} />
            <p>{template.description}</p>
            <p>{template.preview}</p>
            <div className="nav-inline">
              <TrackedLink href={`/templates/${template.slug}`} event="template_detail_viewed" metadata={{ source: "templates_index", templateId: template.id }}>View template</TrackedLink>
              <TrackedLink href={`/signup?source=template_${template.slug}`} event="public_template_instantiate_clicked" metadata={{ source: "templates_index", templateId: template.id }}>Use template</TrackedLink>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

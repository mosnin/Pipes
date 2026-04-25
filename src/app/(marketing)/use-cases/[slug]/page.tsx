import { notFound } from "next/navigation";
import { Card, Separator, Button, Chip } from "@heroui/react";
import { ArrowRight, CheckCircle2, Workflow } from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = publicContentService.getUseCase(slug);
  if (!entry) return { title: "Use case not found" };
  return {
    title: `${entry.title} · Pipes use case`,
    description: entry.fit
  };
}

export default async function UseCaseDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = publicContentService.getUseCase(slug);
  if (!entry) notFound();

  const templates = publicContentService
    .listTemplates()
    .filter((t) => (entry.templateIds as readonly string[]).includes(t.id));

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
        <TrackedLink
          href="/use-cases"
          event="use_cases_breadcrumb_clicked"
          metadata={{ slug }}
          className="hover:text-indigo-600 transition-colors"
        >
          Use Cases
        </TrackedLink>
        <span>/</span>
        <span className="text-slate-800 font-medium">{entry.title}</span>
      </nav>

      {/* Page heading */}
      <h1 className="text-4xl font-bold text-slate-900 mb-10">
        {entry.title}
      </h1>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* THE PROBLEM */}
          <Card className="border border-amber-200 bg-amber-50 shadow-none">
            <Card.Header className="pb-1">
              <div className="flex items-center gap-2">
                <Chip
                  size="sm"
                  className="bg-amber-100 text-amber-700 border-amber-300 font-semibold uppercase tracking-wide text-[10px]"
                  variant="soft"
                >
                  The Problem
                </Chip>
              </div>
            </Card.Header>
            <Card.Content className="pt-1">
              <p className="text-slate-700 text-sm leading-relaxed">
                {entry.problem}
              </p>
            </Card.Content>
          </Card>

          {/* WHY PIPES */}
          <Card className="border border-indigo-200 bg-indigo-50 shadow-none">
            <Card.Header className="pb-1">
              <div className="flex items-center gap-2">
                <Chip
                  size="sm"
                  className="bg-indigo-100 text-indigo-700 border-indigo-300 font-semibold uppercase tracking-wide text-[10px]"
                  variant="soft"
                >
                  Why Pipes
                </Chip>
              </div>
            </Card.Header>
            <Card.Content className="pt-1">
              <p className="text-slate-700 text-sm leading-relaxed">
                {entry.fit}
              </p>
            </Card.Content>
          </Card>

          {/* TYPICAL WORKFLOW */}
          <Card className="border border-slate-200 shadow-none">
            <Card.Header className="pb-2">
              <div className="flex items-center gap-2 text-slate-800">
                <Workflow className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-sm uppercase tracking-wide text-slate-500">
                  Typical Workflow
                </span>
              </div>
            </Card.Header>
            <Card.Content className="pt-0 flex flex-col gap-3">
              {entry.workflow.map((step, i) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 border border-slate-100 bg-slate-50 rounded-lg px-4 py-2.5">
                    <p className="text-sm text-slate-700">{step}</p>
                  </div>
                </div>
              ))}
            </Card.Content>
          </Card>
        </div>

        {/* RIGHT: 1/3 */}
        <div className="flex flex-col gap-6">
          {/* RELATED TEMPLATES */}
          <Card className="border border-slate-200 shadow-none">
            <Card.Header className="pb-2">
              <span className="font-semibold text-sm uppercase tracking-wide text-slate-500">
                Related Templates
              </span>
            </Card.Header>
            <Card.Content className="pt-0 flex flex-col gap-3">
              {templates.length === 0 && (
                <p className="text-sm text-slate-400">No templates yet.</p>
              )}
              {templates.map((template, i) => (
                <div key={template.id}>
                  {i > 0 && <Separator className="mb-3" />}
                  <TrackedLink
                    href={`/templates/${template.slug}`}
                    event="template_detail_viewed"
                    metadata={{
                      source: "use_case",
                      useCase: entry.slug,
                      templateId: template.id
                    }}
                    className="group flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {template.title}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <span className="text-xs text-slate-400">
                      {template.preview}
                    </span>
                  </TrackedLink>
                </div>
              ))}
            </Card.Content>
          </Card>

          {/* CTA card */}
          <Card className="border border-indigo-200 bg-indigo-50 shadow-none">
            <Card.Content className="flex flex-col gap-4 items-center text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-indigo-500" />
              <div>
                <p className="font-semibold text-slate-800 text-sm mb-1">
                  Ready to get started?
                </p>
                <p className="text-xs text-slate-500">
                  Build your first system from this use case in minutes.
                </p>
              </div>
              <TrackedLink
                href={`/signup?useCase=${entry.slug}`}
                event="signup_started"
                metadata={{ source: `use_case_${entry.slug}` }}
                className="w-full"
              >
                <Button
                  className="w-full font-semibold"
                >
                  Start from this use case
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </TrackedLink>
              <TrackedLink
                href="/templates"
                event="templates_browse_clicked"
                metadata={{ source: `use_case_${entry.slug}` }}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Browse all templates
              </TrackedLink>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}

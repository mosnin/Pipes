import { notFound } from "next/navigation";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Cpu,
  GitBranch,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react";
import {
  Breadcrumbs,
  Button,
  CardShell,
  CardBody,
  CardHeader,
  CardFooter,
  HelpText,
  InlineCode,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { starterTemplates } from "@/domain/templates/catalog";
import { TrackedLink } from "@/components/marketing/TrackedLink";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function complexityTone(c: string): StatusBadgeTone {
  if (c === "simple") return "success";
  if (c === "advanced") return "warning";
  return "info";
}

function NodeIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5 shrink-0";
  switch (type) {
    case "Input":
      return <LogIn className={cls} aria-hidden="true" />;
    case "Output":
      return <LogOut className={cls} aria-hidden="true" />;
    case "Agent":
      return <Cpu className={cls} aria-hidden="true" />;
    case "Tool":
      return <Wrench className={cls} aria-hidden="true" />;
    case "Trigger":
      return <Zap className={cls} aria-hidden="true" />;
    case "Decision":
      return <GitBranch className={cls} aria-hidden="true" />;
    case "Action":
      return <ArrowRight className={cls} aria-hidden="true" />;
    case "Guardrail":
      return <ShieldCheck className={cls} aria-hidden="true" />;
    case "HumanApproval":
      return <UserCheck className={cls} aria-hidden="true" />;
    default:
      return <Box className={cls} aria-hidden="true" />;
  }
}

const SETUP_STEPS = [
  {
    step: 1,
    title: "Sign up free",
    body: "Create your Pipes workspace in under a minute. No credit card required.",
  },
  {
    step: 2,
    title: "Instantiate the template",
    body: "Open this template from the catalog and add it to your workspace with one click.",
  },
  {
    step: 3,
    title: "Customize and ship",
    body: "Edit nodes, configure each component, and validate before going live.",
  },
] as const;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = publicContentService.getTemplate(slug);
  if (!template) return { title: "Template not found" };
  return {
    title: `${template.title} template - Pipes`,
    description: `${template.description} ${template.preview}`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = publicContentService.getTemplate(slug);
  if (!template) notFound();

  const catalogEntry = starterTemplates.find((t) => t.id === slug);
  const allTemplates = publicContentService.listTemplates();
  const related = allTemplates
    .filter((t) => t.id !== template.id && t.category === template.category)
    .slice(0, 3);

  const complexityLabel =
    template.complexity.charAt(0).toUpperCase() + template.complexity.slice(1);

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb bar */}
      <div className="surface-subtle border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <Breadcrumbs
            items={[
              { label: "Templates", href: "/templates" },
              { label: template.title },
            ]}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <header className="flex flex-col gap-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={complexityTone(template.complexity)}>
              {complexityLabel}
            </StatusBadge>
            <span className="inline-flex items-center rounded-md border border-black/[0.06] bg-white px-1.5 py-0.5 t-caption text-[#3C3C43]">
              {template.category}
            </span>
            <span className="inline-flex items-center rounded-md border border-black/[0.06] bg-white px-1.5 py-0.5 t-caption text-[#3C3C43]">
              {template.useCase}
            </span>
          </div>
          <h1 className="t-h1 text-[#111]">{template.title}</h1>
          <p className="t-body text-[#3C3C43] leading-relaxed">{template.description}</p>
        </header>

        {/* Two-column body */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: 8 cols */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Overview */}
            <section>
              <h2 className="t-overline text-[#8E8E93] mb-3">Overview</h2>
              <CardShell padded>
                <p className="t-body text-[#3C3C43] leading-relaxed">
                  <span className="font-semibold text-[#111]">{template.useCase}</span>
                  {" - "}A reliable starting point for teams building{" "}
                  {template.category.toLowerCase()} systems. Includes the core flow plus
                  extension points for tools, guardrails, and integrations.
                </p>
              </CardShell>
            </section>

            {/* What's included */}
            <section>
              <h2 className="t-overline text-[#8E8E93] mb-3">What is included</h2>
              {catalogEntry ? (
                <CardShell padded>
                  <ul className="flex flex-col gap-2.5">
                    {catalogEntry.nodes.map((node) => (
                      <li key={node.id} className="flex items-center gap-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 shrink-0">
                          <NodeIcon type={node.type} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="t-label font-medium text-[#111]">{node.title}</div>
                          <div className="t-caption text-[#8E8E93]">{node.type}</div>
                        </div>
                        <CheckCircle2
                          size={14}
                          className="text-[#059669] shrink-0"
                          aria-hidden="true"
                        />
                      </li>
                    ))}
                  </ul>
                  <HelpText className="mt-4">
                    {catalogEntry.nodes.length} nodes - {catalogEntry.pipes.length} pipes -
                    fully validated
                  </HelpText>
                </CardShell>
              ) : (
                <CardShell padded>
                  <HelpText>{template.preview}</HelpText>
                </CardShell>
              )}
            </section>

            {/* Setup */}
            <section>
              <h2 className="t-overline text-[#8E8E93] mb-3">Setup</h2>
              <ol className="flex flex-col gap-3">
                {SETUP_STEPS.map(({ step, title, body }) => (
                  <li key={step}>
                    <CardShell padded>
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white t-caption font-semibold">
                          {step}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="t-label font-semibold text-[#111]">{title}</h3>
                          <p className="mt-0.5 t-label text-[#3C3C43] leading-relaxed">
                            {body}
                          </p>
                        </div>
                      </div>
                    </CardShell>
                  </li>
                ))}
              </ol>
            </section>

            {/* Code preview */}
            {catalogEntry && (
              <section>
                <h2 className="t-overline text-[#8E8E93] mb-3">Flow preview</h2>
                <CardShell>
                  <CardHeader bordered>
                    <div className="flex items-center justify-between">
                      <span className="t-label font-semibold text-[#111]">
                        pipes_schema_v1
                      </span>
                      <InlineCode>{template.slug}.json</InlineCode>
                    </div>
                  </CardHeader>
                  <div className="px-4 py-4 overflow-x-auto bg-[#FAFAFA]">
                    <pre className="t-caption font-mono text-[#3C3C43] leading-relaxed">
                      {catalogEntry.nodes
                        .map((n, i) => {
                          const arrow =
                            i < catalogEntry.nodes.length - 1 ? "  -->" : "";
                          return `${n.type.padEnd(14)} ${n.title}${arrow}`;
                        })
                        .join("\n")}
                    </pre>
                  </div>
                </CardShell>
              </section>
            )}

            {/* Variants / Related */}
            {related.length > 0 && (
              <section>
                <h2 className="t-overline text-[#8E8E93] mb-3">Related templates</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {related.map((r) => (
                    <TrackedLink
                      key={r.id}
                      href={`/templates/${r.slug}`}
                      event="template_detail_viewed"
                      metadata={{ source: "template_related", templateId: r.id }}
                    >
                      <CardShell padded className="hover-lift transition-shadow h-full">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="t-label font-semibold text-[#111]">{r.title}</h3>
                          <StatusBadge tone={complexityTone(r.complexity)}>
                            {r.complexity.charAt(0).toUpperCase() + r.complexity.slice(1)}
                          </StatusBadge>
                        </div>
                        <p className="mt-1.5 t-caption text-[#3C3C43] line-clamp-2">
                          {r.description}
                        </p>
                      </CardShell>
                    </TrackedLink>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: sticky CTA - 4 cols */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-6">
              <CardShell>
                <CardHeader>
                  <h3 className="t-label font-semibold text-[#111]">Use this template</h3>
                  <p className="mt-1 t-caption text-[#8E8E93]">
                    Add to your workspace and start customizing.
                  </p>
                </CardHeader>
                <CardBody>
                  <TrackedLink
                    href={`/signup?template=${template.slug}`}
                    event="public_template_instantiate_clicked"
                    metadata={{ templateId: template.id, source: "template_detail" }}
                  >
                    <Button variant="primary" className="w-full">
                      <Sparkles size={14} className="mr-1.5" aria-hidden="true" />
                      Instantiate template
                    </Button>
                  </TrackedLink>
                  <HelpText className="mt-2 text-center">
                    Free forever - no credit card required
                  </HelpText>

                  <div className="mt-4 border-t border-[var(--color-line)] pt-3 flex flex-col gap-2.5">
                    <Detail label="Author" value="Pipes team" />
                    <Detail label="Category" value={template.category} />
                    <Detail label="Use case" value={template.useCase} />
                    <Detail label="Complexity" value={complexityLabel} />
                    <Detail
                      label="Composition"
                      value={template.preview}
                      mono
                    />
                  </div>
                </CardBody>
                <CardFooter className="!justify-start">
                  <TrackedLink
                    href="/templates"
                    event="share_page_viewed"
                    metadata={{ source: "template_detail_back" }}
                  >
                    <Button size="sm" variant="ghost">
                      Browse all templates
                    </Button>
                  </TrackedLink>
                </CardFooter>
              </CardShell>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sidebar key/value row
// ---------------------------------------------------------------------------

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="t-caption text-[#8E8E93]">{label}</span>
      <span
        className={`t-caption text-[#111] text-right ${mono ? "font-mono" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}

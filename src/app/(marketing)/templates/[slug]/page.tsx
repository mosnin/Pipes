import { notFound } from "next/navigation";
import { Button, Card, CardContent, Chip, Separator } from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Cpu,
  GitBranch,
  ShieldCheck,
  Wrench,
  UserCheck,
  Zap,
  LogIn,
  LogOut,
} from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { starterTemplates } from "@/domain/templates/catalog";
import { TrackedLink } from "@/components/marketing/TrackedLink";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function complexityChipVariant(c: string): "primary" | "secondary" | "soft" {
  if (c === "simple") return "soft";
  if (c === "advanced") return "primary";
  return "secondary";
}

function complexityColor(c: string): "success" | "default" | "warning" {
  if (c === "simple") return "success";
  if (c === "advanced") return "warning";
  return "default";
}

function NodeIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 shrink-0";
  switch (type) {
    case "Input":         return <LogIn className={cls} />;
    case "Output":        return <LogOut className={cls} />;
    case "Agent":         return <Cpu className={cls} />;
    case "Tool":          return <Wrench className={cls} />;
    case "Trigger":       return <Zap className={cls} />;
    case "Decision":      return <GitBranch className={cls} />;
    case "Action":        return <ArrowRight className={cls} />;
    case "Guardrail":     return <ShieldCheck className={cls} />;
    case "HumanApproval": return <UserCheck className={cls} />;
    default:              return <Box className={cls} />;
  }
}

function nodeColorClass(type: string): string {
  switch (type) {
    case "Input":         return "text-emerald-600";
    case "Output":        return "text-amber-600";
    case "Agent":         return "text-indigo-600";
    case "Tool":          return "text-violet-600";
    case "Trigger":       return "text-orange-500";
    case "Decision":      return "text-blue-600";
    case "Action":        return "text-green-600";
    case "Guardrail":     return "text-red-600";
    case "HumanApproval": return "text-yellow-600";
    default:              return "text-slate-500";
  }
}

const HOW_TO_STEPS = [
  {
    step: 1,
    title: "Sign up",
    body: "Create your free Pipes workspace — no credit card required.",
  },
  {
    step: 2,
    title: "Instantiate the template",
    body: "Open this template from the library and add it to your workspace with one click.",
  },
  {
    step: 3,
    title: "Customize for your needs",
    body: "Edit nodes, adjust connections, and configure each component to match your architecture.",
  },
] as const;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = publicContentService.getTemplate(slug);
  if (!template) return { title: "Template not found" };
  return {
    title: `${template.title} template · Pipes`,
    description: `${template.description} ${template.preview}`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = publicContentService.getTemplate(slug);
  if (!template) notFound();

  // Full catalog entry for node/pipe detail
  const catalogEntry = starterTemplates.find((t) => t.id === slug);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border-b border-slate-100 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm text-slate-500">
          <TrackedLink
            href="/templates"
            event="share_page_viewed"
            metadata={{ source: "template_detail_breadcrumb" }}
            className="hover:text-indigo-600 transition-colors"
          >
            Templates
          </TrackedLink>
          <span aria-hidden>/</span>
          <span className="text-slate-800 font-medium">{template.title}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-10">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="text-3xl font-bold text-slate-900 leading-tight flex-1 min-w-0">
              {template.title}
            </h1>
            <Chip
              size="sm"
              variant={complexityChipVariant(template.complexity)}
              color={complexityColor(template.complexity)}
              className="capitalize text-xs font-semibold shrink-0 self-start mt-1"
            >
              {template.complexity}
            </Chip>
          </div>

          <div className="flex flex-wrap gap-2">
            <Chip size="sm" variant="soft" color="default" className="text-xs text-slate-600">
              {template.category}
            </Chip>
            <Chip size="sm" variant="soft" color="default" className="text-xs text-slate-600">
              {template.useCase}
            </Chip>
          </div>

          <p className="text-slate-600 text-base leading-relaxed max-w-2xl">
            {template.description}
          </p>
        </section>

        <Separator />

        {/* ── What's Included ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-5">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
            What&apos;s included
          </h2>

          {catalogEntry ? (
            <>
              <div className="flex flex-wrap gap-3">
                {catalogEntry.nodes.map((node) => (
                  <Card
                    key={node.id}
                    variant="secondary"
                    className="w-fit"
                  >
                    <CardContent className="flex flex-row items-center gap-2 py-2 px-3">
                      <span className={nodeColorClass(node.type)}>
                        <NodeIcon type={node.type} />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-700 leading-snug">
                          {node.title}
                        </span>
                        <span className="text-xs text-slate-400">{node.type}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <p className="text-sm text-slate-500 font-mono">
                {catalogEntry.nodes.length} nodes &middot; {catalogEntry.pipes.length} connections
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500 font-mono">{template.preview}</p>
          )}
        </section>

        <Separator />

        {/* ── Best For ────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
            Best for
          </h2>
          <Card variant="secondary" className="border border-indigo-100 bg-indigo-50">
            <CardContent className="p-5">
              <p className="text-slate-700 text-sm leading-relaxed">
                <span className="font-semibold text-indigo-700">{template.useCase}</span>
                {" "}— Teams working on{" "}
                {template.category.toLowerCase()} systems who need a reliable, validated
                starting point. This template covers the core flow and can be extended with
                additional nodes and integrations.
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* ── How to Use ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-5">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
            How to use
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_TO_STEPS.map(({ step, title, body }) => (
              <Card
                key={step}
                variant="secondary"
                className="border border-slate-200 bg-white"
              >
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold shrink-0">
                    {step}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Flow preview ────────────────────────────────────────────────── */}
        {catalogEntry && (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              Flow preview
            </h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                {catalogEntry.nodes.map((node, i) => (
                  <div key={node.id} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm ${nodeColorClass(node.type)}`}>
                        <NodeIcon type={node.type} />
                      </div>
                      <span className="text-xs font-medium text-slate-700 text-center max-w-[72px] leading-tight">
                        {node.title}
                      </span>
                      <span className="text-[10px] text-slate-400">{node.type}</span>
                    </div>
                    {i < catalogEntry.nodes.length - 1 && (
                      <div className="flex flex-col items-center mb-6">
                        <ArrowRight className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <Separator />

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <section className="flex flex-col items-center gap-4 py-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Ready to use this template?
          </h2>
          <p className="text-slate-500 text-sm max-w-sm">
            Sign up free and instantiate this template in your workspace in seconds.
          </p>
          <TrackedLink
            href={`/signup?template=${template.slug}`}
            event="public_template_instantiate_clicked"
            metadata={{ templateId: template.id, source: "template_detail" }}
          >
            <Button
              size="lg"
              variant="primary"
              className="font-bold px-10 shadow-md"
            >
              Use this template
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </TrackedLink>
          <p className="text-xs text-slate-400">Free forever · No credit card required</p>
        </section>

        {/* ── Back link ───────────────────────────────────────────────────── */}
        <div>
          <TrackedLink
            href="/templates"
            event="share_page_viewed"
            metadata={{ source: "template_detail_back" }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-indigo-600 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to templates
            </Button>
          </TrackedLink>
        </div>

      </div>
    </div>
  );
}

import { Button, Card, CardContent, CardFooter, CardHeader, Separator, Chip } from "@heroui/react";
import { ArrowRight, GitBranch } from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes templates",
  description: "Discover reusable system templates for multi-agent, automation, support, and architecture workflows."
};

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

const CATEGORIES = ["Simple", "Standard", "Advanced"] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const templates = publicContentService.listTemplates();

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-slate-50 to-white pt-20 pb-12 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm mb-6">
            <GitBranch className="w-4 h-4 text-indigo-500" />
            Ready-to-use system designs
          </div>
          <h1 className="text-4xl font-bold text-center text-slate-900 leading-tight">
            Start with a template
          </h1>
          <p className="mt-3 text-lg text-slate-500 text-center">
            Pre-built system designs for common AI workflows
          </p>

          {/* ── Category filter chips (decorative) ──────────────────────── */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-slate-400 mr-1">Filter by complexity:</span>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                variant={complexityChipVariant(cat.toLowerCase())}
                color={complexityColor(cat.toLowerCase())}
                size="sm"
                className="cursor-default capitalize text-sm font-medium"
              >
                {cat}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Template grid ────────────────────────────────────────────────── */}
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col"
              >
                <CardHeader className="pb-2 flex flex-col items-start gap-2">
                  <div className="flex w-full items-start justify-between gap-2">
                    <h2 className="font-bold text-slate-900 text-base leading-snug">
                      {template.title}
                    </h2>
                    <Chip
                      size="sm"
                      variant={complexityChipVariant(template.complexity)}
                      color={complexityColor(template.complexity)}
                      className="shrink-0 capitalize text-xs font-semibold"
                    >
                      {template.complexity}
                    </Chip>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Chip
                      size="sm"
                      variant="soft"
                      color="default"
                      className="text-xs text-slate-600"
                    >
                      {template.category}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="soft"
                      color="default"
                      className="text-xs text-slate-600"
                    >
                      {template.useCase}
                    </Chip>
                  </div>
                </CardHeader>

                <CardContent className="pt-1 pb-3 flex flex-col gap-2 flex-1">
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {template.description}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-auto pt-2">
                    {template.preview}
                  </p>
                </CardContent>

                <Separator />

                <CardFooter className="gap-2 pt-3">
                  <TrackedLink
                    href={`/templates/${template.slug}`}
                    event="template_detail_viewed"
                    metadata={{ source: "templates_index", templateId: template.id }}
                  >
                    <Button size="sm" variant="outline" className="text-slate-700 font-medium">
                      View details
                    </Button>
                  </TrackedLink>
                  <TrackedLink
                    href={`/signup?template=${template.slug}`}
                    event="public_template_instantiate_clicked"
                    metadata={{ source: "templates_index", templateId: template.id }}
                  >
                    <Button size="sm" variant="primary" className="font-medium">
                      Use template
                    </Button>
                  </TrackedLink>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* ── Bottom CTA ────────────────────────────────────────────────── */}
          <div className="mt-16 text-center">
            <Separator className="mb-10" />
            <p className="text-slate-500 text-base mb-4">
              Don&apos;t see what you need?
            </p>
            <TrackedLink
              href="/signup"
              event="homepage_cta_clicked"
              metadata={{ location: "templates_bottom_cta" }}
            >
              <Button
                variant="ghost"
                className="font-semibold text-base text-indigo-600 hover:text-indigo-700"
              >
                Build from scratch
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </TrackedLink>
          </div>
        </div>
      </section>

    </div>
  );
}

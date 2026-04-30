"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Boxes, GitBranch, Layers, Sparkles } from "lucide-react";
import {
  Button,
  CardShell,
  CardBody,
  CardFooter,
  EmptyState,
  MetricCard,
  SearchInput,
  SegmentedControl,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui";
import { TrackedLink } from "@/components/marketing/TrackedLink";

type TemplateMarketing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  useCase: string;
  complexity: string;
  preview: string;
};

function complexityTone(c: string): StatusBadgeTone {
  if (c === "simple") return "success";
  if (c === "advanced") return "warning";
  return "info";
}

export function TemplatesGallery({ templates }: { templates: TemplateMarketing[] }) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => set.add(t.category));
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [{ id: "all", label: "All" }, ...sorted.map((c) => ({ id: c, label: c }))];
  }, [templates]);

  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesCategory = filter === "all" || t.category === filter;
      if (!matchesCategory) return false;
      if (q.length === 0) return true;
      const haystack = [t.title, t.description, t.category, t.useCase, t.complexity]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [templates, filter, query]);

  const advancedCount = templates.filter((t) => t.complexity === "advanced").length;
  const standardCount = templates.filter((t) => t.complexity === "standard").length;
  const simpleCount = templates.filter((t) => t.complexity === "simple").length;

  return (
    <main className="min-h-screen bg-white">
      <section className="surface-subtle border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
          <div className="flex flex-col gap-4 max-w-2xl">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-black/[0.08] bg-white px-2.5 py-1 t-caption text-[#3C3C43] shadow-xs">
              <Sparkles size={12} className="text-indigo-600" aria-hidden="true" />
              Production-ready system blueprints
            </span>
            <h1 className="t-h1 text-[#111]">Templates</h1>
            <p className="t-body text-[#3C3C43]">
              Pre-built, validated system designs you can fork into your workspace in seconds. Each template ships with typed nodes, pipes, and a reviewable graph.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Total templates"
              value={templates.length}
              icon={<Boxes size={14} aria-hidden="true" />}
              footer="Curated by the Pipes team"
            />
            <MetricCard
              label="Simple"
              value={simpleCount}
              icon={<Layers size={14} aria-hidden="true" />}
              footer="Quickstart blueprints"
            />
            <MetricCard
              label="Standard"
              value={standardCount}
              icon={<GitBranch size={14} aria-hidden="true" />}
              footer="Multi-step workflows"
            />
            <MetricCard
              label="Advanced"
              value={advancedCount}
              icon={<Sparkles size={14} aria-hidden="true" />}
              footer="Multi-agent systems"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-black/[0.06] sticky top-0 z-20 backdrop-blur-md bg-white/85">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search templates by name, category, or use case"
            />
          </div>
          <div className="overflow-x-auto">
            <SegmentedControl items={categories} value={filter} onChange={setFilter} size="sm" />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        {visible.length === 0 ? (
          <EmptyState
            title="No templates match your filters"
            description="Try a different category or clear your search."
            action={
              <Button
                variant="outline"
                onPress={() => {
                  setFilter("all");
                  setQuery("");
                }}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}

        <div className="mt-16 border-t border-black/[0.06] pt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="t-title text-[#111]">Need a custom template?</h2>
            <p className="mt-1 t-label text-[#3C3C43]">
              Start from a blank canvas and let the AI assistant scaffold the system for you.
            </p>
          </div>
          <TrackedLink
            href="/signup"
            event="homepage_cta_clicked"
            metadata={{ location: "templates_bottom_cta" }}
          >
            <Button variant="primary">
              Build from scratch
              <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
            </Button>
          </TrackedLink>
        </div>
      </section>
    </main>
  );
}

function TemplateCard({ template }: { template: TemplateMarketing }) {
  const tone = complexityTone(template.complexity);
  const complexityLabel =
    template.complexity.charAt(0).toUpperCase() + template.complexity.slice(1);

  return (
    <CardShell className="hover-lift transition-shadow flex flex-col h-full">
      <div className="flex flex-col h-full">
        <CardBody className="flex flex-col gap-3 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="t-title text-[#111] leading-snug">{template.title}</h3>
            <StatusBadge tone={tone}>{complexityLabel}</StatusBadge>
          </div>

          <p className="t-label text-[#3C3C43] leading-relaxed line-clamp-3">
            {template.description}
          </p>

          <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-md border border-black/[0.06] bg-white px-1.5 py-0.5 t-caption text-[#3C3C43]">
              {template.category}
            </span>
            <span className="inline-flex items-center rounded-md border border-black/[0.06] bg-white px-1.5 py-0.5 t-caption text-[#3C3C43]">
              {template.useCase}
            </span>
          </div>
        </CardBody>

        <CardFooter className="!justify-between">
          <span className="t-caption text-[#8E8E93] font-mono">{template.preview}</span>
          <TrackedLink
            href={`/templates/${template.slug}`}
            event="template_detail_viewed"
            metadata={{ source: "templates_index", templateId: template.id }}
          >
            <Button size="sm" variant="ghost">
              Details
              <ArrowRight size={12} className="ml-1" aria-hidden="true" />
            </Button>
          </TrackedLink>
        </CardFooter>
      </div>
    </CardShell>
  );
}

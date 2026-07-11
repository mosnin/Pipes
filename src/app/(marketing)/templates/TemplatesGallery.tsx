"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  Button,
  EmptyState,
  MetricCard,
  SearchInput,
} from "@/components/ui";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { EmptyTemplates } from "@/components/illustrations";
import { TemplatePreviewCard } from "@/components/marketing/TemplatePreviewCard";
import {
  TemplateFilterRail,
  type TemplateFilterValue,
} from "@/components/marketing/TemplateFilterRail";
import { starterTemplates } from "@/domain/templates/catalog";

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

export function TemplatesGallery({ templates }: { templates: TemplateMarketing[] }) {
  const reduced = useReducedMotion();

  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => set.add(t.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const useCases = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => set.add(t.useCase));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const [filter, setFilter] = useState<TemplateFilterValue>({
    category: "all",
    complexity: "all",
    useCase: "all",
  });
  const [query, setQuery] = useState<string>("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (filter.category !== "all" && t.category !== filter.category) return false;
      if (filter.complexity !== "all" && t.complexity !== filter.complexity) return false;
      if (filter.useCase !== "all" && t.useCase !== filter.useCase) return false;
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

  // Index catalog data by id for previews. The catalog has full node + pipe
  // definitions; the marketing summary does not.
  const catalogById = useMemo(() => {
    const map = new Map<
      string,
      {
        nodes: ReadonlyArray<{ id: string; title: string; x: number; y: number; type: string }>;
        pipes: ReadonlyArray<{ fromNodeId: string; toNodeId: string }>;
      }
    >();
    for (const t of starterTemplates) {
      map.set(t.id, { nodes: t.nodes, pipes: t.pipes });
    }
    return map;
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero panel rounded-[40px] surface-subtle */}
      <section className="px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="relative overflow-hidden rounded-[40px] surface-subtle border border-black/[0.04] px-6 py-12 sm:px-12 sm:py-16"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.6]"
              style={{
                backgroundImage:
                  "radial-gradient(60% 60% at 85% 20%, rgba(79,70,229,0.06) 0%, rgba(79,70,229,0) 70%)",
              }}
            />
            <div className="relative flex flex-col gap-5 max-w-2xl">
              <span className="t-overline text-[#8E8E93]">Starters</span>
              <h1 className="t-display text-[#111]">
                Start with a sentence. Edit on the canvas.
              </h1>
              <p className="t-body text-[#3C3C43]">
                Each card opens with a prompt that builds itself in seconds. Edit on the canvas after the agent draws.
              </p>
            </div>

            <div className="relative mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Total starters"
                value={templates.length}
                footer="Curated by the Pipes team"
              />
              <MetricCard
                label="Simple"
                value={simpleCount}
                footer="One-prompt builds"
              />
              <MetricCard
                label="Standard"
                value={standardCount}
                footer="Multi-step builds"
              />
              <MetricCard
                label="Advanced"
                value={advancedCount}
                footer="Multi-agent builds"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sticky toolbar */}
      <section className="sticky top-0 z-20 backdrop-blur-md bg-white/85 border-b border-black/[0.04] mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search starters by name, category, or use case"
            />
          </div>
          <span className="t-caption text-[#8E8E93] tabular-nums shrink-0 hidden sm:inline">
            {visible.length} of {templates.length}
          </span>
        </div>
      </section>

      {/* 2-column layout: left filter rail, right grid */}
      <section className="px-4 sm:px-6 mt-6 sm:mt-8 pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <TemplateFilterRail
              categories={categories}
              useCases={useCases}
              value={filter}
              onChange={setFilter}
              counts={{
                simple: simpleCount,
                standard: standardCount,
                advanced: advancedCount,
              }}
            />

            <div className="flex-1 min-w-0">
              {visible.length === 0 ? (
                <EmptyState
                  illustration={<EmptyTemplates size={96} />}
                  title="No starter matches that filter"
                  description="Clear filters or describe your own."
                  action={
                    <Button
                      variant="outline"
                      onPress={() => {
                        setFilter({
                          category: "all",
                          complexity: "all",
                          useCase: "all",
                        });
                        setQuery("");
                      }}
                    >
                      Reset filters
                    </Button>
                  }
                />
              ) : (
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5"
                >
                  <AnimatePresence mode="popLayout">
                    {visible.map((template, idx) => (
                      <motion.div
                        key={template.id}
                        layout
                        initial={reduced ? false : { opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 4 }}
                        transition={{
                          duration: 0.3,
                          ease: [0.2, 0.8, 0.2, 1],
                          delay: reduced ? 0 : Math.min(idx, 9) * 0.03,
                        }}
                      >
                        <TemplatePreviewCard
                          id={template.id}
                          slug={template.slug}
                          title={template.title}
                          description={template.description}
                          category={template.category}
                          useCase={template.useCase}
                          complexity={template.complexity}
                          preview={template.preview}
                          catalog={catalogById.get(template.id) ?? null}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Bottom panel */}
              <div className="mt-14">
                <div className="rounded-[40px] bg-violet-50 border border-violet-100 px-6 py-10 sm:px-10 sm:py-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1.5 max-w-md">
                    <h2 className="t-h3 text-[#111]">
                      Want a system that is not on this list?
                    </h2>
                    <p className="t-label text-[#3C3C43]">
                      Open a fresh canvas. Type one sentence. The agent draws it.
                    </p>
                  </div>
                  <TrackedLink
                    href="/signup"
                    event="homepage_cta_clicked"
                    metadata={{ location: "templates_bottom_cta" }}
                  >
                    <Button variant="primary">
                      Describe your own
                      <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
                    </Button>
                  </TrackedLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

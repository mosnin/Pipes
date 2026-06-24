import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  Breadcrumbs,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { starterTemplates } from "@/domain/templates/catalog";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { TemplateDetailHero } from "@/components/marketing/TemplateDetailHero";
import { TemplateNodeBreakdown } from "@/components/marketing/TemplateNodeBreakdown";
import { TemplateInlineRun } from "@/components/marketing/TemplateInlineRun";
import { TemplateUseCTA } from "@/components/marketing/TemplateUseCTA";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function complexityTone(c: string): StatusBadgeTone {
  if (c === "simple") return "success";
  if (c === "advanced") return "warning";
  return "info";
}

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
  if (!template) return { title: "Starter not found" };
  return {
    title: `${template.title} starter - Looper`,
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

  const titleLookup = new Map<string, string>(
    (catalogEntry?.nodes ?? []).map((n) => [n.id, n.title]),
  );

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Breadcrumb bar */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <Breadcrumbs
            items={[
              { label: "Starters", href: "/templates" },
              { label: template.title },
            ]}
          />
        </div>
      </div>

      {/* 1. Detail hero with autoplay canvas */}
      <TemplateDetailHero
        slug={template.slug}
        templateId={template.id}
        title={template.title}
        description={template.description}
        category={template.category}
        useCase={template.useCase}
        complexity={template.complexity}
        catalog={
          catalogEntry
            ? { nodes: catalogEntry.nodes, pipes: catalogEntry.pipes }
            : null
        }
      />

      {/* 1b. Inline runnable canvas */}
      {catalogEntry && (
        <TemplateInlineRun
          templateId={template.id}
          slug={template.slug}
          title={template.title}
        />
      )}

      {/* 2. Node breakdown */}
      {catalogEntry && (
        <div className="mt-12 sm:mt-16">
          <TemplateNodeBreakdown nodes={catalogEntry.nodes} />
        </div>
      )}

      {/* 3. Looper section */}
      {catalogEntry && catalogEntry.pipes.length > 0 && (
        <section className="mt-12 sm:mt-16 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[32px] bg-white border border-black/[0.06] px-6 py-10 sm:px-10 sm:py-12">
              <div className="mb-6 flex flex-col gap-1.5 max-w-2xl">
                <span className="t-overline text-[#8E8E93]">Connections</span>
                <h2 className="t-h2 text-[#111]">How the pieces connect.</h2>
                <p className="t-label text-[#3C3C43]">
                  Every pipe is typed. Every handoff is explicit.
                </p>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {catalogEntry.pipes.map((pipe, idx) => {
                  const from = titleLookup.get(pipe.fromNodeId) ?? pipe.fromNodeId;
                  const to = titleLookup.get(pipe.toNodeId) ?? pipe.toNodeId;
                  return (
                    <li
                      key={`${pipe.fromNodeId}-${pipe.toNodeId}-${idx}`}
                      className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-[#FAFAFA] px-4 py-3"
                    >
                      <span className="t-label font-medium text-[#111] truncate">
                        {from}
                      </span>
                      <ArrowRight
                        size={14}
                        aria-hidden="true"
                        className="text-violet-500 shrink-0"
                      />
                      <span className="t-label font-medium text-[#111] truncate">
                        {to}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* 4. Use case context */}
      <section className="mt-12 sm:mt-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[32px] bg-white border border-black/[0.06] px-6 py-10 sm:px-10 sm:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 flex flex-col gap-1.5">
                <span className="t-overline text-[#8E8E93]">When to reach for it</span>
                <h2 className="t-h2 text-[#111]">The right move when.</h2>
              </div>
              <div className="lg:col-span-8">
                <p className="t-body text-[#3C3C43] leading-relaxed">
                  <span className="font-semibold text-[#111]">{template.useCase}</span>{" "}
                  Reach for this starter when you want the typed nodes already in place and
                  the connections already drawn. Open it, press return, edit the bits that
                  do not match your stack.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Related starters */}
      {related.length > 0 && (
        <section className="mt-12 sm:mt-16 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-1.5 max-w-2xl">
              <span className="t-overline text-[#8E8E93]">Related</span>
              <h2 className="t-h2 text-[#111]">Other {template.category.toLowerCase()} starters.</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <TrackedLink
                  key={r.id}
                  href={`/templates/${r.slug}`}
                  event="template_detail_viewed"
                  metadata={{ source: "template_related", templateId: r.id }}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 rounded-3xl"
                >
                  <article className="group h-full flex flex-col gap-3 rounded-3xl border border-black/[0.06] bg-white p-5 transition-all hover:border-black/[0.14] hover:shadow-sm-token">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="t-title text-[#111]">{r.title}</h3>
                      <StatusBadge tone={complexityTone(r.complexity)}>
                        {r.complexity.charAt(0).toUpperCase() + r.complexity.slice(1)}
                      </StatusBadge>
                    </div>
                    <p className="t-label text-[#3C3C43] line-clamp-3 leading-relaxed">
                      {r.description}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 t-label font-semibold text-violet-600 group-hover:text-violet-700 transition-colors">
                      Open
                      <ArrowRight size={12} aria-hidden="true" />
                    </span>
                  </article>
                </TrackedLink>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Final CTA */}
      <section className="mt-12 sm:mt-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[40px] bg-violet-600 text-white px-6 py-14 sm:px-12 sm:py-20 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 max-w-xl">
              <h2 className="t-h2 text-white">Start with this prompt.</h2>
              <p className="t-body text-white/85">
                Your dashboard opens with this starter pre-filled. Press return.
              </p>
            </div>
            <TemplateUseCTA templateId={template.id} slug={template.slug} />
          </div>
        </div>
      </section>
    </main>
  );
}

import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { Breadcrumbs, MetricCard } from "@/components/ui";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = publicContentService.getUseCase(slug);
  if (!entry) return { title: "Use case not found" };
  return {
    title: `${entry.title} - Pipes case study`,
    description: entry.fit,
  };
}

function ScreenshotPlaceholder({
  label,
  caption,
}: {
  label: string;
  caption: string;
}) {
  return (
    <div
      className="surface-muted relative aspect-[16/9] w-full overflow-hidden rounded-[12px] border border-dashed border-black/[0.14]"
      role="img"
      aria-label={`Screenshot placeholder: ${label}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md border border-black/[0.08] bg-white px-2 py-1">
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#FCA5A5]" />
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#FCD34D]" />
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#86EFAC]" />
        <span className="ml-1.5 t-mono text-[#3C3C43]" style={{ fontSize: 11 }}>
          {label}
        </span>
      </div>
      <div className="absolute bottom-4 left-4 right-4 t-caption text-[#8E8E93]">
        {caption}
      </div>
    </div>
  );
}

export default async function UseCaseDetailPage({
  params,
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
    <div className="bg-white">
      {/* Breadcrumbs strip */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Breadcrumbs
            items={[
              { label: "Customers", href: "/use-cases" },
              { label: entry.title },
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <section className="border-b border-black/[0.06] bg-white py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <SectionBadge label="Case study" />
          <h1
            className="mt-5 text-[#111] max-w-3xl"
            style={{
              fontSize: 52,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontWeight: 700,
            }}
          >
            {entry.title}
          </h1>
          <p className="mt-5 t-body text-[#3C3C43] max-w-2xl">
            {entry.fit}
          </p>

          <p className="mt-10 t-overline text-[#8E8E93]">
            Built in conversation, not on a whiteboard.
          </p>

          {/* Persona quote bar */}
          <div className="mt-3 rounded-[12px] border border-black/[0.08] bg-[#FAFAFA] p-6 flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#111] text-white t-label font-semibold shrink-0">
              {entry.title
                .split(" ")
                .slice(0, 2)
                .map((s) => s[0])
                .join("")
                .toUpperCase()}
            </span>
            <div>
              <blockquote className="t-body text-[#111] italic" style={{ letterSpacing: "-0.005em" }}>
                &quot;I typed a sentence and the system appeared. We stopped
                drawing diagrams and started shipping.&quot;
              </blockquote>
            </div>
          </div>

          <p className="mt-4 t-caption text-[#8E8E93]">
            Why this matters: describe your system. Watch it build itself.
          </p>
        </div>
      </section>

      {/* Two-column layout */}
      <section className="bg-white py-16 px-6">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-10">
          <div className="flex flex-col gap-12">
            {/* Problem */}
            <section>
              <SectionBadge label="The problem" tone="neutral" />
              <h2
                className="mt-3 t-h2 text-[#111]"
                style={{ letterSpacing: "-0.02em" }}
              >
                Where teams get stuck.
              </h2>
              <p className="mt-3 t-body text-[#3C3C43]">{entry.problem}</p>
              <ScreenshotPlaceholder
                label="problem_state.png"
                caption="Before Pipes: drift between architecture and runtime"
              />
            </section>

            {/* How Pipes fits */}
            <section>
              <SectionBadge label="How Pipes fits" />
              <h2
                className="mt-3 t-h2 text-[#111]"
                style={{ letterSpacing: "-0.02em" }}
              >
                How Pipes fits.
              </h2>
              <p className="mt-3 t-body text-[#3C3C43]">{entry.fit}</p>
              <ScreenshotPlaceholder
                label="pipes_canvas.png"
                caption="Typed nodes and ports captured on a versioned canvas"
              />
            </section>

            {/* Walkthrough */}
            <section>
              <SectionBadge label="Walkthrough" tone="neutral" />
              <h2
                className="mt-3 t-h2 text-[#111]"
                style={{ letterSpacing: "-0.02em" }}
              >
                Step by step.
              </h2>
              <ol className="mt-5 flex flex-col gap-3">
                {entry.workflow.map((step, i) => (
                  <li
                    key={step}
                    className="flex items-start gap-3 rounded-[12px] border border-black/[0.08] bg-white p-4"
                  >
                    <span className="t-mono shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/[0.08] bg-[#FAFAFA] text-[#3C3C43]" style={{ fontSize: 12 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="t-label text-[#3C3C43] leading-relaxed">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Results */}
            <section>
              <SectionBadge label="Results" />
              <h2
                className="mt-3 t-h2 text-[#111]"
                style={{ letterSpacing: "-0.02em" }}
              >
                What changes once it ships.
              </h2>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard
                  label="Re-prompting"
                  value="-87%"
                  delta="vs baseline"
                  deltaTone="up"
                />
                <MetricCard
                  label="Time to handoff"
                  value="3.2x"
                  delta="faster"
                  deltaTone="up"
                />
                <MetricCard
                  label="Contract drift"
                  value="0"
                  delta="caught at runtime"
                  deltaTone="flat"
                />
              </div>
            </section>
          </div>

          {/* Right rail */}
          <aside className="flex flex-col gap-5">
            <div className="rounded-[12px] border border-black/[0.08] bg-white p-5">
              <h3 className="t-overline text-[#8E8E93] mb-4">
                Starters that ship with this
              </h3>
              {templates.length === 0 && (
                <p className="t-label text-[#8E8E93]">No starters yet.</p>
              )}
              <div className="flex flex-col gap-3">
                {templates.map((template) => (
                  <TrackedLink
                    key={template.id}
                    href={`/templates/${template.slug}`}
                    event="template_detail_viewed"
                    metadata={{
                      source: "use_case",
                      useCase: entry.slug,
                      templateId: template.id,
                    }}
                    className="group flex items-start justify-between gap-2 rounded-md border border-black/[0.06] bg-white p-3 hover:border-black/[0.14] transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="t-label font-semibold text-[#111] group-hover:text-indigo-700 transition-colors">
                        {template.title}
                      </span>
                      <span className="t-caption text-[#8E8E93]">
                        {template.preview}
                      </span>
                    </div>
                    <ArrowUpRight
                      size={14}
                      className="mt-0.5 shrink-0 text-[#C7C7CC] group-hover:text-indigo-600 transition-colors"
                      aria-hidden="true"
                    />
                  </TrackedLink>
                ))}
              </div>
            </div>

            <div className="rounded-[12px] border border-indigo-100 bg-indigo-50 p-5">
              <CheckCircle2
                size={18}
                className="text-indigo-600"
                aria-hidden="true"
              />
              <h3 className="mt-3 t-title text-[#111]">Ready to ship this?</h3>
              <p className="mt-1.5 t-caption text-[#3C3C43] leading-relaxed">
                Open a starter prompt, watch the agent build, and hand it to your
                agents in under five minutes.
              </p>
              <TrackedLink
                href={`/signup?useCase=${entry.slug}`}
                event="signup_started"
                metadata={{ source: `use_case_${entry.slug}` }}
                className="mt-4 block"
              >
                <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#111] px-4 h-10 t-label font-semibold text-white hover:bg-indigo-700 transition-colors">
                  Start from this case
                  <ArrowRight size={13} aria-hidden="true" />
                </span>
              </TrackedLink>
              <TrackedLink
                href="/templates"
                event="templates_browse_clicked"
                metadata={{ source: `use_case_${entry.slug}` }}
                className="mt-2 block text-center t-caption font-medium text-indigo-700 hover:text-indigo-800 transition-colors"
              >
                Browse all starters
              </TrackedLink>
            </div>
          </aside>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="surface-inverse">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2
            className="text-white mx-auto max-w-2xl"
            style={{
              fontSize: 36,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              fontWeight: 700,
            }}
          >
            Make this your team&apos;s next system.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TrackedLink
              href={`/signup?useCase=${entry.slug}`}
              event="signup_started"
              metadata={{ source: `use_case_${entry.slug}_bottom` }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-5 h-11 t-label font-semibold text-[#111] hover:bg-[#F5F5F7] transition-colors">
                Start free
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </TrackedLink>
            <TrackedLink
              href="/contact?source=use_case_bottom"
              event="use_cases_contact_clicked"
              metadata={{ slug: entry.slug }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-transparent px-5 h-11 t-label font-semibold text-white hover:border-white/40 hover:bg-white/[0.04] transition-colors">
                Talk to sales
              </span>
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  );
}

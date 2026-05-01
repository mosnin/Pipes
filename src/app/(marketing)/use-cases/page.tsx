import { ArrowRight } from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export const metadata = {
  title: "Use cases - Pipes",
  description:
    "How teams ship multi-agent systems, support ops, and architecture handoffs with Pipes.",
};

export default function UseCasesPage() {
  const cases = publicContentService.listUseCases();
  const templates = publicContentService.listTemplates();

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-black/[0.06] bg-white pt-20 pb-14 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <SectionBadge label="Customers" />
          <h1
            className="mt-6 text-[#111] mx-auto"
            style={{
              fontSize: 52,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontWeight: 700,
            }}
          >
            How teams ship with Pipes.
          </h1>
          <p className="mt-5 t-body text-[#3C3C43] mx-auto max-w-xl">
            Real workloads from real teams. Pick a use case to see the system shape,
            workflow, and templates that ship with it.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-white py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cases.map((entry) => {
              const relatedCount = templates.filter((t) =>
                (entry.templateIds as readonly string[]).includes(t.id),
              ).length;

              return (
                <TrackedLink
                  key={entry.slug}
                  href={`/use-cases/${entry.slug}`}
                  event="use_case_viewed"
                  metadata={{ source: "use_cases_index", slug: entry.slug }}
                  className="group block h-full"
                >
                  <div className="flex h-full flex-col gap-4 rounded-[12px] border border-black/[0.08] bg-white p-6 transition-all duration-200 hover:border-black/[0.18] hover:shadow-sm-token">
                    <SectionBadge label={`${relatedCount} template${relatedCount !== 1 ? "s" : ""}`} tone="neutral" />
                    <h2 className="t-h3 text-[#111] group-hover:text-indigo-700 transition-colors">
                      {entry.title}
                    </h2>
                    <p className="t-label text-[#3C3C43] leading-relaxed flex-1">
                      {entry.problem}
                    </p>
                    <span className="inline-flex items-center gap-1 t-label font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                      View case study
                      <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </div>
                </TrackedLink>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="surface-subtle border-t border-black/[0.06] py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="t-h1 text-[#111]" style={{ letterSpacing: "-0.025em" }}>
            Don&apos;t see your workload?
          </h2>
          <p className="mt-4 t-body text-[#3C3C43]">
            Pipes adapts to any system shape. Talk to our team about how to model
            yours.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TrackedLink
              href="/signup?source=use_cases_cta"
              event="use_cases_cta_clicked"
              metadata={{ location: "use_cases_bottom" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#111] px-5 h-11 t-label font-semibold text-white hover:bg-indigo-700 transition-colors">
                Start free workspace
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </TrackedLink>
            <TrackedLink
              href="/contact?source=use_cases_cta"
              event="use_cases_contact_clicked"
              metadata={{ location: "use_cases_bottom" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-md border border-black/[0.14] bg-white px-5 h-11 t-label font-semibold text-[#111] hover:border-black/[0.24] hover:bg-black/[0.02] transition-colors">
                Talk to sales
              </span>
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  );
}

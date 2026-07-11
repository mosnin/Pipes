import Link from "next/link";
import { SectionBadge } from "@/components/marketing/SectionBadge";
import { caseStudies } from "@/lib/marketing/customers-data";

export const metadata = {
  title: "Scenarios - Pipes",
  description:
    "Example scenarios showing how engineering, support, sales, data, and operations teams describe multi-agent systems with Pipes.",
};

const CATEGORY_ORDER = ["Engineering", "Support", "Sales", "Data", "Operations"] as const;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Engineering: "Ship multi-agent architectures your team can read and your agents can run.",
  Support: "Capture triage, routing, and escalation as a typed graph — not a doc.",
  Sales: "Hand off a token, not a PDF. Clients read the same map their agent runs.",
  Data: "Ingestion, enrichment, and audit checkpoints on one diagram.",
  Operations: "On-call runbooks your agents and humans read the same way.",
};

type Category = (typeof CATEGORY_ORDER)[number];

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, string> = {
    Engineering: "⚙",
    Support: "↗",
    Sales: "◇",
    Data: "≡",
    Operations: "○",
  };
  return <span aria-hidden>{icons[category] ?? "·"}</span>;
}

export default function UseCasesPage() {
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    description: CATEGORY_DESCRIPTIONS[cat],
    studies: caseStudies.filter((s) => s.category === cat),
  }));

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] px-6 py-24 text-center sm:py-32">
            <SectionBadge label="Scenarios" />
            <h1
              className="mx-auto mt-6 max-w-3xl text-[#111]"
              style={{
                fontSize: 60,
                lineHeight: 1.04,
                letterSpacing: "-0.04em",
                fontWeight: 700,
              }}
            >
              Five workloads. One typed graph.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl t-body leading-relaxed text-[#3C3C43]">
              Example scenarios showing how different teams describe multi-agent systems with Pipes.
              Pick the discipline that looks like yours.
            </p>
            <p className="mt-4 t-caption text-[#8E8E93]">
              Illustrative scenarios — not real customers or testimonials.
            </p>
          </div>
        </div>
      </section>

      {/* SCENARIO GRID */}
      {byCategory.map(({ category, description, studies }) => (
        <section key={category} className="px-6 pt-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4F46E5]/10 text-[#4F46E5] text-lg">
                <CategoryIcon category={category} />
              </div>
              <div>
                <h2 className="t-h2 text-[#111]">{category}</h2>
                <p className="mt-1 t-body text-[#3C3C43]">{description}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {studies.map((study) => (
                <div
                  key={study.slug}
                  className="surface-subtle rounded-2xl border border-black/[0.06] p-6 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#4F46E5]/10 px-2.5 py-0.5 text-xs font-medium text-[#4F46E5]">
                      {category}
                    </span>
                    <span className="t-caption text-[#8E8E93]">Scenario</span>
                  </div>
                  <p className="t-label font-semibold text-[#111] leading-snug">{study.outcome}</p>
                  <p className="t-body text-[#3C3C43] leading-relaxed flex-1">{study.story}</p>
                  {study.useCaseSlug && (
                    <Link
                      href={`/use-cases/${study.useCaseSlug}`}
                      className="t-caption font-medium text-[#4F46E5] hover:underline mt-1"
                    >
                      See this use case {"→"}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="px-6 pt-24 pb-24">
        <div className="mx-auto max-w-6xl">
          <div
            className="flex flex-col items-start justify-between gap-8 rounded-[40px] p-10 text-white sm:flex-row sm:items-center sm:p-16"
            style={{ backgroundColor: "#4F46E5" }}
          >
            <div className="flex-1">
              <h2
                className="max-w-2xl"
                style={{
                  fontSize: 40,
                  lineHeight: 1.1,
                  letterSpacing: "-0.025em",
                  fontWeight: 700,
                }}
              >
                Build the first real story.
              </h2>
              <p className="mt-4 max-w-lg t-body text-white/80">
                Describe your system in a sentence. Pipes draws the graph. Your team and your agents
                read the same map. Ship it and tell us how it went.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <Link
                href="/signup?source=use_cases_cta"
                className="inline-flex h-12 items-center gap-1.5 rounded-full bg-white px-6 t-label font-semibold text-[#4F46E5] transition-colors hover:bg-white/90"
              >
                Start free
              </Link>
              <Link
                href="/contact?source=use_cases_contact"
                className="t-label font-semibold text-white/90 transition-colors hover:text-white"
              >
                Talk to us {"→"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

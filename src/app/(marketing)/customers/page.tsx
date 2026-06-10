import Link from "next/link";
import { SectionBadge } from "@/components/marketing/SectionBadge";
import { CustomerLogoWall } from "@/components/marketing/CustomerLogoWall";
import { CustomerCaseStudyGrid } from "@/components/marketing/CustomerCaseStudyGrid";
import { CustomerQuoteBlock } from "@/components/marketing/CustomerQuoteBlock";
import { MetricsStrip, type Metric } from "@/components/marketing/MetricsStrip";
import {
  customerLogos,
  customerStats,
  caseStudies,
  featuredQuote,
} from "@/lib/marketing/customers-data";

export const metadata = {
  title: "Customers - Pipes",
  description:
    "Teams shipping multi-agent systems on Pipes. Engineering, support, sales, data, and operations teams describe their systems and hand the graph to their agents.",
};

const STAT_METRICS: ReadonlyArray<Metric> = customerStats.map((stat) => ({
  value: stat.value,
  suffix: stat.suffix,
  label: stat.label,
  decimals: stat.value % 1 === 0 ? 0 : 1,
}));

export default function CustomersPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] px-6 py-24 text-center sm:py-32">
            <SectionBadge label="Customers" />
            <h1
              className="mx-auto mt-6 max-w-3xl text-[#111]"
              style={{
                fontSize: 60,
                lineHeight: 1.04,
                letterSpacing: "-0.04em",
                fontWeight: 700,
              }}
            >
              Teams shipping multi-agent systems on Pipes.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl t-body leading-relaxed text-[#3C3C43]">
              Five workloads. One typed graph their agents read. Pick the
              team that looks like yours.
            </p>
          </div>
        </div>
      </section>

      {/* LOGO WALL */}
      <section className="px-6 pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 className="t-h2 text-[#111]">Teams already shipping</h2>
            <span className="t-caption text-[#8E8E93]">
              Selected customers, with permission
            </span>
          </div>
          <CustomerLogoWall logos={customerLogos} />
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="pt-20">
        <MetricsStrip metrics={STAT_METRICS} />
      </section>

      {/* CASE STUDY GRID */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <SectionBadge label="Stories" />
            <h2 className="mt-4 t-h1 text-[#111]">
              How they describe their systems.
            </h2>
            <p className="mt-4 t-body leading-relaxed text-[#3C3C43]">
              Pick a discipline. Read the team that ships in it. Hand the same
              shape to your team next week.
            </p>
          </div>
          <CustomerCaseStudyGrid studies={caseStudies} />
        </div>
      </section>

      {/* FEATURED QUOTE */}
      <section className="px-6 pt-32">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] px-6 py-24 sm:px-16 sm:py-28">
            <CustomerQuoteBlock quote={featuredQuote} />
          </div>
        </div>
      </section>

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
                Be the next story we tell.
              </h2>
              <p className="mt-4 max-w-lg t-body text-white/80">
                Describe your system in a sentence. Ship the graph. Send us a
                note when your team reads it the same way their agent does.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <Link
                href="/signup?source=customers_cta"
                className="inline-flex h-12 items-center gap-1.5 rounded-full bg-white px-6 t-label font-semibold text-[#4F46E5] transition-colors hover:bg-white/90"
              >
                Start free
              </Link>
              <Link
                href="/contact?source=customers_contact"
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

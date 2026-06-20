import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { CompareHero } from "@/components/marketing/CompareHero";
import { CompareCard } from "@/components/marketing/CompareCard";

export const metadata = {
  title: "Looper vs the alternatives - Looper",
  description:
    "Looper vs Figma, Miro, Lucidchart, and AI-generated diagrams. Honest, head-to-head.",
};

export default function CompareIndexPage() {
  const comparisons = publicContentService.listComparisons();

  return (
    <main className="min-h-screen bg-white pb-16">
      {/* Hero */}
      <CompareHero comparisonCount={comparisons.length} />

      {/* 3-column grid of refined cards */}
      <section
        className="px-4 sm:px-6 mt-10 sm:mt-14"
        aria-label="Comparisons"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {comparisons.map((item) => {
              const competitor = item.title.replace(/^Looper vs\.?\s*/i, "").trim();
              return (
                <CompareCard
                  key={item.slug}
                  slug={item.slug}
                  title={item.title}
                  competitor={competitor}
                  summary={item.summary}
                  difference={item.differences[0] ?? ""}
                  differenceCount={item.differences.length}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Final strip */}
      <section className="px-4 sm:px-6 mt-12">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[32px] bg-white border border-black/[0.06] px-6 py-8 sm:px-10 sm:py-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="t-h3 text-[#111]">Not sure which fits?</h2>
              <p className="t-label text-[#3C3C43]">
                Open a fresh workspace. Describe your system. Decide in five minutes.
              </p>
            </div>
            <TrackedLink
              href="/signup?source=compare_index"
              event="signup_started"
              metadata={{ source: "compare_index_cta" }}
            >
              <Button variant="primary">
                Start free
                <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
              </Button>
            </TrackedLink>
          </div>
        </div>
      </section>
    </main>
  );
}

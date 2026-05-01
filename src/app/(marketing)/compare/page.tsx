import { ArrowRight } from "lucide-react";
import {
  Button,
  CardShell,
  CardBody,
  CardFooter,
  CardHeader,
  StatusBadge,
} from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes vs the alternatives - Pipes",
  description:
    "Pipes vs Figma, Miro, Lucidchart, and AI-generated diagrams. Honest, head-to-head.",
};

export default function CompareIndexPage() {
  const comparisons = publicContentService.listComparisons();

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="surface-subtle border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-12">
          <div className="flex flex-col gap-4 max-w-2xl">
            <h1 className="t-h1 text-[#111]">Pipes vs the alternatives.</h1>
            <p className="t-body text-[#3C3C43]">
              Where Pipes wins, where the others lead, and how to choose for your team.
            </p>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisons.map((item) => {
            const competitor = item.title.replace(/^Pipes vs\.?\s*/i, "").trim();
            return (
              <CardShell
                key={item.slug}
                className="hover-lift transition-shadow flex flex-col h-full"
              >
                <div className="flex flex-col h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CompetitorLogo name={competitor} />
                      <StatusBadge tone="neutral">Comparison</StatusBadge>
                    </div>
                  </CardHeader>
                  <CardBody className="flex flex-col gap-2 flex-1">
                    <h3 className="t-title text-[#111]">{item.title}</h3>
                    <p className="t-label text-[#3C3C43] leading-relaxed">{item.summary}</p>
                  </CardBody>
                  <CardFooter className="!justify-between">
                    <span className="t-caption text-[#8E8E93]">
                      {item.differences.length} key differences
                    </span>
                    <TrackedLink
                      href={`/compare/${item.slug}`}
                      event="comparison_page_viewed"
                      metadata={{ source: "compare_index", slug: item.slug }}
                    >
                      <Button size="sm" variant="ghost">
                        Compare
                        <ArrowRight size={12} className="ml-1" aria-hidden="true" />
                      </Button>
                    </TrackedLink>
                  </CardFooter>
                </div>
              </CardShell>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 border-t border-black/[0.06] pt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="t-title text-[#111]">Ready to evaluate Pipes for your team?</h2>
            <p className="mt-1 t-label text-[#3C3C43]">
              Spin up a free workspace and see how it fits your architecture workflow.
            </p>
          </div>
          <TrackedLink
            href="/signup?source=compare_index"
            event="signup_started"
            metadata={{ source: "compare_index_cta" }}
          >
            <Button variant="primary">
              Try Pipes free
              <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
            </Button>
          </TrackedLink>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Competitor monogram (logo placeholder)
// ---------------------------------------------------------------------------

function CompetitorLogo({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#111] text-white t-label font-bold">
        P
      </span>
      <span className="t-caption text-[#8E8E93]">vs</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F5F5F7] border border-black/[0.06] text-[#111] t-label font-bold">
        {initial}
      </span>
    </div>
  );
}

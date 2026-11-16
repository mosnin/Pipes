import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section } from "@/components/marketing/section";
import { publicContentService } from "@/domain/services/public";

export function generateStaticParams() {
  return publicContentService.listComparisons().map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = publicContentService.getComparison(slug);
  if (!entry) return { title: "Comparison not found" };
  return { title: entry.title, description: entry.summary };
}

export default async function CompareDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = publicContentService.getComparison(slug);
  if (!entry) notFound();

  return (
    <MarketingShell>
      <PageIntro
        kicker={
          <TrackedLink
            href="/compare"
            event="comparison_page_viewed"
            metadata={{ source: "compare_back", slug: entry.slug }}
            className="hover:text-ink"
          >
            Compare
          </TrackedLink>
        }
        title={entry.title}
        lead={entry.summary}
      >
        <div className="flex flex-wrap gap-4">
          <CutButton
            href="/signup?source=compare_page"
            track={{ event: "signup_started", metadata: { source: `compare_${entry.slug}` } }}
          >
            Try Pipes
          </CutButton>
        </div>
      </PageIntro>

      <Section className="pt-0" labelledBy="differs-heading">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h2 id="differs-heading" className="t-label-caps text-ink-3">
              Where Pipes differs
            </h2>
            <ul className="divide-y divide-hairline border-y border-hairline">
              {entry.differences.map((difference) => (
                <li key={difference} className="t-mk-body py-5 text-ink">
                  {difference}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-6">
              <h2 className="t-label-caps text-ink-3">When the other choice is better</h2>
              <p className="t-mk-body max-w-[52ch] text-pretty text-ink-2">{entry.otherFit}</p>
            </div>
            <div className="flex flex-col gap-6">
              <h2 className="t-label-caps text-ink-3">Where Pipes fits</h2>
              <p className="t-mk-h4 max-w-[36ch] text-pretty text-ink">{entry.bestFor}</p>
            </div>
          </div>
        </Container>
      </Section>

      <FinalCta source={`compare_${entry.slug}`} />
    </MarketingShell>
  );
}

import type { Metadata } from "next";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section } from "@/components/marketing/section";
import { publicContentService } from "@/domain/services/public";

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Where Pipes fits next to procedures written in docs and prompts, and next to automation tools like n8n and Zapier, and when each of them is the better choice.",
};

export default function CompareIndexPage() {
  const comparisons = publicContentService.listComparisons();
  return (
    <MarketingShell>
      <PageIntro
        kicker="Compare"
        title="Where Pipes fits next to the tools you already use."
        lead="Pipes keeps a workflow as steps people review and agents run, one step at a time, with approvals and a record of every run. That is a narrower job than a doc or an automation tool. These pages say plainly where the difference matters and where it does not."
      />
      <Section className="pt-0" labelledBy="page-title">
        <Container>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {comparisons.map((item) => (
              <li key={item.slug}>
                <TrackedLink
                  href={`/compare/${item.slug}`}
                  event="comparison_page_viewed"
                  metadata={{ source: "compare_index", slug: item.slug }}
                  className="focus-ring-canvas grid gap-1.5 rounded-4 px-1.5 py-6 transition-colors duration-[var(--dur-1)] hover:bg-state-hover focus-visible:outline-none md:grid-cols-[320px_1fr] md:gap-10"
                >
                  <span className="t-mk-h4 text-ink">{item.title}</span>
                  <span className="t-mk-body text-ink-2">{item.summary}</span>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
      <FinalCta source="compare_final" />
    </MarketingShell>
  );
}

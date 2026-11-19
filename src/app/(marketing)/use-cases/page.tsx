import type { Metadata } from "next";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section } from "@/components/marketing/section";
import { publicContentService } from "@/domain/services/public";

export const metadata: Metadata = {
  title: "Use cases",
  description:
    "Workflows teams hand to their agents in Pipes: support triage with a refund approval, code changes with a review loop, research with a human check, scheduled jobs and handoffs between agents.",
};

export default function UseCasesPage() {
  const cases = publicContentService.listUseCases();
  return (
    <MarketingShell>
      <PageIntro
        kicker="Use cases"
        title="The workflows teams hand to their agents."
        lead="Each of these starts as a problem that shows up once agents do real work: steps that drift, approvals nobody wrote down, jobs nobody can account for. Here is how a workflow in Pipes answers it."
      />
      <Section className="pt-0" labelledBy="page-title">
        <Container>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {cases.map((entry) => (
              <li key={entry.slug}>
                <TrackedLink
                  href={`/use-cases/${entry.slug}`}
                  event="use_case_viewed"
                  metadata={{ source: "use_cases_index", slug: entry.slug }}
                  className="focus-ring-canvas grid gap-1.5 rounded-4 px-1.5 py-6 transition-colors duration-[var(--dur-1)] hover:bg-state-hover focus-visible:outline-none md:grid-cols-[320px_1fr] md:gap-10"
                >
                  <span className="t-mk-h4 text-ink">{entry.title}</span>
                  <span className="flex flex-col gap-1.5">
                    <span className="t-mk-body text-ink-2">{entry.problem}</span>
                    <span className="t-body text-ink-3">{entry.fit}</span>
                  </span>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
      <FinalCta source="use_cases_final" />
    </MarketingShell>
  );
}

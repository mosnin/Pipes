import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section, SectionHeading } from "@/components/marketing/section";
import { publicContentService } from "@/domain/services/public";

export function generateStaticParams() {
  return publicContentService.listUseCases().map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = publicContentService.getUseCase(slug);
  if (!entry) return { title: "Use case not found" };
  return { title: entry.title, description: `${entry.problem} ${entry.fit}` };
}

export default async function UseCaseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = publicContentService.getUseCase(slug);
  if (!entry) notFound();
  const templates = publicContentService
    .listTemplates()
    .filter((t) => (entry.templateIds as readonly string[]).includes(t.id));

  return (
    <MarketingShell>
      <PageIntro
        kicker={
          <TrackedLink
            href="/use-cases"
            event="use_case_viewed"
            metadata={{ source: "use_case_back", slug: entry.slug }}
            className="hover:text-ink"
          >
            Use cases
          </TrackedLink>
        }
        title={entry.title}
        lead={entry.problem}
      >
        <div className="flex flex-wrap gap-4">
          <CutButton
            href={`/signup?source=use_case_${entry.slug}`}
            track={{ event: "signup_started", metadata: { source: `use_case_${entry.slug}` } }}
          >
            Start from this use case
          </CutButton>
        </div>
      </PageIntro>

      <Section className="pt-0" labelledBy="fit-heading">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <p className="t-label-caps text-ink-3">Why Pipes fits</p>
            <h2 id="fit-heading" className="t-mk-h3 max-w-[28ch] text-balance text-ink">
              {entry.fit}
            </h2>
          </div>
          <div className="flex flex-col gap-6">
            <h2 className="t-label-caps text-ink-3">Typical workflow</h2>
            <ol className="divide-y divide-hairline border-y border-hairline">
              {entry.workflow.map((step, index) => (
                <li key={step} className="flex items-baseline gap-5 py-5">
                  <span className="t-mono-hash w-[2ch] shrink-0 text-ink-4 tabular">{index + 1}</span>
                  <span className="t-mk-body text-ink">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </Section>

      {templates.length > 0 ? (
        <Section className="border-t border-hairline" labelledBy="templates-heading">
          <Container>
            <SectionHeading id="templates-heading" kicker="Templates" title="Start from one of these." />
            <ul className="mt-10 grid gap-6 md:grid-cols-2">
              {templates.map((template) => (
                <li key={template.id}>
                  <TrackedLink
                    href={`/templates/${template.slug}`}
                    event="template_detail_viewed"
                    metadata={{ source: "use_case", useCase: entry.slug, templateId: template.id }}
                    className="focus-ring-canvas flex h-full flex-col gap-3 rounded-12 border border-border bg-raised p-7 shadow-elev-1 transition-[box-shadow,border-color] duration-[var(--dur-2)] hover:border-strong hover:shadow-elev-1-hover focus-visible:outline-none"
                  >
                    <span className="t-label-caps text-ink-3">{template.category}</span>
                    <span className="t-mk-h4 text-ink">{template.title}</span>
                    <span className="t-body text-ink-2">{template.description}</span>
                    <span className="t-mono-hash mt-auto pt-3 text-ink-3">{template.preview}</span>
                  </TrackedLink>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <FinalCta source={`use_case_${entry.slug}`} />
    </MarketingShell>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import {
  Container,
  SceneFrame,
  Section,
  SectionHeading,
  SpecList,
} from "@/components/marketing/section";
import { StepList, TemplateGraph, findStarterTemplate } from "@/components/marketing/template-graph";
import { publicContentService } from "@/domain/services/public";

export function generateStaticParams() {
  return publicContentService.listTemplates().map((template) => ({ slug: template.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = publicContentService.getTemplate(slug);
  if (!template) return { title: "Template not found" };
  return {
    title: `${template.title} template`,
    description: `${template.description} ${template.preview}.`,
  };
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = publicContentService.getTemplate(slug);
  if (!template) notFound();
  const graph = findStarterTemplate(template.id);
  const useCases = publicContentService
    .listUseCases()
    .filter((entry) => (entry.templateIds as readonly string[]).includes(template.id));

  return (
    <MarketingShell>
      <PageIntro
        kicker={
          <TrackedLink
            href="/templates"
            event="share_page_viewed"
            metadata={{ source: "template_detail_back" }}
            className="hover:text-ink"
          >
            Templates / {template.category}
          </TrackedLink>
        }
        title={template.title}
        lead={`${template.description} A ${template.complexity} starting point for ${template.useCase.toLowerCase()}.`}
      >
        <div className="flex flex-wrap gap-4">
          <CutButton
            href={`/signup?source=template_detail_${template.slug}`}
            track={{
              event: "public_template_instantiate_clicked",
              metadata: { templateId: template.id, source: "template_detail" },
            }}
          >
            Use this template
          </CutButton>
          <CutButton
            href="/templates"
            variant="outline"
            track={{ event: "share_page_viewed", metadata: { source: "template_detail_back" } }}
          >
            Back to templates
          </CutButton>
        </div>
      </PageIntro>

      {graph ? (
        <Section className="pt-0" labelledBy="graph-heading">
          <Container className="flex flex-col gap-10">
            <h2 id="graph-heading" className="sr-only">
              The graph
            </h2>
            <SceneFrame
              className="hidden sm:flex"
              caption="The template as it opens in the editor. Every step and pipe is yours to change."
            >
              <div className="bg-inset px-10 py-10">
                <TemplateGraph template={graph} listOnMobile={false} />
              </div>
            </SceneFrame>
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="flex flex-col gap-6">
                <h3 className="t-mk-h4 text-ink">Steps, in order</h3>
                <StepList template={graph} className="border-y border-hairline" />
              </div>
              <div className="flex flex-col gap-6">
                <h3 className="t-mk-h4 text-ink">At a glance</h3>
                <SpecList
                  rows={[
                    { term: "Category", detail: template.category },
                    { term: "Use case", detail: template.useCase },
                    {
                      term: "Complexity",
                      detail: template.complexity.charAt(0).toUpperCase() + template.complexity.slice(1),
                    },
                    { term: "Size", detail: template.preview },
                  ]}
                />
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {useCases.length > 0 ? (
        <Section className="border-t border-hairline" labelledBy="related-heading">
          <Container>
            <SectionHeading id="related-heading" kicker="Use cases" title="Where this template fits." />
            <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
              {useCases.map((entry) => (
                <li key={entry.slug}>
                  <TrackedLink
                    href={`/use-cases/${entry.slug}`}
                    event="use_case_viewed"
                    metadata={{ source: "template_detail", templateId: template.id, slug: entry.slug }}
                    className="focus-ring-canvas grid gap-2 rounded-4 px-3 py-6 transition-colors duration-[var(--dur-1)] hover:bg-state-hover focus-visible:outline-none md:grid-cols-[300px_1fr] md:gap-8"
                  >
                    <span className="t-body-strong text-ink">{entry.title}</span>
                    <span className="t-body text-ink-2">{entry.fit}</span>
                  </TrackedLink>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <FinalCta source={`template_detail_${template.slug}`} />
    </MarketingShell>
  );
}

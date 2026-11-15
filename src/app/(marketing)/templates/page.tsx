import type { Metadata } from "next";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section } from "@/components/marketing/section";
import { TemplateGraph, findStarterTemplate } from "@/components/marketing/template-graph";
import { publicContentService } from "@/domain/services/public";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Starter procedures for agent loops, multi-agent research, automation and support triage. Each opens as an editable workflow in your workspace.",
};

export default function TemplatesPage() {
  const templates = publicContentService.listTemplates();

  return (
    <MarketingShell>
      <PageIntro
        kicker="Templates"
        title="Start from a procedure that already works."
        lead={`${templates.length} starter templates, from a single agent loop to a support flow with a policy check and a human review. Pick one and it opens as an editable workflow in your workspace.`}
      />

      <Section className="pt-0" labelledBy="page-title">
        <Container>
          <ul className="grid gap-6 lg:grid-cols-2">
            {templates.map((template) => {
              const graph = findStarterTemplate(template.id);
              return (
                <li
                  key={template.id}
                  className="flex flex-col overflow-hidden rounded-12 border border-border bg-raised shadow-elev-1"
                >
                  {graph ? (
                    <div className="hidden border-b border-hairline bg-inset px-6 py-8 sm:block">
                      <TemplateGraph template={graph} listOnMobile={false} />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col gap-4 p-7">
                    <p className="t-label-caps text-ink-3">
                      {template.category} · {template.useCase}
                    </p>
                    <h2 className="t-mk-h4 text-ink">{template.title}</h2>
                    <p className="t-body text-ink-2">{template.description}</p>
                    <p className="t-mono-hash text-ink-3">
                      {template.preview} · {template.complexity}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-6 pt-4">
                      <CutButton
                        href={`/signup?source=template_${template.slug}`}
                        track={{
                          event: "public_template_instantiate_clicked",
                          metadata: { source: "templates_index", templateId: template.id },
                        }}
                      >
                        Use template
                      </CutButton>
                      <TrackedLink
                        href={`/templates/${template.slug}`}
                        event="template_detail_viewed"
                        metadata={{ source: "templates_index", templateId: template.id }}
                        className="t-link"
                      >
                        View template
                      </TrackedLink>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Container>
      </Section>

      <FinalCta source="templates_final" />
    </MarketingShell>
  );
}

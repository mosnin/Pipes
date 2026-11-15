import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { CodeBlock } from "@/components/marketing/code-block";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import {
  Container,
  FeatureRow,
  SceneFrame,
  Section,
  SectionHeading,
  SpecList,
} from "@/components/marketing/section";
import {
  TemplateGraph,
  findStarterTemplate,
  nodeTypeLabel,
} from "@/components/marketing/template-graph";
import { nodeTypeValues } from "@/domain/pipes_schema_v1/schema";
import { publicContentService } from "@/domain/services/public";

const description =
  "Pipes is where teams design, store and version the workflows and loops their agents follow, as graphs any agent can read over MCP or a REST API.";

export const metadata: Metadata = {
  title: { absolute: "Pipes | The workflows your agents follow" },
  description,
  openGraph: {
    type: "website",
    siteName: "Pipes",
    title: "Pipes | The workflows your agents follow",
    description,
  },
};

const MCP_EXAMPLE = `POST /api/protocol/mcp
Authorization: Bearer ptk_...

{
  "tool": "get_system",
  "input": { "systemId": "sys_support_triage" }
}`;

export default function HomePage() {
  const home = publicContentService.getHome();
  const templates = publicContentService.listTemplates();
  const useCases = publicContentService.listUseCases();
  const supportOps = findStarterTemplate("support-ops-system");

  return (
    <MarketingShell>
      <Hero
        title="The workflows your agents follow, designed and kept in one place."
        lead="Draw each procedure as a graph of agent steps, tool calls, human approvals, loops and branches. Pipes keeps every version and hands the current one to any agent over MCP or a REST API."
        primary={{
          label: home.hero.primaryCta.label,
          href: home.hero.primaryCta.href,
          track: { event: "homepage_cta_clicked", metadata: { location: "hero_primary" } },
        }}
        secondary={{
          label: home.hero.secondaryCta.label,
          href: home.hero.secondaryCta.href,
          track: { event: "homepage_cta_clicked", metadata: { location: "hero_secondary" } },
        }}
        templateId="multi-agent-research"
      />

      <Section labelledBy="idea-heading">
        <Container>
          <SectionHeading
            id="idea-heading"
            kicker="What is Pipes?"
            title="A home for the procedures your agents run."
            lead="Most agent procedures live in a prompt, a script and somebody's memory. Pipes gives each one a typed graph that people can review and agents can read, so the steps, the approvals and the branches are written down once and reused."
          />
          <SpecList
            className="mt-10"
            rows={[
              {
                term: "For teams running agents",
                detail:
                  "Keep the planner, the retriever and the reviewer in one procedure instead of three prompts that drift apart.",
              },
              {
                term: "For operations",
                detail:
                  "Put the policy check and the human sign-off on the graph, where everyone can see where a request stops for review.",
              },
              {
                term: "For developers",
                detail:
                  "Read and update the same procedure from code, with scoped tokens, idempotent writes and an audit trail.",
              },
            ]}
          />
        </Container>
      </Section>

      <Section className="pt-0" labelledBy="design-heading">
        <Container className="flex flex-col gap-12">
          <FeatureRow
            id="design-heading"
            kicker="1. Design the procedure"
            title="Draw the steps, and say what each one is."
            visual={
              <SceneFrame caption={`The ${nodeTypeValues.length} step types in Pipes Schema v1.`}>
                <ul className="flex flex-wrap gap-3 p-7">
                  {nodeTypeValues.map((type) => (
                    <li
                      key={type}
                      className="t-mono-hash rounded-8 border border-hairline bg-object px-4 py-2 text-ink-2"
                    >
                      {nodeTypeLabel(type)}
                    </li>
                  ))}
                </ul>
              </SceneFrame>
            }
          >
            <p>
              Start from a template or a blank canvas. Add agents, tools, models,
              prompts and memory, then join them with pipes. Each port declares
              the data it carries: text, numbers, JSON, events or files.
            </p>
            <p>
              Loops, routers, conditions and human approvals are steps of their
              own, so the parts of a procedure that usually live in someone&apos;s
              head end up on the graph.
            </p>
            <TrackedLink
              href="/templates"
              event="template_detail_viewed"
              metadata={{ source: "home_feature" }}
              className="t-link w-fit"
            >
              Browse the templates
            </TrackedLink>
          </FeatureRow>

          {supportOps ? (
            <FeatureRow
              id="check-heading"
              kicker="2. Check it before it runs"
              title="Validate the structure and walk the paths."
              reverse
              visual={
                <SceneFrame caption="Support Ops System: a policy check and a human review before anything is resolved.">
                  <div className="bg-inset px-6 py-8">
                    <TemplateGraph template={supportOps} vertical listOnMobile={false} />
                  </div>
                </SceneFrame>
              }
            >
              <p>
                Validation reads the graph the way a reviewer would. It flags
                steps that are not connected, steps no input can reach, pipes
                between incompatible port types and cycles outside a loop step.
                Simulation then walks a run through it, step by step from the
                first input or trigger, so you see where a request ends up before
                an agent is ever pointed at it.
              </p>
              <p>
                Comments sit on the procedure itself, and roles decide who can
                edit, who can comment and who can only read.
              </p>
            </FeatureRow>
          ) : null}

          <FeatureRow
            id="share-heading"
            kicker="3. Hand it to every agent"
            title="One current version, read the same way by people and agents."
            visual={<CodeBlock label="An agent asking for a procedure over MCP" code={MCP_EXAMPLE} />}
          >
            <p>
              Save a version when the procedure changes. Agents fetch it through
              the MCP endpoint or the REST API with a token you issue, limited to
              the capabilities and the procedures you choose.
            </p>
            <p>
              Both transports run through the same permission and validation
              rules as the editor, and every protocol write lands in the audit
              log with its request ID.
            </p>
            <TrackedLink
              href="/protocol"
              event="protocol_docs_viewed"
              metadata={{ source: "home" }}
              className="t-link w-fit"
            >
              Read the protocol
            </TrackedLink>
          </FeatureRow>
        </Container>
      </Section>

      <Section className="border-t border-hairline" labelledBy="templates-heading">
        <Container>
          <SectionHeading
            id="templates-heading"
            kicker="Templates"
            title="You do not have to start from a blank canvas."
            lead="Each starter template opens as an editable procedure in your workspace. Keep it as it is, or use it as the first draft of your own."
          />
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {templates.map((template) => (
              <li key={template.id}>
                <TrackedLink
                  href={`/templates/${template.slug}`}
                  event="template_detail_viewed"
                  metadata={{ source: "home", templateId: template.id }}
                  className="focus-ring-canvas group flex h-full flex-col gap-3 rounded-12 border border-border bg-raised p-7 shadow-elev-1 transition-[box-shadow,border-color] duration-[var(--dur-2)] hover:border-strong hover:shadow-elev-1-hover focus-visible:outline-none"
                >
                  <span className="t-label-caps text-ink-3">{template.category}</span>
                  <span className="t-mk-h4 text-ink">{template.title}</span>
                  <span className="t-body text-ink-2">{template.description}</span>
                  <span className="t-mono-hash mt-auto pt-3 text-ink-3">
                    {template.preview} · {template.complexity}
                  </span>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="border-t border-hairline" labelledBy="use-cases-heading">
        <Container>
          <SectionHeading
            id="use-cases-heading"
            kicker="Use cases"
            title="Where teams put Pipes to work."
          />
          <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
            {useCases.map((entry) => (
              <li key={entry.slug}>
                <TrackedLink
                  href={`/use-cases/${entry.slug}`}
                  event="use_case_viewed"
                  metadata={{ source: "home", slug: entry.slug }}
                  className="focus-ring-canvas grid gap-2 rounded-4 px-3 py-6 transition-colors duration-[var(--dur-1)] hover:bg-state-hover focus-visible:outline-none md:grid-cols-[300px_1fr] md:gap-8"
                >
                  <span className="t-body-strong text-ink">{entry.title}</span>
                  <span className="t-body text-ink-2">{entry.problem}</span>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="border-t border-hairline" labelledBy="how-heading">
        <Container>
          <SectionHeading
            id="how-heading"
            kicker="Getting started"
            title="Your first procedure in three steps."
            lead="Create a free workspace, open a template or start blank, and point an agent at the result when you are ready."
          />
          <SpecList
            className="mt-10"
            rows={[
              {
                term: "Create a workspace",
                detail: "Sign in and name it. Onboarding asks what you are building and suggests a template.",
              },
              {
                term: "Draw the procedure",
                detail: "Start from a template, a blank canvas or an imported schema, then validate it.",
              },
              {
                term: "Connect an agent",
                detail: (
                  <>
                    Issue a token in Settings and call the procedure over MCP or REST.{" "}
                    <Link href="/pricing" className="t-link">
                      API and MCP access
                    </Link>{" "}
                    start on Pro.
                  </>
                ),
              },
            ]}
          />
          <div className="mt-8">
            <CutButton
              href="/protocol"
              variant="outline"
              track={{ event: "protocol_docs_viewed", metadata: { source: "home_steps" } }}
            >
              See the protocol
            </CutButton>
          </div>
        </Container>
      </Section>

      <FinalCta source="home_final" />
    </MarketingShell>
  );
}

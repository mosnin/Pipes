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
  "Pipes is where teams design, store and version the workflows their agents follow. Agents run them step by step over MCP, with human approvals, triggers and a full run history.";

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

/* The run loop as an agent sees it: tool calls to /api/mcp, trimmed. */
const RUN_LOOP = `// 1. Start a run. Pipes returns the first step.
start_run {
  "systemId": "sys_support",
  "input": { "ticket": "T-4821" }
}

{ "runId": "run_8f2c", "status": "running",
  "step": {
    "title": "Classifier",
    "instructions": "Tag it billing, bug or how-to.",
    "doneWhen": "The ticket has one tag."
  },
  "options": [ ... ] }

// 2. Do the step, report it, get the next one.
complete_step {
  "runId": "run_8f2c",
  "nodeId": "classifier",
  "output": { "tag": "billing" }
}

// 3. Repeat until status is "completed".`;

const WEBHOOK = `curl -X POST \\
  https://your-pipes-host/api/hooks/sys_support \\
  -H 'x-pipes-key: <webhook key>' \\
  -H 'content-type: application/json' \\
  -d '{ "ticket": "T-4821" }'

{ "ok": true,
  "data": { "runId": "run_9a1d", "status": "running" } }`;

export default function HomePage() {
  const home = publicContentService.getHome();
  const templates = publicContentService.listTemplates();
  const useCases = publicContentService.listUseCases();
  const supportOps = findStarterTemplate("support-ops-system");

  return (
    <MarketingShell>
      <Hero
        title={home.hero.title}
        lead={home.hero.lead}
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
            title="A home for the workflows your agents run."
            lead="Most agent workflows live in a prompt, a script and somebody's memory. Pipes writes each one down as steps people can review, then holds the run while an agent works through it, so nobody has to trust that the agent remembered the approval."
          />
          <SpecList
            className="mt-10"
            rows={[
              {
                term: "For teams running agents",
                detail:
                  "Keep the planner, the retriever and the reviewer in one workflow instead of three prompts that drift apart.",
              },
              {
                term: "For operations",
                detail:
                  "Put the policy check and the sign-off in the workflow, and see every run that stopped for review and who decided it.",
              },
              {
                term: "For developers",
                detail:
                  "Connect any MCP client with a URL, start runs from a webhook or a schedule, and edit workflows from code over REST.",
              },
            ]}
          />
        </Container>
      </Section>

      <Section className="pt-0" labelledBy="design-heading">
        <Container className="flex flex-col gap-16">
          <FeatureRow
            id="design-heading"
            kicker="1. Design the workflow"
            title="Draw the steps, and say how each one gets done."
            visual={
              <SceneFrame caption={`The ${nodeTypeValues.length} step types in Pipes Schema v1.`}>
                <ul className="flex flex-wrap gap-1.5 p-5">
                  {nodeTypeValues.map((type) => (
                    <li
                      key={type}
                      className="t-mono-hash rounded-8 border border-hairline bg-object px-2 py-1 text-ink-2"
                    >
                      {nodeTypeLabel(type)}
                    </li>
                  ))}
                </ul>
              </SceneFrame>
            }
          >
            <p>
              Start from a template or a blank canvas. Add agent steps, tools,
              human approvals, loops and routers, then join them with pipes.
            </p>
            <p>
              Each step carries plain instructions, a line that says when it is
              done, and the skills and connections it should use. Loops get an
              iteration limit, so a review that never passes still ends.
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

          <FeatureRow
            id="run-heading"
            kicker="2. Let an agent run it"
            title="Agents walk the workflow one step at a time."
            reverse
            visual={<CodeBlock label="A run over MCP, trimmed" code={RUN_LOOP} />}
          >
            <p>
              Pipes runs an MCP server. Add its URL to Claude, ChatGPT, Cursor
              or your own agent and sign in, or use an API token.
            </p>
            <p>
              The agent starts a run, gets the current step with everything it
              needs, does the work and reports back. Pipes records the output,
              picks the next step and enforces the loop limits. The agent never
              has to keep the workflow in its head.
            </p>
            <TrackedLink
              href="/protocol"
              event="protocol_docs_viewed"
              metadata={{ source: "home" }}
              className="t-link w-fit"
            >
              How agents connect
            </TrackedLink>
          </FeatureRow>

          {supportOps ? (
            <FeatureRow
              id="approve-heading"
              kicker="3. Sign off where it matters"
              title="Human approvals pause the run until a person decides."
              visual={
                <SceneFrame caption="Support Ops System: the run stops at Escalation Review until someone decides.">
                  <div className="bg-inset px-4 py-6">
                    <TemplateGraph template={supportOps} vertical listOnMobile={false} />
                  </div>
                </SceneFrame>
              }
            >
              <p>
                When a run reaches an approval step it waits in the Approvals
                inbox. A person approves it, rejects it, or sends it back to an
                earlier step with a comment, and the agent carries on from there.
              </p>
              <p>
                Each approval step can say which role may decide it, and the
                decision is kept with the run: who, when and why.
              </p>
            </FeatureRow>
          ) : null}

          <FeatureRow
            id="trigger-heading"
            kicker="4. Start runs from anywhere"
            title="Webhooks, schedules and the tools your steps need."
            reverse
            visual={<CodeBlock label="Starting a run from another system" code={WEBHOOK} />}
          >
            <p>
              Every workflow can have an inbound webhook and cron schedules, so
              a new ticket or a Monday morning starts a run on its own. Pipes
              sends signed events back out when a run starts, finishes, fails or
              needs an approval.
            </p>
            <p>
              Connections hold the MCP servers, HTTP APIs and skills your steps
              use. Their secrets are encrypted at rest, and a step only hands
              them to tokens you have allowed to read them.
            </p>
          </FeatureRow>
        </Container>
      </Section>

      <Section className="border-t border-hairline" labelledBy="record-heading">
        <Container>
          <SectionHeading
            id="record-heading"
            kicker="On the record"
            title="Every version and every run, kept."
            lead="When someone asks what an agent did last week, the answer is in Pipes, not in a chat log."
          />
          <SpecList
            className="mt-10"
            rows={[
              {
                term: "Versions",
                detail:
                  "Save a version when the workflow changes. Each run records the version it followed, and later edits never change a run in progress.",
              },
              {
                term: "Run history",
                detail:
                  "Every step a run took, what it produced, any notes, and who or what performed it, per workflow and per version.",
              },
              {
                term: "Comments and audit log",
                detail:
                  "Discuss a workflow on the workflow itself, down to a single step. API writes and completed MCP tool calls land in the audit log.",
              },
              {
                term: "Import and export",
                detail:
                  "Move a workflow between workspaces or into version control as a Pipes Schema v1 document.",
              },
            ]}
          />
        </Container>
      </Section>

      <Section className="border-t border-hairline" labelledBy="templates-heading">
        <Container>
          <SectionHeading
            id="templates-heading"
            kicker="Templates"
            title="You do not have to start from a blank canvas."
            lead="Each starter template opens as an editable workflow in your workspace. Keep it as it is, or use it as the first draft of your own."
          />
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <li key={template.id}>
                <TrackedLink
                  href={`/templates/${template.slug}`}
                  event="template_detail_viewed"
                  metadata={{ source: "home", templateId: template.id }}
                  className="focus-ring-canvas group flex h-full flex-col gap-1.5 rounded-12 border border-border bg-raised p-5 shadow-elev-1 transition-[box-shadow,border-color] duration-[var(--dur-2)] hover:border-strong hover:shadow-elev-1-hover focus-visible:outline-none"
                >
                  <span className="t-label-caps text-ink-3">{template.category}</span>
                  <span className="t-mk-h4 text-ink">{template.title}</span>
                  <span className="t-body text-ink-2">{template.description}</span>
                  <span className="t-mono-hash mt-auto pt-1.5 text-ink-3">
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
            title="Workflows teams hand to their agents."
          />
          <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
            {useCases.map((entry) => (
              <li key={entry.slug}>
                <TrackedLink
                  href={`/use-cases/${entry.slug}`}
                  event="use_case_viewed"
                  metadata={{ source: "home", slug: entry.slug }}
                  className="focus-ring-canvas grid gap-1 rounded-4 px-1.5 py-4 transition-colors duration-[var(--dur-1)] hover:bg-state-hover focus-visible:outline-none md:grid-cols-[300px_1fr] md:gap-6"
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
            title="Your first run in three steps."
            lead="Create a free workspace, open a template or start blank, and point an agent at the result when you are ready."
          />
          <SpecList
            className="mt-10"
            rows={[
              {
                term: "Create a workspace",
                detail: "Sign up and name it. Onboarding asks what you are building and suggests a template.",
              },
              {
                term: "Draw the workflow",
                detail: "Start from a template, a blank canvas or an imported schema, and write the instructions for each step.",
              },
              {
                term: "Connect an agent",
                detail: (
                  <>
                    Add the MCP server URL to your agent and ask it to run the workflow.{" "}
                    <Link href="/pricing" className="t-link">
                      API and MCP access
                    </Link>{" "}
                    start on Pro.
                  </>
                ),
              },
            ]}
          />
          <div className="mt-6">
            <CutButton
              href="/protocol"
              variant="outline"
              track={{ event: "protocol_docs_viewed", metadata: { source: "home_steps" } }}
            >
              See how agents connect
            </CutButton>
          </div>
        </Container>
      </Section>

      <FinalCta source="home_final" />
    </MarketingShell>
  );
}

import type { Metadata } from "next";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { CodeBlock } from "@/components/marketing/code-block";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section, SectionHeading, SpecList } from "@/components/marketing/section";
import { AGENT_CAPABILITIES } from "@/lib/protocol/capabilities";

/* ==========================================================================
   PROTOCOL, /protocol. Public.

   Read off the MCP server (src/app/api/mcp, src/lib/mcp/tools.ts), the REST
   routes (src/app/api/protocol/**) and docs/mcp.md. The capability list is
   imported, so a new capability appears here the day it ships.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Protocol",
  description:
    "Connect any agent to Pipes over MCP: add the server URL, sign in with OAuth or use a token, and walk a workflow run one step at a time. A REST API covers editing workflows from code.",
};

const CLAUDE_CODE = `claude mcp add --transport http pipes \\
  https://your-pipes-host/api/mcp`;

const TOKEN_CALL = `curl https://your-pipes-host/api/mcp \\
  -H 'authorization: Bearer ptk_...' \\
  -H 'content-type: application/json' \\
  -d '{ "jsonrpc": "2.0", "id": 1, "method": "tools/call",
        "params": { "name": "list_workflows", "arguments": {} } }'`;

const STEP_PAYLOAD = `{
  "runId": "run_8f2c",
  "status": "running",
  "step": {
    "nodeId": "classifier",
    "title": "Classifier",
    "instructions": "Tag the ticket: billing, bug or how-to.",
    "doneWhen": "The ticket has exactly one tag.",
    "skills": ["support-tone"],
    "connectionIds": ["conn_helpdesk"],
    "iteration": 1
  },
  "previousOutputs": [],
  "options": [
    { "pipeId": "p_2", "toNodeTitle": "Policy Check", "routeKind": "default" }
  ]
}`;

const RUN_LOOP = [
  {
    term: "1. start_run",
    detail: "Pass the workflow id and an optional input, such as the ticket being handled. Pipes freezes the current version for this run and returns the first step.",
  },
  {
    term: "2. Do the step",
    detail: "The step comes with its instructions, a done-when line, the skills and connections to use, earlier steps' outputs and the routes out of it.",
  },
  {
    term: "3. complete_step",
    detail: "Report the outcome (success, failure, retry or a route label) and any output or notes. When there are several routes, name one. Pipes returns the next step.",
  },
  {
    term: "4. Repeat",
    detail: "Keep going until the status is completed or failed. Loops take their exit route once they reach their iteration limit.",
  },
];

const MCP_TOOLS = [
  { term: "list_workflows", detail: "The workflows in the workspace." },
  { term: "get_workflow", detail: "A workflow's steps, routes and per-step instructions." },
  { term: "start_run", detail: "Start a run and get the first step." },
  { term: "get_current_step", detail: "The step a run is on now, with everything needed to do it." },
  { term: "complete_step", detail: "Report the current step and get the next one." },
  { term: "get_run", detail: "A run's status and every step taken so far." },
  { term: "list_runs", detail: "Recent runs, by workflow or by status." },
  { term: "cancel_run", detail: "Stop a run that should not continue." },
  { term: "list_templates", detail: "The starter templates." },
  { term: "create_workflow_from_template", detail: "A new workflow from a template." },
  { term: "export_workflow", detail: "A workflow as a Pipes Schema v1 document." },
  { term: "add_comment", detail: "A comment on a workflow, or on one step." },
];

const REST_READ = [
  { term: "GET /api/protocol/systems", detail: "List the workflows in the token's workspace." },
  { term: "GET /api/protocol/systems/:systemId", detail: "One workflow and its graph." },
  { term: "GET /api/protocol/systems/:systemId/schema", detail: "The canonical Pipes Schema v1 export." },
  { term: "GET /api/protocol/systems/:systemId/versions", detail: "Its saved versions." },
  { term: "GET /api/protocol/systems/:systemId/validation", detail: "The current validation report." },
  { term: "GET /api/protocol/templates", detail: "The starter templates." },
];

const REST_WRITE = [
  { term: "POST /api/protocol/systems", detail: "Create a workflow." },
  { term: "POST /api/protocol/templates/:templateId/instantiate", detail: "Create a workflow from a template." },
  { term: "POST /api/protocol/import/system", detail: "Create a workflow from a canonical schema." },
  { term: "POST /api/protocol/systems/:systemId/versions", detail: "Save a version." },
  { term: "POST /api/protocol/graph", detail: "Apply graph actions. Not idempotent." },
  { term: "POST /api/protocol/comments", detail: "Add a comment." },
];

export default function ProtocolPage() {
  return (
    <MarketingShell>
      <PageIntro
        kicker="Protocol"
        title="Connect any agent over MCP."
        lead="Pipes runs an MCP server at /api/mcp. An agent lists your workflows, starts a run and works through it one step at a time while Pipes keeps the state. A REST API covers reading and editing workflows from code."
      >
        <div className="flex flex-wrap gap-2">
          <CutButton href="#connect">Connect an agent</CutButton>
          <CutButton
            href="/docs"
            variant="outline"
            track={{ event: "protocol_docs_viewed", metadata: { source: "protocol_page" } }}
          >
            Read the docs
          </CutButton>
        </div>
      </PageIntro>

      <Section id="connect" className="pt-0" labelledBy="connect-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            id="connect-heading"
            kicker="Connect"
            title="Most clients only need the URL."
            lead="Claude, ChatGPT, Cursor and other clients that support MCP authorization sign in with OAuth: Pipes shows a consent page in your workspace and issues the client its own token, which you can revoke under API tokens. Clients without OAuth send an API token instead."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock label="Add Pipes to Claude Code" code={CLAUDE_CODE} />
            <CodeBlock label="Or call it with an API token" code={TOKEN_CALL} />
          </div>
          <SpecList
            className="max-w-[860px]"
            rows={[
              { term: "Server", detail: "https://your-pipes-host/api/mcp", mono: true },
              { term: "Transport", detail: "Streamable HTTP with JSON responses. Protocol versions 2025-06-18, 2025-03-26 and 2024-11-05." },
              { term: "OAuth", detail: "OAuth 2.1 with dynamic client registration and PKCE. Discovery lives at /.well-known/oauth-protected-resource." },
              { term: "Tokens", detail: "Created in Settings, API tokens. The secret is shown once and stored as a hash. A token scoped to one workflow only sees that workflow." },
            ]}
          />
        </Container>
      </Section>

      <Section id="runs" className="border-t border-hairline" labelledBy="runs-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            id="runs-heading"
            kicker="The run loop"
            title="Pipes holds the workflow. The agent does the work."
            lead="A run is an agent walking a workflow one step at a time. When the run reaches a human approval its status becomes waiting_approval until a person decides it in Pipes; the agent polls get_current_step meanwhile."
          />
          <div className="grid gap-10 lg:grid-cols-2">
            <SpecList rows={RUN_LOOP.map((row) => ({ ...row, mono: true }))} />
            <CodeBlock label="What get_current_step returns" code={STEP_PAYLOAD} />
          </div>
        </Container>
      </Section>

      <Section id="mcp" className="border-t border-hairline" labelledBy="mcp-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            id="mcp-heading"
            kicker="MCP tools"
            title={`${MCP_TOOLS.length} tools, gated by capability.`}
            lead="OAuth clients get what you approve on the consent page. API tokens get the capabilities you pick when you create them: runs:write to start and complete runs, connections:secrets to receive connection headers in step payloads."
          />
          <SpecList rows={MCP_TOOLS.map((row) => ({ ...row, mono: true }))} className="max-w-[860px]" />
          <div className="flex flex-col gap-2">
            <p className="t-label-caps text-ink-3">Capabilities</p>
            <ul className="flex flex-wrap gap-1.5">
              {AGENT_CAPABILITIES.map((capability) => (
                <li
                  key={capability}
                  className="t-mono-hash rounded-8 border border-hairline bg-raised px-2 py-1 text-ink-2"
                >
                  {capability}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section id="rest" className="border-t border-hairline" labelledBy="rest-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            id="rest-heading"
            kicker="REST"
            title="Edit workflows from code."
            lead="The REST API reads and writes workflows with the same tokens. Paths use systems, the older name for workflows. Writes that create something accept an Idempotency-Key header: replay the same key with the same body and you get the first result back; a different body returns CONFLICT."
          />
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="t-label-caps text-ink-3">Read</h3>
              <SpecList rows={REST_READ.map((row) => ({ ...row, mono: true }))} />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="t-label-caps text-ink-3">Write</h3>
              <SpecList rows={REST_WRITE.map((row) => ({ ...row, mono: true }))} />
            </div>
          </div>
        </Container>
      </Section>

      <Section id="limits" className="border-t border-hairline" labelledBy="limits-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading id="limits-heading" kicker="Operating rules" title="What to expect when you call it." />
          <SpecList
            className="max-w-[860px]"
            rows={[
              {
                term: "Rate limits",
                detail:
                  "Per token, per minute: 240 MCP requests, 120 REST reads and 60 REST writes. Each workflow webhook takes 60 calls a minute. Past the limit you get HTTP 429.",
              },
              {
                term: "Usage",
                detail:
                  "Runs started, steps completed and API, MCP and webhook calls count toward your plan's monthly allowance.",
              },
              {
                term: "Errors",
                detail: "REST errors are structured payloads with a code, a message and a requestId. A failed MCP tool call comes back as a tool result marked isError, with a message the agent can read.",
              },
              {
                term: "Audit",
                detail:
                  "Every completed MCP tool call and every REST write is recorded with the actor, the target and the outcome. Filter the log in Settings, Audit, or export it as CSV.",
              },
              {
                term: "Plans",
                detail: (
                  <>
                    API and MCP access is included on Pro and Builder.{" "}
                    <TrackedLink
                      href="/pricing"
                      event="pricing_cta_clicked"
                      metadata={{ source: "protocol_page" }}
                      className="t-link"
                    >
                      Compare plans
                    </TrackedLink>
                  </>
                ),
              },
            ]}
          />
          <p className="t-caption max-w-[72ch] text-ink-3">
            Older integrations may still post {"{ tool, input }"} to /api/protocol/mcp. That
            endpoint keeps working but is not an MCP server; new integrations should use
            /api/mcp.
          </p>
        </Container>
      </Section>

      <FinalCta source="protocol_final" />
    </MarketingShell>
  );
}

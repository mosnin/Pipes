import type { Metadata } from "next";
import { MarketingShell } from "@/components/MarketingShell";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { CodeBlock } from "@/components/marketing/code-block";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section, SectionHeading, SpecList } from "@/components/marketing/section";
import { AGENT_CAPABILITIES } from "@/lib/protocol/tokens";

/* ==========================================================================
   PROTOCOL, /protocol. Public.

   Read off the routes themselves (src/app/api/protocol/**) and the protocol
   guide in docs/protocol.md. The capability list is imported, so a new
   capability appears here the day it ships.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Protocol",
  description:
    "Pipes Schema v1 over REST and MCP: token auth with scoped capabilities, idempotent writes, rate limits, structured errors and an audit trail.",
};

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

const MCP_TOOLS = [
  { term: "list_systems", detail: "List workflows." },
  { term: "get_system", detail: "Read one workflow." },
  { term: "export_system_schema", detail: "Export its canonical schema." },
  { term: "list_templates", detail: "List starter templates." },
  { term: "instantiate_template", detail: "Create a workflow from a template." },
  { term: "create_system_from_schema", detail: "Create a workflow from a schema." },
  { term: "create_version", detail: "Save a version." },
  { term: "apply_graph_actions", detail: "Change nodes and pipes." },
  { term: "add_comment", detail: "Comment on a workflow." },
  { term: "get_validation_report", detail: "Read the validation report." },
];

const CURL = `curl https://your-pipes-host/api/protocol/systems \\
  -H 'authorization: Bearer ptk_...'`;

const MCP = `curl -X POST https://your-pipes-host/api/protocol/mcp \\
  -H 'authorization: Bearer ptk_...' \\
  -H 'content-type: application/json' \\
  -d '{ "tool": "list_systems", "input": {} }'`;

export default function ProtocolPage() {
  return (
    <MarketingShell>
      <PageIntro
        kicker="Protocol"
        title="One contract for people, services and agents."
        lead="Every workflow in Pipes is stored as Pipes Schema v1: a graph of typed nodes, ports and pipes, with versions and validation alongside. The same services the editor uses are open over REST and MCP, under the same permissions."
      >
        <div className="flex flex-wrap gap-4">
          <CutButton href="#auth">Get a token</CutButton>
          <CutButton
            href="/docs"
            variant="outline"
            track={{ event: "protocol_docs_viewed", metadata: { source: "protocol_page" } }}
          >
            Read the docs
          </CutButton>
        </div>
      </PageIntro>

      <Section id="auth" className="pt-0" labelledBy="auth-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            id="auth-heading"
            kicker="Authentication"
            title="A token per agent, scoped to what it needs."
            lead="Create a token in Settings, Tokens. The secret is shown once and stored only as a hash. Send it as a bearer token; capabilities and an optional workflow scope are checked before anything runs."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <CodeBlock label="Read your workflows over REST" code={CURL} />
            <CodeBlock label="The same call over MCP" code={MCP} />
          </div>
          <div className="flex flex-col gap-4">
            <p className="t-label-caps text-ink-3">Capabilities</p>
            <ul className="flex flex-wrap gap-3">
              {AGENT_CAPABILITIES.map((capability) => (
                <li
                  key={capability}
                  className="t-mono-hash rounded-8 border border-hairline bg-raised px-4 py-2 text-ink-2"
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
            title="Read and write workflows over HTTP."
            lead="Writes that create something accept an Idempotency-Key header. Replay the same key with the same body and you get the first result back with replayed set to true; a different body returns CONFLICT."
          />
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h3 className="t-label-caps text-ink-3">Read</h3>
              <SpecList rows={REST_READ.map((row) => ({ ...row, mono: true }))} />
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="t-label-caps text-ink-3">Write</h3>
              <SpecList rows={REST_WRITE.map((row) => ({ ...row, mono: true }))} />
            </div>
          </div>
        </Container>
      </Section>

      <Section id="mcp" className="border-t border-hairline" labelledBy="mcp-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            id="mcp-heading"
            kicker="MCP"
            title="Ten tools at one endpoint."
            lead="POST a tool name and its input to /api/protocol/mcp. Errors carry the same codes as REST, with a request ID you can find again in the audit log."
          />
          <SpecList rows={MCP_TOOLS.map((row) => ({ ...row, mono: true }))} className="max-w-[860px]" />
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
                  "Fixed one-minute windows per token: 120 REST reads, 60 REST writes and 120 calls per MCP tool. Past the limit you get RATE_LIMITED with HTTP 429.",
              },
              {
                term: "Errors",
                detail: "Every error is a structured payload with a code, a message and a requestId.",
              },
              {
                term: "Audit",
                detail:
                  "Each protocol write records the actor, action, target, outcome, time, request ID and transport. Filter the log in Settings, Audit, or export it as CSV.",
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
        </Container>
      </Section>

      <FinalCta source="protocol_final" />
    </MarketingShell>
  );
}

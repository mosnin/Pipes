import { InlineCode } from "@/components/ui";
import { DocsLayout } from "@/components/marketing/DocsLayout";
import { DocsSection, DocsHeading } from "@/components/marketing/DocsSection";
import { DocsCodeBlock } from "@/components/marketing/DocsCodeBlock";
import { DocsCallout } from "@/components/marketing/DocsCallout";
import type { DocsNavCategory } from "@/components/marketing/DocsSidebar";
import type { DocsRailHeading } from "@/components/marketing/DocsRightRail";

export const metadata = {
  title: "Docs for the staff engineer wiring this up - Pipes",
  description:
    "Concepts, guides, and reference for the staff engineer wiring Pipes into a multi-agent system.",
};

// ── Navigation tree ─────────────────────────────────────────────────────────

const CATEGORIES: ReadonlyArray<DocsNavCategory> = [
  {
    title: "Getting started",
    items: [
      { id: "quickstart", label: "Quickstart" },
      { id: "mental-model", label: "Mental model" },
      { id: "first-system", label: "First system" },
    ],
  },
  {
    title: "The agent",
    items: [
      { id: "agent-how-it-builds", label: "How it builds" },
      { id: "agent-plan-editor", label: "Plan editor" },
      { id: "agent-tool-surface", label: "Tool surface" },
      { id: "agent-eval-gates", label: "Eval gates" },
    ],
  },
  {
    title: "Protocol",
    items: [
      { id: "protocol-overview", label: "MCP overview" },
      { id: "protocol-authentication", label: "Authentication" },
      { id: "protocol-capabilities", label: "Capabilities" },
      { id: "protocol-quickstart", label: "Quickstart code" },
    ],
  },
  {
    title: "Editor",
    items: [
      { id: "editor-canvas", label: "Canvas" },
      { id: "editor-inspector", label: "Inspector" },
      { id: "editor-command-palette", label: "Command palette" },
      { id: "editor-shortcuts", label: "Keyboard shortcuts" },
    ],
  },
  {
    title: "Templates",
    items: [
      { id: "templates-what", label: "What is a starter" },
      { id: "templates-browse", label: "Browse" },
      { id: "templates-create", label: "Create your own" },
    ],
  },
  {
    title: "Tokens",
    items: [
      { id: "tokens-generate", label: "Generate" },
      { id: "tokens-scope", label: "Scope" },
      { id: "tokens-revoke", label: "Revoke" },
    ],
  },
  {
    title: "Workspaces",
    items: [
      { id: "workspaces-members", label: "Members" },
      { id: "workspaces-roles", label: "Roles" },
      { id: "workspaces-settings", label: "Settings" },
    ],
  },
];

// Flatten to right-rail headings (in document order, level 2 only)
const HEADINGS: ReadonlyArray<DocsRailHeading> = CATEGORIES.flatMap((cat) =>
  cat.items.map<DocsRailHeading>((it) => ({
    id: it.id,
    label: it.label,
    level: 2,
  })),
);

// ── Code samples ────────────────────────────────────────────────────────────

const SAMPLE_TOOL_CALL_TS = `// agent_tools.ts
export const tools = [
  {
    name: "add_node",
    description: "Add one typed node to the canvas.",
    input: {
      systemId: "string",
      type: "string",
      title: "string",
      x: "number",
      y: "number",
    },
  },
  {
    name: "add_pipe",
    description: "Connect two existing nodes.",
    input: {
      systemId: "string",
      fromNodeId: "string",
      toNodeId: "string",
    },
  },
  { name: "update_node", description: "Rename or relocate a node." },
  { name: "delete_node", description: "Remove a node; pipes cascade." },
  { name: "validate", description: "Run the static validator." },
] as const;`;

const SAMPLE_MCP_CURL = `curl https://app.pipes.dev/api/protocol/mcp \\
  -X POST \\
  -H "Authorization: Bearer ptk_live_replace_me" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool": "list_systems",
    "input": { "limit": 10 }
  }'`;

const SAMPLE_MCP_RESPONSE = `{
  "ok": true,
  "data": {
    "systems": [
      {
        "id": "sys_01HQK3D2NXR4M9F7Z8AVB6PJTK",
        "name": "Inbound research pipeline",
        "nodeCount": 14,
        "pipeCount": 21,
        "version": "v3"
      }
    ]
  }
}`;

const SAMPLE_VALIDATE = `// Inside an agent runtime
const result = await pipes.invoke("validate", {
  systemId: "sys_01HQK3D2NXR4M9F7Z8AVB6PJTK",
});

if (!result.ok) {
  for (const err of result.errors) {
    console.warn(\`\${err.nodeId ?? err.pipeId}: \${err.message}\`);
  }
}`;

const SAMPLE_TOKEN_HTTP = `POST /api/protocol/tokens
Authorization: Bearer ptk_admin_replace_me
Content-Type: application/json

{
  "name": "ci-validate",
  "capabilities": ["systems:read", "validation:read"],
  "expiresInDays": 90
}`;

const SAMPLE_TOKEN_RESPONSE = `{
  "ok": true,
  "data": {
    "id": "tok_01HQK4...",
    "name": "ci-validate",
    "secret": "ptk_live_4f5a...c91d",
    "capabilities": ["systems:read", "validation:read"],
    "createdAt": "2026-06-10T14:11:09Z"
  }
}`;

const SAMPLE_SHORTCUTS_BASH = `# Editor shortcuts (Mac shown; Cmd is Ctrl on other platforms)
Cmd+K       Open the command palette
Cmd+Z       Undo (one agent turn = one Cmd+Z)
Cmd+Shift+Z Redo
Cmd+/       Toggle the inspector panel
Cmd+Enter   Run the static validator
?           Show the full shortcuts overlay
Esc         Close any open dialog or panel`;

const SAMPLE_TEMPLATE_TS = `// Create a starter from your current system
import { Pipes } from "@pipes-ai/sdk";

const pipes = new Pipes({ token: process.env.PIPES_TOKEN });

await pipes.templates.create({
  sourceSystemId: "sys_01HQK3D2NXR4M9F7Z8AVB6PJTK",
  name: "Inbound research starter",
  summary: "Crawl, summarize, route, and store.",
  capabilities: ["templates:read", "templates:instantiate"],
});`;

// ── Page ────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <DocsLayout
      categories={CATEGORIES}
      headings={HEADINGS}
      header={
        <>
          <p className="t-overline text-[#4F46E5] mb-2">Docs</p>
          <h1 className="t-h1 text-[#111]" style={{ letterSpacing: "-0.025em" }}>
            For the staff engineer wiring this up.
          </h1>
          <p className="mt-2 t-body text-[#3C3C43] max-w-2xl">
            Real concepts. Real code. The reference an engineer reads at 11pm
            before shipping. Skip the marketing; everything below compiles or
            runs.
          </p>
        </>
      }
    >
      {/* Getting started ─────────────────────────────────────────────────── */}
      <DocsSection id="quickstart" title="Quickstart" eyebrow="Getting started">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Four steps. None of them are install steps. Pipes runs in the browser;
          you sign in and you type.
        </p>
        <ol className="flex flex-col gap-2 t-body text-[#3C3C43] leading-relaxed pl-0 list-none mb-3">
          <li className="flex gap-3">
            <span className="shrink-0 inline-flex w-6 h-6 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5] t-caption font-semibold">
              1
            </span>
            <span>
              Sign in at <InlineCode>app.pipes.dev</InlineCode>. A free
              workspace is created with you as the only member.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 inline-flex w-6 h-6 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5] t-caption font-semibold">
              2
            </span>
            <span>
              Describe the system in one sentence. The agent draws nodes and
              pipes in front of you in under two seconds.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 inline-flex w-6 h-6 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5] t-caption font-semibold">
              3
            </span>
            <span>
              Correct it. You type, the agent edits. Cmd-Z undoes one whole
              turn so you can iterate fast.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 inline-flex w-6 h-6 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5] t-caption font-semibold">
              4
            </span>
            <span>
              Mint a token. Hand it to your agent runtime. Every agent reads
              the same graph through one protocol.
            </span>
          </li>
        </ol>
        <DocsCallout tone="tip" title="Skip the install loop">
          There is no CLI to install for v1. The editor and the protocol are
          both reachable over the network with a single token.
        </DocsCallout>
      </DocsSection>

      <DocsSection id="mental-model" title="Mental model">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          A node is a thing that does work. A pipe is a typed contract between
          two things. The graph is what your team and your agents agree on
          before any code runs.
        </p>
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          You stop drawing on a whiteboard. You stop re-explaining the system
          in chat. You describe the system once and iterate it in the same
          window the agent uses to read it back.
        </p>
        <DocsHeading id="mental-model-nodes" level={3}>
          What a node carries
        </DocsHeading>
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Every node has a type, a title, a description, optional config, and
          a typed port set. The 27 node types ship with deterministic config
          schemas so the inspector renders a typed form, not a JSON blob.
        </p>
        <DocsHeading id="mental-model-pipes" level={3}>
          What a pipe means
        </DocsHeading>
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          A pipe connects an output port on one node to an input port on
          another. The two ports must have compatible types. The validator
          surfaces every mismatch inline, not at runtime.
        </p>
      </DocsSection>

      <DocsSection id="first-system" title="Your first system">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Open an empty canvas and type the sentence below. The agent will
          place three nodes left to right and draw two pipes between them.
        </p>
        <DocsCodeBlock
          language="text"
          code={`A crawler reads URLs from a queue, a summarizer turns each page into a paragraph, and a writer drops the paragraphs into Notion.`}
        />
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Three nodes is the floor; the agent will not draw fewer. If your
          first sentence is ambiguous, the agent picks the most plausible
          reading and builds. You correct it.
        </p>
      </DocsSection>

      {/* The agent ───────────────────────────────────────────────────────── */}
      <DocsSection
        id="agent-how-it-builds"
        title="How the agent builds"
        eyebrow="The agent"
      >
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The agent is plan-first. Before any tool call, it emits a written
          plan: it restates the system in your framing, names every node and
          pipe, and gives one sentence of reasoning for each. Then it builds.
          One plan per turn.
        </p>
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Nodes are placed left to right. The first node lands at{" "}
          <InlineCode>x=240, y=180</InlineCode>. Each subsequent node steps{" "}
          <InlineCode>x</InlineCode> by 220. New rows step{" "}
          <InlineCode>y</InlineCode> by 140 and reset <InlineCode>x</InlineCode>{" "}
          to 240. That rule is in the system prompt; the agent does not
          improvise layout.
        </p>
        <DocsCallout tone="info" title="The cap is a feature">
          Each turn is hard-capped at 30 tool calls and 60 seconds. The 31st
          call is refused server-side. The cap exists to bound runaway loops
          and runaway cost; it is non-negotiable for v1.
        </DocsCallout>
      </DocsSection>

      <DocsSection id="agent-plan-editor" title="The plan editor">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The chat is the input. The canvas is the output. There is no second
          window. The plan that the agent writes is visible above the streaming
          tool calls so you can interrupt before the build runs.
        </p>
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Manual edits during a build always win. If you grab a node, the agent
          yields. The next turn reads the current graph, including your edit,
          as its starting point.
        </p>
      </DocsSection>

      <DocsSection id="agent-tool-surface" title="The tool surface">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Five tools. Not twenty. New engineers hold this surface in their
          head on day one.
        </p>
        <DocsCodeBlock
          language="ts"
          filename="agent_tools.ts"
          code={SAMPLE_TOOL_CALL_TS}
        />
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Each tool maps to a single <InlineCode>EditorGraphAction</InlineCode>{" "}
          on the client. The optimistic queue applies the action immediately,
          then flushes to <InlineCode>/api/graph</InlineCode> with idempotency
          keyed on the streaming <InlineCode>tool_result.id</InlineCode>.
        </p>
      </DocsSection>

      <DocsSection id="agent-eval-gates" title="Eval gates">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Every action runs through deterministic checks before it lands. The
          agent calls <InlineCode>add_node</InlineCode> before{" "}
          <InlineCode>add_pipe</InlineCode>; it cannot connect what does not
          exist. It calls <InlineCode>validate</InlineCode> at most once per
          turn, at the end, before sending the final message.
        </p>
        <DocsCodeBlock
          language="ts"
          filename="validate_example.ts"
          code={SAMPLE_VALIDATE}
        />
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The validator runs static analysis on the system graph: missing
          handlers, broken routes, contract mismatches between ports. The
          report is read-only and returned verbatim on the{" "}
          <InlineCode>tool_result</InlineCode> event.
        </p>
      </DocsSection>

      {/* Protocol ────────────────────────────────────────────────────────── */}
      <DocsSection
        id="protocol-overview"
        title="MCP overview"
        eyebrow="Protocol"
      >
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The protocol exposes the same bounded service layer the editor uses.
          One endpoint, one auth scheme, one capability model. Point any
          MCP-aware agent at{" "}
          <InlineCode>POST /api/protocol/mcp</InlineCode> with a Bearer token
          and dispatch tools.
        </p>
        <DocsCallout tone="info" title="One protocol, two transports">
          REST endpoints live under <InlineCode>/api/protocol</InlineCode> for
          general use. MCP dispatches through{" "}
          <InlineCode>/api/protocol/mcp</InlineCode>. Both transports share the
          same capability checks and the same audit log.
        </DocsCallout>
      </DocsSection>

      <DocsSection id="protocol-authentication" title="Authentication">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Tokens are minted per workspace. They begin with{" "}
          <InlineCode>ptk_</InlineCode>. The server stores only their SHA-256
          hash; the raw secret is shown exactly once at creation time. Lose it
          and you mint a new one.
        </p>
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Authenticate with a Bearer header on every request:
        </p>
        <DocsCodeBlock
          language="http"
          code={`POST /api/protocol/mcp
Authorization: Bearer ptk_live_replace_me
Content-Type: application/json

{ "tool": "list_systems", "input": {} }`}
        />
      </DocsSection>

      <DocsSection id="protocol-capabilities" title="Capabilities">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Tokens carry an explicit capability set. Service methods call{" "}
          <InlineCode>requireCapability(ctx, &quot;graph:write&quot;, systemId)</InlineCode>;
          a missing capability returns 403 with a stable error code.
        </p>
        <DocsCodeBlock
          language="text"
          code={`systems:read         schema:read           templates:read
systems:write        graph:write           templates:instantiate
versions:read        comments:write        import:write
versions:write       validation:read`}
        />
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The principle: every token is the smallest set of capabilities the
          job needs. A CI validator wants <InlineCode>systems:read</InlineCode>{" "}
          and <InlineCode>validation:read</InlineCode> and nothing else.
        </p>
      </DocsSection>

      <DocsSection id="protocol-quickstart" title="Quickstart code">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          List systems with a single curl call. Replace{" "}
          <InlineCode>ptk_live_replace_me</InlineCode> with your token.
        </p>
        <DocsCodeBlock language="bash" code={SAMPLE_MCP_CURL} />
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The response shape is stable. Errors return a{" "}
          <InlineCode>{`{ ok: false, error: { code, message } }`}</InlineCode>{" "}
          envelope; success returns the typed payload under{" "}
          <InlineCode>data</InlineCode>.
        </p>
        <DocsCodeBlock
          language="json"
          filename="response.json"
          code={SAMPLE_MCP_RESPONSE}
        />
      </DocsSection>

      {/* Editor ──────────────────────────────────────────────────────────── */}
      <DocsSection id="editor-canvas" title="The canvas" eyebrow="Editor">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The canvas is your authoring surface. It validates as you draw, so
          broken contracts surface inline. Pan with two fingers or the space
          bar; zoom with the trackpad or <InlineCode>Cmd+/-</InlineCode>.
        </p>
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Selection is sticky: clicking a node opens the inspector and keeps
          it open as you edit. Multi-select with shift-click; drag to box-
          select.
        </p>
      </DocsSection>

      <DocsSection id="editor-inspector" title="The inspector">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The inspector renders a typed form for the selected node. Each node
          type ships with a <InlineCode>ConfigFieldDef[]</InlineCode> schema
          (see <InlineCode>src/domain/node_config/schema.ts</InlineCode>) so
          the form is generated, not hand-built.
        </p>
        <DocsCallout tone="warning" title="No free-form JSON in v1">
          Adding a new node type means adding its config schema. The inspector
          will not render an unknown type, by design. Schema first, then
          render.
        </DocsCallout>
      </DocsSection>

      <DocsSection id="editor-command-palette" title="The command palette">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Press <InlineCode>Cmd+K</InlineCode> anywhere in the editor to open
          the command palette. It searches every registered shortcut, every
          known node type, and the current system index. Enter runs the top
          result.
        </p>
      </DocsSection>

      <DocsSection id="editor-shortcuts" title="Keyboard shortcuts">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The full registry lives in{" "}
          <InlineCode>src/lib/keyboard/registry.ts</InlineCode>. The shortcuts
          you will actually use:
        </p>
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFA]">
              <tr>
                <th className="px-4 py-2 t-overline text-[#8E8E93] font-semibold">
                  Combo
                </th>
                <th className="px-4 py-2 t-overline text-[#8E8E93] font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Cmd+K", "Open the command palette"],
                ["Cmd+Z", "Undo one agent turn"],
                ["Cmd+Shift+Z", "Redo"],
                ["Cmd+/", "Toggle the inspector panel"],
                ["Cmd+Enter", "Run the static validator"],
                ["?", "Show the full shortcuts overlay"],
                ["Esc", "Close any open dialog"],
              ].map(([combo, action]) => (
                <tr
                  key={combo}
                  className="border-t border-black/[0.04] last:border-b"
                >
                  <td className="px-4 py-2 t-mono t-label text-[#111]">
                    {combo}
                  </td>
                  <td className="px-4 py-2 t-label text-[#3C3C43]">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DocsCodeBlock
          language="bash"
          filename="shortcuts.txt"
          code={SAMPLE_SHORTCUTS_BASH}
        />
      </DocsSection>

      {/* Templates ──────────────────────────────────────────────────────── */}
      <DocsSection
        id="templates-what"
        title="What is a starter"
        eyebrow="Templates"
      >
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          A starter is a system snapshot you can instantiate into your
          workspace in one click. Each starter ships with a pre-filled prompt
          that the agent runs on instantiation so the canvas is alive in under
          two seconds.
        </p>
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Starters are stored as <InlineCode>plan_memory</InlineCode> entries
          tagged <InlineCode>subsystem_blueprint</InlineCode>. The blueprint
          id is the entry title.
        </p>
      </DocsSection>

      <DocsSection id="templates-browse" title="Browse starters">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Open the starters gallery from the editor empty state or from{" "}
          <InlineCode>app.pipes.dev/templates</InlineCode>. Each card opens to
          a preview with the canonical prompt; pressing return on the prompt
          runs the agent and writes a new system into your workspace.
        </p>
      </DocsSection>

      <DocsSection id="templates-create" title="Create your own">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Promote any system to a starter from{" "}
          <InlineCode>Settings &gt; Templates</InlineCode>. Or do it
          programmatically with the SDK:
        </p>
        <DocsCodeBlock
          language="ts"
          filename="create_template.ts"
          code={SAMPLE_TEMPLATE_TS}
        />
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          The starter inherits the source system&apos;s validation rules.
          Drift between the starter and the source is shown in the version
          history view.
        </p>
      </DocsSection>

      {/* Tokens ─────────────────────────────────────────────────────────── */}
      <DocsSection id="tokens-generate" title="Generate" eyebrow="Tokens">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Mint a token from <InlineCode>Settings &gt; Tokens</InlineCode> or
          over the protocol. The response includes the raw secret exactly
          once.
        </p>
        <DocsCodeBlock language="http" code={SAMPLE_TOKEN_HTTP} />
        <DocsCodeBlock
          language="json"
          filename="response.json"
          code={SAMPLE_TOKEN_RESPONSE}
        />
      </DocsSection>

      <DocsSection id="tokens-scope" title="Scope">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Capabilities and the optional <InlineCode>systemIds</InlineCode>{" "}
          allowlist scope a token to the smallest possible blast radius. A
          token scoped to one system with{" "}
          <InlineCode>graph:write</InlineCode> cannot read any other system in
          the workspace.
        </p>
        <DocsCallout tone="tip" title="Rotate, do not share">
          Treat tokens like ssh keys. One per agent, one per CI job, one per
          on-call engineer. Rotation is one API call; sharing is permanent.
        </DocsCallout>
      </DocsSection>

      <DocsSection id="tokens-revoke" title="Revoke">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Revocation is instant. The token row flips to{" "}
          <InlineCode>revoked</InlineCode> and the next request returns 401.
          The audit log keeps the historical record so you can see what the
          token did before you killed it.
        </p>
        <DocsCodeBlock
          language="bash"
          code={`curl -X DELETE https://app.pipes.dev/api/protocol/tokens/tok_01HQK4 \\
  -H "Authorization: Bearer ptk_admin_replace_me"`}
        />
      </DocsSection>

      {/* Workspaces ─────────────────────────────────────────────────────── */}
      <DocsSection
        id="workspaces-members"
        title="Members"
        eyebrow="Workspaces"
      >
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          A workspace is the collaboration boundary. Billing, audit, and token
          scope all live here. Invite members from{" "}
          <InlineCode>Settings &gt; Members</InlineCode>; invites are sent
          over email and accepted in one click.
        </p>
      </DocsSection>

      <DocsSection id="workspaces-roles" title="Roles">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Three roles for v1: owner, editor, viewer. Owners manage billing and
          tokens. Editors author systems and run the agent. Viewers can read
          and comment but cannot mutate the graph.
        </p>
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Roles are enforced by{" "}
          <InlineCode>AccessService</InlineCode> in the bounded service layer.
          Every mutation funnels through one check; there is no second path.
        </p>
      </DocsSection>

      <DocsSection id="workspaces-settings" title="Settings">
        <p className="t-body text-[#3C3C43] leading-relaxed mb-3">
          Workspace settings live under{" "}
          <InlineCode>Settings &gt; Workspace</InlineCode>: name, default
          system region, billing plan, retention policy, and the admin
          allowlist. Changes are audited.
        </p>
        <DocsCallout tone="info" title="What is intentionally missing">
          No nested folders. No per-system retention overrides. No bring-your-
          own-model. These are not on the roadmap until a team on the Team
          plan asks for them.
        </DocsCallout>
      </DocsSection>
    </DocsLayout>
  );
}

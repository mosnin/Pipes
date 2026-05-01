import Link from "next/link";
import { ArrowUpRight, BookOpen, GitBranch } from "lucide-react";
import { InlineCode } from "@/components/ui";

export const metadata = {
  title: "Docs - Pipes",
  description: "Draw, validate, and ship systems with Pipes.",
};

// ─── TOC and content data ─────────────────────────────────────────────────────

const TOC_SECTIONS = [
  {
    title: "Get started",
    items: [
      { id: "introduction",  label: "Introduction" },
      { id: "quickstart",    label: "Quickstart" },
      { id: "concepts",      label: "Core concepts" },
    ],
  },
  {
    title: "Authoring",
    items: [
      { id: "canvas",        label: "The canvas" },
      { id: "nodes-ports",   label: "Nodes and ports" },
      { id: "validation",    label: "Validation" },
      { id: "simulation",    label: "Simulation" },
    ],
  },
  {
    title: "Collaboration",
    items: [
      { id: "workspaces",    label: "Workspaces" },
      { id: "versioning",    label: "Versioning" },
      { id: "comments",      label: "Comments and review" },
    ],
  },
  {
    title: "Protocol",
    items: [
      { id: "protocol",      label: "Overview" },
      { id: "tokens",        label: "Tokens and capabilities" },
      { id: "mcp",           label: "MCP transport" },
      { id: "rest",          label: "REST transport" },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "schema",        label: "Schema v1" },
      { id: "node-types",    label: "Node types" },
      { id: "errors",        label: "Errors and limits" },
    ],
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="t-h2 text-[#111] scroll-mt-24 mt-14 mb-3 first:mt-0"
      style={{ letterSpacing: "-0.02em" }}
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="t-h3 text-[#111] mt-8 mb-2" style={{ letterSpacing: "-0.01em" }}>
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="t-body text-[#3C3C43] leading-relaxed mb-3">{children}</p>;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="surface-muted my-4 overflow-x-auto rounded-[8px] border border-black/[0.06] p-4 t-mono text-[#111]"
         style={{ fontSize: 13, lineHeight: 1.6 }}>
      {children}
    </pre>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="bg-white">
      {/* Header bar */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 t-overline text-[#8E8E93]">
              <BookOpen size={12} aria-hidden="true" />
              Documentation
            </div>
            <h1
              className="mt-2 t-h1 text-[#111]"
              style={{ letterSpacing: "-0.025em" }}
            >
              Build, validate, and ship systems with Pipes.
            </h1>
            <p className="mt-2 t-body text-[#3C3C43] max-w-2xl">
              Concepts, guides, and reference. Everything you need to take a system
              from idea to production handoff.
            </p>
          </div>
          <Link
            href="https://github.com/pipes-ai/pipes"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-black/[0.14] bg-white px-3 h-9 t-label font-semibold text-[#111] hover:border-black/[0.24] hover:bg-black/[0.02] transition-colors w-fit"
          >
            <GitBranch size={14} aria-hidden="true" />
            View on GitHub
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-10">
          {/* TOC sidebar */}
          <aside className="hidden lg:block">
            <nav
              className="sticky top-20 flex flex-col gap-6 max-h-[calc(100vh-6rem)] overflow-y-auto"
              aria-label="Documentation table of contents"
            >
              {TOC_SECTIONS.map((section) => (
                <div key={section.title} className="flex flex-col gap-1.5">
                  <h4 className="t-overline text-[#8E8E93] mb-1 px-2">
                    {section.title}
                  </h4>
                  {section.items.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="px-2 py-1 rounded-md t-label text-[#3C3C43] hover:text-[#111] hover:bg-black/[0.04] transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              ))}
            </nav>
          </aside>

          {/* Center content */}
          <article className="max-w-3xl">
            <H2 id="introduction">Introduction</H2>
            <P>
              Pipes is a typed canvas, validation engine, and protocol layer for the
              architecture your team and agents share. A Pipes system is more than a
              diagram - it is an executable contract any agent can read.
            </P>
            <P>
              This guide will walk you through the core concepts, then show you how
              to wire your first system to an agent over MCP.
            </P>

            <H2 id="quickstart">Quickstart</H2>
            <P>
              Create a workspace and your first system in under five minutes.
            </P>
            <H3>1. Create a workspace</H3>
            <P>
              Sign up at <InlineCode>app.pipes.dev</InlineCode> and create a free
              workspace. Workspaces are your collaboration boundary - billing and
              access are scoped here.
            </P>
            <H3>2. Pick a template</H3>
            <P>
              From the templates gallery, fork a starter system that matches your
              workload. Templates are pre-validated and come with sensible defaults.
            </P>
            <CodeBlock>{`# Or instantiate from CLI
pipes templates instantiate multi-agent-research \\
  --workspace my-workspace`}</CodeBlock>

            <H3>3. Connect an agent</H3>
            <P>
              Mint a token in <InlineCode>Settings &gt; Tokens</InlineCode> and pass
              it to your agent runtime. The token is scoped to the capabilities you
              choose.
            </P>
            <CodeBlock>{`curl https://app.pipes.dev/api/protocol/systems \\
  -H "Authorization: Bearer ptk_your_token_here"`}</CodeBlock>

            <H2 id="concepts">Core concepts</H2>
            <H3>Systems</H3>
            <P>
              A system is the top-level artifact in Pipes. It owns nodes, pipes,
              ports, validations, versions, and an audit log.
            </P>
            <H3>Nodes</H3>
            <P>
              Nodes are typed building blocks. There are 27 node types covering
              services, agents, jobs, queues, humans, and more. Each node defines
              typed input and output ports.
            </P>
            <H3>Pipes</H3>
            <P>
              Pipes connect ports. A pipe carries a typed payload and may attach
              policy, retry, and observability metadata.
            </P>

            <H2 id="canvas">The canvas</H2>
            <P>
              The canvas is your authoring surface. It validates as you draw, so
              broken contracts surface inline - not at runtime.
            </P>

            <H2 id="nodes-ports">Nodes and ports</H2>
            <P>
              Open the inspector to edit per-node configuration. Each node type ships
              with a typed config schema rendered as form fields.
            </P>

            <H2 id="validation">Validation</H2>
            <P>
              The validation engine runs static analysis on the system graph. It
              catches missing handlers, broken routes, and contract mismatches.
            </P>

            <H2 id="simulation">Simulation</H2>
            <P>
              Simulation walks the graph with synthetic payloads. Use it to verify
              that scenarios route the way you expect before promoting a version.
            </P>

            <H2 id="workspaces">Workspaces</H2>
            <P>
              A workspace is a shared environment with its own membership, billing,
              and audit trail. Invite teammates and assign roles from{" "}
              <InlineCode>Settings &gt; Members</InlineCode>.
            </P>

            <H2 id="versioning">Versioning</H2>
            <P>
              Snapshot a system to lock its current state as an immutable version.
              Diff, compare, and roll back from the version history view.
            </P>

            <H2 id="comments">Comments and review</H2>
            <P>
              Drop comments directly on nodes and pipes. Reviews can be required
              before promoting a version on Team plans and above.
            </P>

            <H2 id="protocol">Protocol overview</H2>
            <P>
              Pipes exposes the same bounded service layer over two transports: REST
              for general use, and MCP for agent integrations. Both authenticate
              with capability-scoped tokens.
            </P>

            <H2 id="tokens">Tokens and capabilities</H2>
            <P>
              Tokens are minted per-workspace. They start with{" "}
              <InlineCode>ptk_</InlineCode> and store only their hash on the server.
              Each token carries one or more of these capabilities:
            </P>
            <CodeBlock>{`systems:read         schema:read        templates:read
systems:write        graph:write        templates:instantiate
versions:read        comments:write     import:write
versions:write       validation:read`}</CodeBlock>

            <H2 id="mcp">MCP transport</H2>
            <P>
              Point your agent at <InlineCode>POST /api/protocol/mcp</InlineCode>{" "}
              with a Bearer token. Tools dispatch through the same service layer
              used by the editor.
            </P>
            <CodeBlock>{`POST /api/protocol/mcp
Authorization: Bearer ptk_...
Content-Type: application/json

{ "tool": "list_systems", "input": {} }`}</CodeBlock>

            <H2 id="rest">REST transport</H2>
            <P>
              REST endpoints live under <InlineCode>/api/protocol</InlineCode>.
              See the protocol page for the full list.
            </P>

            <H2 id="schema">Schema v1</H2>
            <P>
              The canonical export format is{" "}
              <InlineCode>pipes_schema_v1</InlineCode>, validated by Zod and
              versioned with explicit migrations.
            </P>

            <H2 id="node-types">Node types</H2>
            <P>
              27 node types ship in v1. Each has a typed config schema, a default
              port set, and an icon. See the protocol reference for the canonical list.
            </P>

            <H2 id="errors">Errors and limits</H2>
            <P>
              Rate limits are 120 reads/min, 60 writes/min, 120 MCP calls/min per
              token. All errors return a structured JSON body with a stable code.
            </P>
          </article>
        </div>
      </div>
    </div>
  );
}

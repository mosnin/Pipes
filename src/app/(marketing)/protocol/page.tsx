import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Code2,
  FileCode,
  GitCommitVertical,
  ListTree,
  MessageSquare,
  PackageOpen,
  PencilRuler,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { InlineCode } from "@/components/ui";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export const metadata = {
  title: "Your map, behind a Bearer token - Pipes",
  description:
    "Hand any agent a token. It reads the system the way your team does. MCP and REST over one audited service layer.",
};

// ─── Capability data ──────────────────────────────────────────────────────────

type Capability = {
  cap: string;
  desc: string;
  icon: React.ReactNode;
};

const CAPABILITIES: readonly Capability[] = [
  {
    cap: "systems:read",
    desc: "List and fetch systems and their metadata.",
    icon: <ListTree size={16} aria-hidden="true" />,
  },
  {
    cap: "systems:write",
    desc: "Create, rename, and delete systems.",
    icon: <PencilRuler size={16} aria-hidden="true" />,
  },
  {
    cap: "schema:read",
    desc: "Export systems as canonical pipes_schema_v1.",
    icon: <FileCode size={16} aria-hidden="true" />,
  },
  {
    cap: "templates:read",
    desc: "List the catalog of starters.",
    icon: <Boxes size={16} aria-hidden="true" />,
  },
  {
    cap: "templates:instantiate",
    desc: "Open a starter prompt in a new system.",
    icon: <PackageOpen size={16} aria-hidden="true" />,
  },
  {
    cap: "versions:read",
    desc: "Inspect version history and snapshots.",
    icon: <GitCommitVertical size={16} aria-hidden="true" />,
  },
  {
    cap: "versions:write",
    desc: "Snapshot and promote system versions.",
    icon: <GitCommitVertical size={16} aria-hidden="true" />,
  },
  {
    cap: "graph:write",
    desc: "Apply node, port, and pipe mutations.",
    icon: <Workflow size={16} aria-hidden="true" />,
  },
  {
    cap: "comments:write",
    desc: "Post comments and review threads.",
    icon: <MessageSquare size={16} aria-hidden="true" />,
  },
  {
    cap: "import:write",
    desc: "Import systems from raw schema payloads.",
    icon: <Code2 size={16} aria-hidden="true" />,
  },
  {
    cap: "validation:read",
    desc: "Run validation and read structured reports.",
    icon: <ShieldCheck size={16} aria-hidden="true" />,
  },
] as const;

// ─── Code samples ─────────────────────────────────────────────────────────────

const AUTH_SAMPLE = `# All routes accept a capability-scoped Bearer token.
Authorization: Bearer ptk_live_92c1...

curl https://app.pipes.dev/api/protocol/systems \\
  -H "Authorization: Bearer ptk_live_92c1..." \\
  -H "Idempotency-Key: 4f5b-..."`;

const QUICKSTART_LIST = `POST /api/protocol/mcp
Authorization: Bearer ptk_live_92c1...
Content-Type: application/json

{
  "tool": "list_systems",
  "input": {}
}`;

const QUICKSTART_INSTANTIATE = `POST /api/protocol/mcp
Authorization: Bearer ptk_live_92c1...
Content-Type: application/json

{
  "tool": "instantiate_template",
  "input": {
    "templateId": "multi-agent-research",
    "name": "Research crew v1"
  }
}`;

const QUICKSTART_VALIDATE = `POST /api/protocol/mcp
Authorization: Bearer ptk_live_92c1...
Content-Type: application/json

{
  "tool": "get_validation_report",
  "input": { "systemId": "sys_8a72..." }
}`;

// ─── Code block primitive ─────────────────────────────────────────────────────

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      className="surface-muted overflow-x-auto rounded-[8px] border border-black/[0.06] p-4 t-mono text-[#111]"
      style={{ fontSize: 12.5, lineHeight: 1.6 }}
    >
      {children}
    </pre>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProtocolPage() {
  return (
    <div className="bg-white">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-black/[0.06] bg-white pt-20 pb-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h1
            className="text-[#111]"
            style={{
              fontSize: 56,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontWeight: 700,
            }}
          >
            Your map, behind a Bearer token.
          </h1>
          <p className="mt-6 t-body text-[#3C3C43] max-w-2xl">
            The graph the in-product agent built is the same MCP-readable artifact a human would draw. Hand any agent a token. It reads the same map your team does.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/settings/tokens"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#111] px-5 h-11 t-label font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Mint an API token
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/docs#protocol"
              className="inline-flex items-center gap-1.5 rounded-md border border-black/[0.14] bg-white px-5 h-11 t-label font-semibold text-[#111] hover:border-black/[0.24] hover:bg-black/[0.02] transition-colors"
            >
              Read the docs
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 t-caption text-[#8E8E93]">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              120 reads/min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              60 writes/min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              120 MCP calls/min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} aria-hidden="true" />
              SHA-256 hashed at rest
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. CAPABILITIES GRID ────────────────────────────────────────────── */}
      <section className="surface-subtle border-b border-black/[0.06] py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl mb-12">
            <SectionBadge label="Capabilities" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ letterSpacing: "-0.025em" }}
            >
              Scope every token to exactly what it needs.
            </h2>
            <p className="mt-3 t-body text-[#3C3C43]">
              Capabilities are the unit of access. A token can hold one or many,
              and every call is checked through{" "}
              <InlineCode>requireCapability(ctx, ...)</InlineCode>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CAPABILITIES.map(({ cap, desc, icon }) => (
              <div
                key={cap}
                className="flex items-start gap-3 rounded-[12px] border border-black/[0.08] bg-white p-4"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-indigo-600">
                  {icon}
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  <InlineCode className="w-fit">{cap}</InlineCode>
                  <p className="t-caption text-[#3C3C43] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. AUTHENTICATION ───────────────────────────────────────────────── */}
      <section className="border-b border-black/[0.06] bg-white py-20 px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10">
          <div>
            <SectionBadge label="Authentication" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ letterSpacing: "-0.025em" }}
            >
              Bearer tokens, scoped and hashed.
            </h2>
            <p className="mt-4 t-body text-[#3C3C43]">
              Tokens start with <InlineCode>ptk_</InlineCode>. Only their SHA-256
              hash is stored. Idempotent writes accept an{" "}
              <InlineCode>Idempotency-Key</InlineCode> header.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5 t-label text-[#3C3C43]">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8E8E93]" />
                Capability-scoped at mint time
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8E8E93]" />
                Workspace-bound; never crosses tenants
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8E8E93]" />
                Revocable in one click from the editor
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8E8E93]" />
                Audit log entry on every call
              </li>
            </ul>
          </div>
          <div>
            <CodeBlock>{AUTH_SAMPLE}</CodeBlock>
          </div>
        </div>
      </section>

      {/* ── 4. QUICKSTART ───────────────────────────────────────────────────── */}
      <section className="surface-subtle border-b border-black/[0.06] py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl mb-12">
            <SectionBadge label="Quickstart" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ letterSpacing: "-0.025em" }}
            >
              Three calls to plug an agent into the system.
            </h2>
            <p className="mt-3 t-body text-[#3C3C43]">
              Mint a token, point your agent at the MCP endpoint, then read your
              first system in under a minute.
            </p>
          </div>

          <ol className="flex flex-col gap-8">
            {[
              {
                title: "List your systems",
                body: "Verify auth and discover what's available in the workspace.",
                code: QUICKSTART_LIST,
              },
              {
                title: "Open a starter",
                body: "Open one of the starters as a fresh, validated system.",
                code: QUICKSTART_INSTANTIATE,
              },
              {
                title: "Validate before you ship",
                body: "Pull the structured validation report your agent should respect.",
                code: QUICKSTART_VALIDATE,
              },
            ].map((step, idx) => (
              <li
                key={step.title}
                className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6 items-start"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="t-mono shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/[0.08] bg-white text-[#3C3C43]"
                    style={{ fontSize: 13 }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="t-title text-[#111]">{step.title}</h3>
                    <p className="mt-1 t-label text-[#3C3C43] leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </div>
                <CodeBlock>{step.code}</CodeBlock>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 5. CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-white py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="t-h1 text-[#111]"
            style={{ letterSpacing: "-0.025em" }}
          >
            Plug your agent into a real architecture.
          </h2>
          <p className="mt-4 t-body text-[#3C3C43]">
            Describe a system in one sentence. Mint a token. Hand it to any agent. They read the same graph your team does.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup?source=protocol_cta"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#111] px-5 h-11 t-label font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Start free
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/docs#protocol"
              className="inline-flex items-center gap-1.5 rounded-md border border-black/[0.14] bg-white px-5 h-11 t-label font-semibold text-[#111] hover:border-black/[0.24] hover:bg-black/[0.02] transition-colors"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProtocolHero } from "@/components/marketing/ProtocolHero";
import { ProtocolCapabilityGrid } from "@/components/marketing/ProtocolCapabilityGrid";
import { ProtocolCodeTabs } from "@/components/marketing/ProtocolCodeTabs";
import type { ProtocolCodeSample } from "@/components/marketing/ProtocolCodeTabs";
import { ProtocolAuthFlow } from "@/components/marketing/ProtocolAuthFlow";
import { ProtocolErrorReference } from "@/components/marketing/ProtocolErrorReference";
import { SectionBadge } from "@/components/marketing/SectionBadge";
import { ProtocolReadingProgress } from "@/components/marketing/ProtocolReadingProgress";

export const metadata = {
  title: "One token. Every agent reads the loop. - Pipes Loop API",
  description:
    "Pipes speaks MCP. Hand any agent a Bearer token and it reads the loop — steps, connections, evaluators — exactly the way your team does.",
};

// ───────────────────────────────────────────────────────────────────────────
// Code samples
// ───────────────────────────────────────────────────────────────────────────

const QUICKSTART_SAMPLES: ReadonlyArray<ProtocolCodeSample> = [
  {
    id: "typescript",
    label: "TypeScript",
    code: `// List the systems in your workspace.
const res = await fetch("https://app.pipes.dev/api/protocol/mcp", {
  method: "POST",
  headers: {
    "authorization": \`Bearer \${process.env.LOOPER_TOKEN}\`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    tool: "list_systems",
    input: {}
  })
});

const { ok, data, requestId } = await res.json();
console.log(ok, data.length, requestId);`,
  },
  {
    id: "python",
    label: "Python",
    code: `import os, requests

# List the systems in your workspace.
res = requests.post(
    "https://app.pipes.dev/api/protocol/mcp",
    headers={
        "Authorization": f"Bearer {os.environ['LOOPER_TOKEN']}",
        "Content-Type": "application/json",
    },
    json={"tool": "list_systems", "input": {}},
    timeout=30,
)

payload = res.json()
print(payload["ok"], len(payload["data"]), payload["requestId"])`,
  },
  {
    id: "bash",
    label: "cURL",
    code: `# List the systems in your workspace.
curl -sS https://app.pipes.dev/api/protocol/mcp \\
  -H "Authorization: Bearer $LOOPER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"tool":"list_systems","input":{}}'`,
  },
  {
    id: "json",
    label: "Claude Desktop",
    code: `{
  "mcpServers": {
    "pipes": {
      "command": "npx",
      "args": ["-y", "@looper/mcp-client"],
      "env": {
        "LOOPER_BASE_URL": "https://app.pipes.dev",
        "LOOPER_TOKEN": "ptk_live_..."
      }
    }
  }
}`,
  },
];

const LIST_RESPONSE = `HTTP/1.1 200 OK
content-type: application/json

{
  "ok": true,
  "requestId": "req_01HZ4...",
  "data": [
    {
      "id": "sys_8a72f1c0",
      "name": "Research crew v1",
      "updatedAt": "2026-06-08T17:21:04.000Z",
      "nodeCount": 6,
      "pipeCount": 5
    }
  ]
}`;

const AUTH_SAMPLE = `# Every request carries one header.
Authorization: Bearer ptk_live_92c1c8f9a4b6...

# Writes accept an idempotency key. Replays are safe.
Idempotency-Key: 4f5b8d10-3c1c-4f3c-9c8a-2c3e6f7a1b2c

# Tokens are scoped at mint time. The router enforces them
# server-side via requireCapability(ctx, "graph:write", systemId).`;

// ───────────────────────────────────────────────────────────────────────────
// Inline code block
// ───────────────────────────────────────────────────────────────────────────

interface CodeBlockProps {
  code: string;
  language?: "bash" | "json" | "http";
}

/**
 * ProtocolCodeBlock
 *
 * Lightweight code block with a one-pass tokenizer for the few literal
 * snippets the page renders (HTTP responses, auth comments). Uses a dark
 * background to match the SSE demo and tabs.
 */
function ProtocolCodeBlock({ code, language = "bash" }: CodeBlockProps) {
  const lines = code.split("\n");
  return (
    <pre
      className="t-mono whitespace-pre rounded-[16px] bg-[#0F1115] text-[#E6E6E9] px-5 py-4 overflow-x-auto border border-black/[0.08]"
      style={{ fontSize: 12.5, lineHeight: 1.65 }}
    >
      {lines.map((line, i) => (
        <div key={i}>{tintLine(line, language)}</div>
      ))}
    </pre>
  );
}

function tintLine(line: string, language: "bash" | "json" | "http") {
  if (line.startsWith("#")) {
    return <span style={{ color: "#6C7280" }}>{line || " "}</span>;
  }
  if (language === "http" && /^HTTP\/[0-9.]+/.test(line)) {
    const [head, ...rest] = line.split(" ");
    return (
      <>
        <span style={{ color: "#C792EA" }}>{head} </span>
        <span style={{ color: "#A8E060" }}>{rest.join(" ")}</span>
      </>
    );
  }
  if (language === "http" && /^[a-z-]+:/i.test(line)) {
    const idx = line.indexOf(":");
    return (
      <>
        <span style={{ color: "#82AAFF" }}>{line.slice(0, idx)}</span>
        <span style={{ color: "#C7C7CC" }}>:</span>
        <span style={{ color: "#E6E6E9" }}>{line.slice(idx + 1)}</span>
      </>
    );
  }
  if (language === "json" || language === "http") {
    return <JsonLine line={line} />;
  }
  return <span style={{ color: "#E6E6E9" }}>{line || " "}</span>;
}

function JsonLine({ line }: { line: string }) {
  if (line.length === 0) return <span> </span>;
  const tokens: Array<{ text: string; color: string }> = [];
  const re = /("[^"]*"\s*:)|("[^"]*")|(\btrue\b|\bfalse\b|\bnull\b)|(\b-?\d+(?:\.\d+)?\b)|([{}[\],])|(\s+)|([^\s{}[\]",]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1] != null) {
      tokens.push({ text: m[1].replace(/\s*:$/, ""), color: "#82AAFF" });
      tokens.push({ text: ":", color: "#C7C7CC" });
    } else if (m[2] != null) tokens.push({ text: m[2], color: "#A8E060" });
    else if (m[3] != null) tokens.push({ text: m[3], color: "#C792EA" });
    else if (m[4] != null) tokens.push({ text: m[4], color: "#F78C6C" });
    else if (m[5] != null) tokens.push({ text: m[5], color: "#C7C7CC" });
    else if (m[6] != null) tokens.push({ text: m[6], color: "#E6E6E9" });
    else tokens.push({ text: m[7] ?? "", color: "#E6E6E9" });
  }
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color }}>
          {t.text}
        </span>
      ))}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// SSE event schemas (real, from agent-contract.md)
// ───────────────────────────────────────────────────────────────────────────

interface StreamEventSpec {
  name: string;
  when: string;
  invariant: string;
  payload: string;
}

const STREAM_EVENTS: ReadonlyArray<StreamEventSpec> = [
  {
    name: "status",
    when: "Coarse UI state change. Fires when the runner switches between thinking, calling a tool, or writing the final message.",
    invariant: "May fire multiple times per turn.",
    payload: `event: status
data: { "state": "thinking" }`,
  },
  {
    name: "tool_call",
    when: "The agent is about to invoke a tool. Carries the arguments verbatim so a client can render an optimistic preview.",
    invariant: "Every tool_call is followed by exactly one tool_result with the same id, or a terminal error.",
    payload: `event: tool_call
data: {
  "id": "call_01",
  "tool_name": "add_node",
  "arguments": {
    "systemId": "sys_8a72",
    "type": "Agent",
    "title": "Planner"
  }
}`,
  },
  {
    name: "tool_result",
    when: "The tool returned. Carries the canonical EditorGraphAction the client should apply.",
    invariant: "Matches a prior tool_call by id. ok=false sets error and omits action.",
    payload: `event: tool_result
data: {
  "id": "call_01",
  "ok": true,
  "action": {
    "action": "addNode",
    "clientNodeId": "n_4f1c"
  }
}`,
  },
  {
    name: "message",
    when: "Streamed agent text to the user. Markdown is allowed. May fire several times per turn as chunks arrive.",
    invariant: "The client appends chunks. Exactly one final message event per successful turn.",
    payload: `event: message
data: {
  "text": "Planner agent calls GitHub.",
  "role": "assistant"
}`,
  },
  {
    name: "done",
    when: "Successful end of the turn. The connection closes after this.",
    invariant: "Last event in a successful turn. No events emitted after done.",
    payload: `event: done
data: {
  "conversationId": "conv_5e21",
  "turnId": "turn_001"
}`,
  },
  {
    name: "error",
    when: "Terminal error. The connection closes after this.",
    invariant: "Mutually exclusive with done. Codes: tool_call_limit_exceeded, timeout, auth_required, rate_limited, model_unavailable, internal.",
    payload: `event: error
data: {
  "code": "rate_limited",
  "message": "Rate limit reached",
  "retryable": true
}`,
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Section primitive
// ───────────────────────────────────────────────────────────────────────────

interface PanelProps {
  tone?: "white" | "subtle" | "inverse";
  radius?: number;
  children: React.ReactNode;
  ariaLabel?: string;
  id?: string;
}

function Panel({ tone = "white", radius = 32, children, ariaLabel, id }: PanelProps) {
  const toneClass =
    tone === "white"
      ? "bg-white text-[#111]"
      : tone === "inverse"
        ? "surface-inverse text-white"
        : "surface-subtle text-[#111]";
  return (
    <section className="px-4 sm:px-6" aria-label={ariaLabel} id={id}>
      <div className="mx-auto max-w-7xl">
        <div
          className={["relative overflow-hidden border border-black/[0.05]", toneClass].join(" ")}
          style={{ borderRadius: radius }}
        >
          <div className="px-6 sm:px-12 py-16 sm:py-24">{children}</div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Page
// ───────────────────────────────────────────────────────────────────────────

export default function ProtocolPage() {
  return (
    <main className="bg-white">
      <ProtocolReadingProgress />

      <div className="flex flex-col gap-6 sm:gap-8 pb-12">
        {/* 1. HERO */}
        <ProtocolHero />

        {/* 2. WHAT IS THE PROTOCOL */}
        <Panel ariaLabel="What is the protocol">
          <header className="max-w-2xl">
            <SectionBadge label="The protocol" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ fontSize: 36, letterSpacing: "-0.025em" }}
            >
              The graph you build is the graph any agent reads.
            </h2>
            <p className="mt-3 t-body text-[#3C3C43]">
              One service layer. Two transports. Audited at every call.
            </p>
          </header>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "What it does",
                body: "Exposes your live system to any agent that speaks MCP. Tools list, fetch, mutate, snapshot, and validate against the canonical looper_schema_v1.",
              },
              {
                title: "Who uses it",
                body: "Your own agents. Claude Desktop. A custom MCP client your team writes in an afternoon. The shape is identical across every caller.",
              },
              {
                title: "What it returns",
                body: "Typed JSON. Every response carries ok, data, and requestId. Mutations emit Server-Sent Events the client renders in real time.",
              },
            ].map((p) => (
              <article
                key={p.title}
                className="rounded-[16px] border border-black/[0.08] bg-[#FAFAFA] p-5"
              >
                <h3 className="t-title text-[#111]" style={{ letterSpacing: "-0.01em" }}>
                  {p.title}
                </h3>
                <p className="mt-2 t-label text-[#3C3C43] leading-relaxed">{p.body}</p>
              </article>
            ))}
          </div>
        </Panel>

        {/* 3. QUICKSTART */}
        <Panel ariaLabel="One-tap quickstart">
          <header className="max-w-2xl">
            <SectionBadge label="Quickstart" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ fontSize: 36, letterSpacing: "-0.025em" }}
            >
              The same call, in your language.
            </h2>
            <p className="mt-3 t-body text-[#3C3C43]">
              List the systems in your workspace. Verify auth. Confirm the wire
              format. Sixty seconds end to end.
            </p>
          </header>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6">
            <ProtocolCodeTabs samples={QUICKSTART_SAMPLES} />
            <div className="flex flex-col">
              <div className="t-overline text-[#8E8E93] mb-2">Response</div>
              <ProtocolCodeBlock code={LIST_RESPONSE} language="http" />
              <p className="mt-3 t-caption text-[#8E8E93]">
                Every response carries <code className="t-mono">ok</code>,{" "}
                <code className="t-mono">data</code>, and{" "}
                <code className="t-mono">requestId</code>. Log the request id;
                we attach it to every audit row.
              </p>
            </div>
          </div>
        </Panel>

        {/* 4. AUTHENTICATION */}
        <Panel ariaLabel="Authentication">
          <header className="max-w-2xl">
            <SectionBadge label="Authentication" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ fontSize: 36, letterSpacing: "-0.025em" }}
            >
              Bearer tokens. Scoped. Hashed. Revocable.
            </h2>
          </header>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8">
            <div>
              <p className="t-body text-[#3C3C43] leading-relaxed">
                Tokens start with{" "}
                <code className="t-mono">ptk_</code>. Only the SHA-256 hash is
                stored; the plaintext shows once at mint time. Each token is
                workspace-bound and carries an explicit set of capabilities.
                Revocation is a single click and the next request fails closed.
              </p>
              <ul className="mt-5 flex flex-col gap-2.5 t-label text-[#3C3C43]">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8E8E93]" />
                  Scope set is fixed at mint time.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8E8E93]" />
                  Workspace-bound. The token cannot cross tenants.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8E8E93]" />
                  Writes accept an Idempotency-Key header.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8E8E93]" />
                  Every call writes one audit row.
                </li>
              </ul>
              <div className="mt-6">
                <ProtocolCodeBlock code={AUTH_SAMPLE} language="bash" />
              </div>
            </div>
            <div>
              <ProtocolAuthFlow />
            </div>
          </div>
        </Panel>

        {/* 5. CAPABILITY GRID */}
        <section className="px-4 sm:px-6" aria-label="MCP capabilities">
          <div className="mx-auto max-w-7xl">
            <div
              className="relative overflow-hidden surface-subtle border border-black/[0.05]"
              style={{ borderRadius: 40 }}
            >
              <div className="px-6 sm:px-12 py-16 sm:py-24">
                <header className="max-w-2xl">
                  <SectionBadge label="Capabilities" />
                  <h2
                    className="mt-4 t-h1 text-[#111]"
                    style={{ fontSize: 36, letterSpacing: "-0.025em" }}
                  >
                    Twelve capabilities. One token. No surprises.
                  </h2>
                  <p className="mt-3 t-body text-[#3C3C43]">
                    Capabilities are the unit of access. Pick the subset the
                    agent needs and mint a token. Every server call runs
                    through{" "}
                    <code className="t-mono">requireCapability(ctx, ...)</code>.
                  </p>
                </header>
                <div className="mt-10">
                  <ProtocolCapabilityGrid />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. STREAMING CONTRACT */}
        <Panel ariaLabel="Streaming contract">
          <header className="max-w-2xl">
            <SectionBadge label="Streaming" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ fontSize: 36, letterSpacing: "-0.025em" }}
            >
              Six events. Ordered. Idempotent.
            </h2>
            <p className="mt-3 t-body text-[#3C3C43]">
              The streaming contract is the same one the in-product agent uses.
              Same SSE framing, same payload schemas, same ordering invariants.
            </p>
          </header>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {STREAM_EVENTS.map((ev) => (
              <article
                key={ev.name}
                className="rounded-[16px] border border-black/[0.08] bg-[#FAFAFA] p-5 flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <code
                    className="inline-flex items-center bg-white border border-black/[0.06] px-2 py-0.5 rounded-md t-mono"
                    style={{ fontSize: 12, color: "#4F46E5" }}
                  >
                    event: {ev.name}
                  </code>
                </div>
                <div className="mt-3">
                  <h4 className="t-overline text-[#8E8E93]">When it fires</h4>
                  <p className="mt-1 t-label text-[#3C3C43] leading-relaxed">
                    {ev.when}
                  </p>
                </div>
                <div className="mt-3">
                  <h4 className="t-overline text-[#8E8E93]">Invariant</h4>
                  <p className="mt-1 t-label text-[#3C3C43] leading-relaxed">
                    {ev.invariant}
                  </p>
                </div>
                <div className="mt-3">
                  <h4 className="t-overline text-[#8E8E93]">Payload</h4>
                  <pre
                    className="mt-1.5 t-mono whitespace-pre rounded-[10px] bg-[#0F1115] text-[#E6E6E9] px-3 py-2.5 overflow-x-auto"
                    style={{ fontSize: 11.5, lineHeight: 1.55 }}
                  >
                    {ev.payload}
                  </pre>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        {/* 7. ERROR REFERENCE */}
        <Panel ariaLabel="Error reference">
          <header className="max-w-2xl">
            <SectionBadge label="Errors" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ fontSize: 36, letterSpacing: "-0.025em" }}
            >
              Every error code. Retryable column.
            </h2>
            <p className="mt-3 t-body text-[#3C3C43]">
              Click a row to see the exact wire payload. Codes that flip the
              retryable column to yes are safe to back off and try again.
            </p>
          </header>
          <div className="mt-8">
            <ProtocolErrorReference />
          </div>
        </Panel>

        {/* 8. RATE LIMITS */}
        <Panel ariaLabel="Rate limits and caps">
          <header className="max-w-2xl">
            <SectionBadge label="Limits" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ fontSize: 36, letterSpacing: "-0.025em" }}
            >
              Caps that exist to bound runaway loops.
            </h2>
          </header>
          <div className="mt-8 rounded-[16px] border border-black/[0.08] overflow-hidden">
            <div
              className="grid grid-cols-[1fr_2fr_1fr] gap-2 px-4 py-2.5 bg-[#FAFAFA] border-b border-black/[0.06]"
            >
              <span className="t-overline text-[#8E8E93]">Limit</span>
              <span className="t-overline text-[#8E8E93]">Why</span>
              <span className="t-overline text-[#8E8E93]">Scope</span>
            </div>
            {[
              {
                limit: "30 tool calls per turn",
                why: "A single turn cannot exceed thirty tool invocations. The 31st is refused with tool_call_limit_exceeded.",
                scope: "Per turn",
              },
              {
                limit: "60s wall clock per turn",
                why: "Time-to-done is bounded. Partial work stays on the canvas; the turn ends with timeout.",
                scope: "Per turn",
              },
              {
                limit: "16 KB request body",
                why: "MCP payloads stay small. Bulk imports use create_system_from_schema with referenced ids.",
                scope: "Per request",
              },
              {
                limit: "120 calls per minute",
                why: "Per-token rate limit. Exceeding it returns rate_limited which is safe to retry after backoff.",
                scope: "Per token",
              },
            ].map((r) => (
              <div
                key={r.limit}
                className="grid grid-cols-[1fr_2fr_1fr] gap-2 px-4 py-3 border-b border-black/[0.06] last:border-b-0 items-start"
              >
                <code
                  className="inline-flex items-center bg-[#F5F5F7] border border-black/[0.06] px-2 py-0.5 rounded-md t-mono w-fit"
                  style={{ fontSize: 11.5, color: "#111" }}
                >
                  {r.limit}
                </code>
                <span className="t-label text-[#3C3C43] leading-relaxed">{r.why}</span>
                <span className="t-label text-[#3C3C43]">{r.scope}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* 9. SANDBOXED EXECUTION */}
        <Panel ariaLabel="Sandboxed execution">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8">
            <header>
              <SectionBadge label="Sandbox" />
              <h2
                className="mt-4 t-h1 text-[#111]"
                style={{ fontSize: 36, letterSpacing: "-0.025em" }}
              >
                Every turn runs in a fresh container.
              </h2>
              <p className="mt-3 t-body text-[#3C3C43]">
                The runner executes inside a Modal sandbox. Container isolation.
                No shared state across turns. No outbound network besides the
                model endpoint and the Pipes service layer. The blast radius of
                a misbehaving turn is the turn.
              </p>
            </header>
            <ul className="flex flex-col gap-3">
              {[
                {
                  title: "Isolated by default",
                  body: "Each turn gets a clean filesystem and a new process. Memory does not survive the turn.",
                },
                {
                  title: "Bounded by contract",
                  body: "30 tool calls. 60 seconds. The runner enforces both server-side.",
                },
                {
                  title: "Audited by service",
                  body: "Every tool call writes one row. Rows are queryable from the workspace audit log.",
                },
              ].map((p) => (
                <li
                  key={p.title}
                  className="rounded-[14px] border border-black/[0.08] bg-[#FAFAFA] p-4"
                >
                  <div className="t-title text-[#111]" style={{ letterSpacing: "-0.01em" }}>
                    {p.title}
                  </div>
                  <p className="mt-1 t-label text-[#3C3C43]">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        {/* 10. FINAL CTA */}
        <section className="px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div
              className="relative overflow-hidden surface-inverse"
              style={{ borderRadius: 40 }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 brand-pattern-bg opacity-20 pointer-events-none"
              />
              <div className="relative px-6 sm:px-12 py-20 sm:py-28 text-center">
                <h2
                  className="text-white mx-auto max-w-3xl"
                  style={{
                    fontSize: "clamp(36px, 4.6vw, 56px)",
                    lineHeight: 1.05,
                    letterSpacing: "-0.035em",
                    fontWeight: 700,
                  }}
                >
                  Build something that reads your map.
                </h2>
                <p className="mt-5 t-body text-white/70 max-w-xl mx-auto">
                  Mint a token. Point any agent at the MCP endpoint. Watch it
                  read the same graph your team does.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/signup?source=protocol_cta"
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-5 h-11 t-label font-semibold text-[#111] hover:bg-violet-50 transition-colors"
                  >
                    Get started
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  <Link
                    href="/docs#protocol"
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/[0.04] px-5 h-11 t-label font-semibold text-white hover:bg-white/[0.08] transition-colors"
                  >
                    View docs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

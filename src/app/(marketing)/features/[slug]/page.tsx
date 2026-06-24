import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { TrackedLink } from "@/components/marketing/TrackedLink";

// ── Feature data ────────────────────────────────────────────────────────────

type Capability = {
  title: string;
  body: string;
};

type FeatureData = {
  slug: string;
  eyebrow: string;
  title: string;
  tagline: string;
  description: string;
  capabilities: Capability[];
  illustration: React.FC;
  ctaLabel: string;
  ctaHref: string;
  docsHref: string;
  docsLabel: string;
};

function IllustrationEditor() {
  return (
    <svg viewBox="0 0 480 320" className="w-full h-auto" role="img" aria-label="Canvas editor showing three connected nodes">
      <rect width="480" height="320" fill="#F8F7FC" rx="16" />
      <defs>
        <pattern id="feat-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.9" fill="rgba(0,0,0,0.07)" />
        </pattern>
      </defs>
      <rect width="480" height="320" fill="url(#feat-grid)" rx="16" />
      {/* Edges */}
      <path d="M 168 160 C 200 160 212 160 244 160" stroke="#4F46E5" strokeWidth="1.5" fill="none" strokeDasharray="none" />
      <path d="M 316 160 C 348 160 360 160 392 160" stroke="#4F46E5" strokeWidth="1.5" fill="none" />
      {/* Nodes */}
      {[
        { x: 48, label: "Planner", sub: "reads the request" },
        { x: 200, label: "Guard", sub: "checks the plan" },
        { x: 352, label: "Coder", sub: "opens the PR" },
      ].map((n) => (
        <g key={n.label}>
          <rect x={n.x} y={132} width="120" height="56" rx="12" fill="white" stroke="rgba(0,0,0,0.09)" strokeWidth="1" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.05))" />
          <circle cx={n.x + 14} cy={148} r="4" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="1" />
          <text x={n.x + 26} y={152} fontSize="11" fontWeight="700" fill="#111" fontFamily="system-ui">{n.label}</text>
          <text x={n.x + 14} y={174} fontSize="9" fill="#8E8E93" fontFamily="system-ui">{n.sub}</text>
        </g>
      ))}
      {/* Inspector panel hint */}
      <rect x="16" y="16" width="80" height="100" rx="8" fill="white" stroke="rgba(0,0,0,0.07)" strokeWidth="1" opacity="0.6" />
      <text x="24" y="34" fontSize="8" fontWeight="600" fill="#8E8E93" fontFamily="system-ui">INSPECTOR</text>
      <rect x="24" y="42" width="56" height="7" rx="3" fill="#EEF2FF" />
      <rect x="24" y="54" width="40" height="7" rx="3" fill="#F0F0F5" />
      <rect x="24" y="66" width="50" height="7" rx="3" fill="#F0F0F5" />
      <rect x="24" y="82" width="60" height="18" rx="6" fill="#4F46E5" />
      <text x="54" y="95" fontSize="8" fontWeight="600" fill="white" textAnchor="middle" fontFamily="system-ui">Save</text>
    </svg>
  );
}

function IllustrationSchema() {
  const nodeTypes = [
    { label: "LLM Agent", color: "#4F46E5" },
    { label: "Evaluator", color: "#D97706" },
    { label: "Tool Call", color: "#059669" },
    { label: "HumanReview", color: "#0EA5E9" },
    { label: "Checkpoint", color: "#7C3AED" },
    { label: "SubLoop", color: "#DB2777" },
  ];
  return (
    <svg viewBox="0 0 480 320" className="w-full h-auto" role="img" aria-label="Schema showing 27 node types">
      <rect width="480" height="320" fill="#F8F7FC" rx="16" />
      <text x="240" y="40" fontSize="13" fontWeight="700" fill="#111" textAnchor="middle" fontFamily="system-ui">27 node types</text>
      {nodeTypes.map((n, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 40 + col * 140;
        const y = 64 + row * 90;
        return (
          <g key={n.label}>
            <rect x={x} y={y} width="120" height="48" rx="10" fill="white" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
            <rect x={x} y={y} width="4" height="48" rx="2" fill={n.color} />
            <text x={x + 16} y={y + 20} fontSize="10" fontWeight="700" fill="#111" fontFamily="system-ui">{n.label}</text>
            <text x={x + 16} y={y + 34} fontSize="8" fill="#8E8E93" fontFamily="system-ui">node type</text>
          </g>
        );
      })}
      <text x="240" y="286" fontSize="10" fill="#8E8E93" textAnchor="middle" fontFamily="system-ui">+ 21 more node types</text>
    </svg>
  );
}

function IllustrationVersions() {
  return (
    <svg viewBox="0 0 480 320" className="w-full h-auto" role="img" aria-label="Version history timeline">
      <rect width="480" height="320" fill="#F8F7FC" rx="16" />
      <line x1="60" y1="60" x2="60" y2="270" stroke="#E5E5EA" strokeWidth="2" />
      {[
        { y: 80, label: "v3 · Production", sub: "promoted 2h ago", color: "#059669", active: true },
        { y: 148, label: "v2 · Staging", sub: "merged from PR #14", color: "#4F46E5", active: false },
        { y: 216, label: "v1 · Initial", sub: "created 3 days ago", color: "#8E8E93", active: false },
      ].map((v) => (
        <g key={v.label}>
          <circle cx="60" cy={v.y} r={v.active ? 9 : 6} fill={v.color} />
          {v.active && <circle cx="60" cy={v.y} r="14" fill="none" stroke={v.color} strokeWidth="1.5" strokeOpacity="0.3" />}
          <rect x="88" y={v.y - 28} width="260" height="56" rx="10" fill="white" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          <text x="104" y={v.y - 10} fontSize="11" fontWeight="700" fill="#111" fontFamily="system-ui">{v.label}</text>
          <text x="104" y={v.y + 8} fontSize="9" fill="#8E8E93" fontFamily="system-ui">{v.sub}</text>
          {v.active && (
            <rect x="292" y={v.y - 12} width="48" height="20" rx="6" fill="#ECFDF5">
              <title>live</title>
            </rect>
          )}
          {v.active && <text x="316" y={v.y + 2} fontSize="8" fontWeight="600" fill="#059669" textAnchor="middle" fontFamily="system-ui">live</text>}
        </g>
      ))}
    </svg>
  );
}

function IllustrationReview() {
  return (
    <svg viewBox="0 0 480 320" className="w-full h-auto" role="img" aria-label="Review comments on nodes">
      <rect width="480" height="320" fill="#F8F7FC" rx="16" />
      {/* Node */}
      <rect x="60" y="120" width="160" height="56" rx="12" fill="white" stroke="#4F46E5" strokeWidth="1.5" />
      <text x="140" y="148" fontSize="12" fontWeight="700" fill="#111" textAnchor="middle" fontFamily="system-ui">Evaluator</text>
      <text x="140" y="164" fontSize="9" fill="#8E8E93" textAnchor="middle" fontFamily="system-ui">checks the plan</text>
      {/* Comment thread */}
      <path d="M 220 152 L 260 100" stroke="#E5E5EA" strokeWidth="1" strokeDasharray="4 3" />
      <rect x="260" y="60" width="190" height="80" rx="10" fill="white" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
      <circle cx="276" cy="84" r="10" fill="#EEF2FF" />
      <text x="276" y="88" fontSize="9" fontWeight="700" fill="#4F46E5" textAnchor="middle" fontFamily="system-ui">AK</text>
      <text x="294" y="82" fontSize="10" fontWeight="600" fill="#111" fontFamily="system-ui">Alex Kim</text>
      <text x="294" y="96" fontSize="9" fill="#3C3C43" fontFamily="system-ui">Should this gate on</text>
      <text x="294" y="108" fontSize="9" fill="#3C3C43" fontFamily="system-ui">confidence score?</text>
      <text x="276" y="128" fontSize="8" fill="#8E8E93" fontFamily="system-ui">2 replies · Resolve</text>
      {/* Second comment */}
      <path d="M 140 176 L 140 220" stroke="#E5E5EA" strokeWidth="1" strokeDasharray="4 3" />
      <rect x="60" y="220" width="190" height="58" rx="10" fill="white" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
      <circle cx="76" cy="240" r="10" fill="#FEF3C7" />
      <text x="76" y="244" fontSize="9" fontWeight="700" fill="#D97706" textAnchor="middle" fontFamily="system-ui">MP</text>
      <text x="94" y="238" fontSize="10" fontWeight="600" fill="#111" fontFamily="system-ui">Mo Payne</text>
      <text x="94" y="252" fontSize="9" fill="#3C3C43" fontFamily="system-ui">LGTM, promoting v2</text>
      <rect x="70" y="264" width="48" height="6" rx="3" fill="#4F46E5" opacity="0.3" />
    </svg>
  );
}

function IllustrationTokens() {
  return (
    <svg viewBox="0 0 480 320" className="w-full h-auto" role="img" aria-label="Agent token connecting Looper to Claude, LangGraph, and AutoGen">
      <rect width="480" height="320" fill="#F8F7FC" rx="16" />
      {/* Looper center */}
      <rect x="180" y="124" width="120" height="56" rx="12" fill="#4F46E5" />
      <text x="240" y="148" fontSize="12" fontWeight="800" fill="white" textAnchor="middle" fontFamily="system-ui">Looper</text>
      <text x="240" y="164" fontSize="9" fill="rgba(255,255,255,0.7)" textAnchor="middle" fontFamily="system-ui">MCP endpoint</text>
      {/* Token key visual */}
      <rect x="196" y="88" width="88" height="28" rx="8" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="1" />
      <text x="240" y="107" fontSize="8" fontWeight="600" fill="#4F46E5" textAnchor="middle" fontFamily="system-ui">ptk_••••••••••••</text>
      {/* Agents */}
      {[
        { x: 32, y: 72, label: "Claude", color: "#D97706" },
        { x: 32, y: 172, label: "LangGraph", color: "#059669" },
        { x: 32, y: 236, label: "AutoGen", color: "#7C3AED" },
        { x: 360, y: 172, label: "CrewAI", color: "#DB2777" },
      ].map((a) => (
        <g key={a.label}>
          <path
            d={a.x < 180
              ? `M ${a.x + 88} ${a.y + 20} L 180 ${152}`
              : `M 300 ${152} L ${a.x} ${a.y + 20}`}
            stroke={a.color}
            strokeWidth="1.25"
            fill="none"
            strokeDasharray="5 3"
            opacity="0.5"
          />
          <rect x={a.x} y={a.y} width="88" height="40" rx="8" fill="white" stroke="rgba(0,0,0,0.09)" strokeWidth="1" />
          <rect x={a.x} y={a.y} width="4" height="40" rx="2" fill={a.color} />
          <text x={a.x + 14} y={a.y + 24} fontSize="10" fontWeight="700" fill="#111" fontFamily="system-ui">{a.label}</text>
        </g>
      ))}
    </svg>
  );
}

function IllustrationImportExport() {
  return (
    <svg viewBox="0 0 480 320" className="w-full h-auto" role="img" aria-label="Import and export loop data between formats">
      <rect width="480" height="320" fill="#F8F7FC" rx="16" />
      {/* Looper center */}
      <rect x="184" y="128" width="112" height="52" rx="12" fill="#4F46E5" />
      <text x="240" y="150" fontSize="11" fontWeight="800" fill="white" textAnchor="middle" fontFamily="system-ui">Looper</text>
      <text x="240" y="166" fontSize="8" fill="rgba(255,255,255,0.7)" textAnchor="middle" fontFamily="system-ui">looper_schema_v1</text>
      {/* Format pills */}
      {[
        { x: 28, y: 60, label: "JSON", sub: "portable", dir: "out" },
        { x: 28, y: 148, label: "GitHub", sub: "PR nodes", dir: "out" },
        { x: 28, y: 236, label: "ZIP", sub: "archive", dir: "out" },
        { x: 360, y: 60, label: "Markdown", sub: "docs", dir: "in" },
        { x: 360, y: 148, label: "CSV", sub: "bulk edit", dir: "in" },
        { x: 360, y: 236, label: "Mermaid", sub: "diagram", dir: "in" },
      ].map((f) => (
        <g key={f.label + f.x}>
          <path
            d={f.dir === "out"
              ? `M ${f.x + 92} ${f.y + 20} C ${180} ${f.y + 20} ${180} 154 ${184} 154`
              : `M 296 154 C ${f.x - 20} 154 ${f.x + 20} ${f.y + 20} ${f.x} ${f.y + 20}`}
            stroke="#4F46E5"
            strokeWidth="1.25"
            fill="none"
            opacity={f.dir === "out" ? 0.35 : 0.55}
            strokeDasharray={f.dir === "in" ? "none" : "5 3"}
          />
          {f.dir === "in" && (
            <polygon
              points={`${f.x - 5},${f.y + 16} ${f.x + 5},${f.y + 16} ${f.x},${f.y + 26}`}
              fill="#4F46E5"
              opacity="0.5"
            />
          )}
          <rect x={f.x} y={f.y} width="92" height="40" rx="8" fill="white" stroke="rgba(0,0,0,0.09)" strokeWidth="1" />
          <text x={f.x + 10} y={f.y + 20} fontSize="10" fontWeight="700" fill="#111" fontFamily="system-ui">{f.label}</text>
          <text x={f.x + 10} y={f.y + 32} fontSize="8" fill="#8E8E93" fontFamily="system-ui">{f.sub}</text>
        </g>
      ))}
    </svg>
  );
}

const FEATURES: Record<string, FeatureData> = {
  editor: {
    slug: "editor",
    eyebrow: "Canvas editor",
    title: "Draw agent loops by typing one sentence.",
    tagline: "The canvas is your authoring surface. Type a sentence and your agent draws the first pass. Drag to correct. The loop your team reviews is the loop your agents read.",
    description: "The Looper editor is a visual canvas built for the way agent systems actually get designed: fast iteration, collaborative review, and a single source of truth that both humans and agents can read.",
    capabilities: [
      {
        title: "Type to build",
        body: "Describe the loop in one sentence. The agent draws nodes, connects them, and labels each step. You correct it by typing again or dragging directly.",
      },
      {
        title: "Inspect any node",
        body: "Click any node to open the inspector. Edit the type, description, and config without leaving the canvas. Changes are visible to collaborators and agents immediately.",
      },
      {
        title: "Undo, redo, snap",
        body: "Full undo/redo stack. Snap-to-grid keeps layouts readable. Multi-select to move or delete a region. Keyboard shortcuts for everything.",
      },
      {
        title: "Real-time agent collaboration",
        body: "While you edit, your agent can read the same graph via MCP. It proposes additions. You approve or reject them. The canvas is the single source of truth for both.",
      },
    ],
    illustration: IllustrationEditor,
    ctaLabel: "Try the editor",
    ctaHref: "/play",
    docsHref: "/docs/editor",
    docsLabel: "Read the docs",
  },
  schema: {
    slug: "schema",
    eyebrow: "Schema",
    title: "27 typed node kinds. One contract every agent reads.",
    tagline: "Every node in Looper has a type. LLM agents, evaluators, tool calls, human review gates, checkpoints — all defined in a single versioned schema that your team and your agents share.",
    description: "The Looper schema is the contract between your system design and every agent that runs it. When a node says it is an Evaluator, every agent knows exactly what that means.",
    capabilities: [
      {
        title: "One schema for build and run",
        body: "The same schema your team edits on the canvas is the schema your agents receive over MCP. No translation layer. No drift between the diagram and the runtime.",
      },
      {
        title: "27 node types",
        body: "LLM Agent, Evaluator, LoopControl, HumanReview, Checkpoint, SubLoop, Tool Call, and 20 more. Each type carries a typed config schema — no free-form fields to misread.",
      },
      {
        title: "Versioned and migratable",
        body: "The schema is versioned as looper_schema_v1. Migrations run automatically when you open a system on a newer schema version. Old loops never break.",
      },
      {
        title: "Zod-validated",
        body: "Every node config is validated with Zod before it is saved. The editor shows inline errors. Your agents receive only valid graphs.",
      },
    ],
    illustration: IllustrationSchema,
    ctaLabel: "Explore the schema",
    ctaHref: "/play",
    docsHref: "/docs/schema",
    docsLabel: "Schema reference",
  },
  versions: {
    slug: "versions",
    eyebrow: "Versions",
    title: "Promote a version. Roll it back in one click.",
    tagline: "Every saved checkpoint becomes a version. Promote the right one to production, roll back to any earlier state, and let your agents always read the version you intended.",
    description: "Looper tracks every meaningful state of your system as a named version. Promoting to production is a deliberate act. Rolling back is instantaneous.",
    capabilities: [
      {
        title: "Every checkpoint is a version",
        body: "Hit save and Looper records the full graph state as a named checkpoint. Build a history of named versions as your system evolves — no separate CI step required.",
      },
      {
        title: "Promote to production",
        body: "When a version is ready, promote it. Your agents automatically read the promoted version over MCP. No redeploy, no config change — the token stays the same.",
      },
      {
        title: "Instant rollback",
        body: "If a promoted version causes problems, roll back to any earlier checkpoint in one click. The previous version is live within seconds.",
      },
      {
        title: "Diff between versions",
        body: "Select any two versions to see a side-by-side diff of nodes and edges. Understand exactly what changed before you promote.",
      },
    ],
    illustration: IllustrationVersions,
    ctaLabel: "Start building",
    ctaHref: "/signup",
    docsHref: "/docs/versions",
    docsLabel: "Versions docs",
  },
  review: {
    slug: "review",
    eyebrow: "Review",
    title: "Comment on any node. Approve changes like a PR.",
    tagline: "Threaded comments live on nodes, not in a sidebar chat. Your team reviews the system the same way developers review code — with context, resolution, and a clear audit trail.",
    description: "Looper brings pull-request-style review to system design. Every comment is anchored to a node. Threads resolve when the issue is fixed. Nothing gets lost in Slack.",
    capabilities: [
      {
        title: "Node-anchored threads",
        body: "Click any node and open a comment thread. Comments are stored on the node, not in a chat stream. When you change the node, the thread stays with it.",
      },
      {
        title: "Resolve and reopen",
        body: "Mark threads resolved when the issue is fixed. Reopen if a later change re-introduces the problem. The history is always there.",
      },
      {
        title: "Approve before promoting",
        body: "Set a review policy that requires approvals before a version can be promoted. The editor enforces it. No bypassing by accident.",
      },
      {
        title: "Referenced by PR",
        body: "Nodes have stable IDs. Reference them from pull request descriptions, Linear issues, or Notion docs. Reviewers click through to the exact node in context.",
      },
    ],
    illustration: IllustrationReview,
    ctaLabel: "Start a review",
    ctaHref: "/signup",
    docsHref: "/docs/review",
    docsLabel: "Review docs",
  },
  tokens: {
    slug: "tokens",
    eyebrow: "Tokens",
    title: "Hand any agent a key. It reads the loop.",
    tagline: "Create a Bearer token, set its capability scopes, and paste it into Claude, LangGraph, AutoGen, or any MCP-compatible agent. The agent reads the same loop your team sees.",
    description: "Looper tokens are the bridge between your system design and every agent that runs it. One token. Scoped capabilities. Works with any agent that speaks MCP.",
    capabilities: [
      {
        title: "Scoped capabilities",
        body: "Each token carries only the capabilities you grant — graph:write, systems:read, schema:read, versions:write, and more. Principle of least privilege, built in.",
      },
      {
        title: "Works with any MCP client",
        body: "Claude, LangGraph, AutoGen, CrewAI, or your own agent. If it speaks MCP, it reads Looper. Paste the Bearer token and point it at the endpoint.",
      },
      {
        title: "Rotate without changing the agent",
        body: "Rotate a token from the dashboard. The new token has the same scopes. Update one env var in your agent and nothing else changes.",
      },
      {
        title: "Per-system tokens",
        body: "Create separate tokens for separate systems. An agent for system A cannot read system B unless you explicitly grant access. Isolation by default.",
      },
    ],
    illustration: IllustrationTokens,
    ctaLabel: "Create a token",
    ctaHref: "/signup",
    docsHref: "/docs/tokens",
    docsLabel: "Token docs",
  },
  "import-export": {
    slug: "import-export",
    eyebrow: "Import and export",
    title: "Your graph, readable anywhere.",
    tagline: "Export the full graph as looper_schema_v1 JSON. Import from existing diagramming tools. The loop you build in Looper is never locked in — it is a portable, versioned artifact.",
    description: "A system design is only valuable if it can travel. Looper exports as a portable JSON schema that any tool, agent, or human can read and work with.",
    capabilities: [
      {
        title: "Export as looper_schema_v1 JSON",
        body: "The full graph — nodes, edges, configs, metadata — exports as a single JSON file. Open it in any editor, store it in git, or send it to another team.",
      },
      {
        title: "Import from JSON",
        body: "Paste or upload a looper_schema_v1 JSON file and the editor draws the graph instantly. No manual rebuilding. Migration runs automatically if the version is older.",
      },
      {
        title: "Download as ZIP",
        body: "Export a full archive including the schema, metadata, and a human-readable Markdown summary. Useful for archiving or handing off to a new team.",
      },
      {
        title: "Read via MCP",
        body: "Any agent with a valid token can read the full graph live via the Loop API. Export is for offline use. The API is for real-time agent access.",
      },
    ],
    illustration: IllustrationImportExport,
    ctaLabel: "Start building",
    ctaHref: "/signup",
    docsHref: "/docs/import-export",
    docsLabel: "Import and export docs",
  },
};

export function generateStaticParams() {
  return Object.keys(FEATURES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = FEATURES[slug];
  if (!feature) return {};
  return {
    title: `${feature.title} — Looper`,
    description: feature.tagline,
  };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = FEATURES[slug];
  if (!feature) notFound();

  const Illustration = feature.illustration;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-black/[0.06] bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,70,229,0.06) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-700">
            {feature.eyebrow}
          </span>
          <h1
            className="mt-5 text-[#0A0A0F]"
            style={{
              fontSize: "clamp(32px, 5vw, 52px)",
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
              fontWeight: 800,
              maxWidth: "20ch",
            }}
          >
            {feature.title}
          </h1>
          <p
            className="mt-5 text-[#3C3C43]"
            style={{ fontSize: 18, lineHeight: 1.6, maxWidth: "56ch" }}
          >
            {feature.tagline}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <TrackedLink
              href={feature.ctaHref}
              event="feature_page_cta_clicked"
              metadata={{ feature: feature.slug, location: "hero" }}
            >
              <span className="inline-flex h-11 items-center gap-1.5 rounded-full bg-violet-600 px-6 text-[13px] font-semibold text-white transition-all hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-500/25">
                {feature.ctaLabel}
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </TrackedLink>
            <Link
              href={feature.docsHref}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-black/10 px-5 text-[13px] font-semibold text-[#111] transition-colors hover:border-black/25"
            >
              {feature.docsLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Illustration ── */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="overflow-hidden rounded-3xl border border-black/[0.06] shadow-sm">
          <Illustration />
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2
          className="mb-10 text-[#0A0A0F]"
          style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em" }}
        >
          What it does
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {feature.capabilities.map((cap) => (
            <div
              key={cap.title}
              className="flex gap-4 rounded-2xl border border-black/[0.06] bg-white p-6 hover:border-black/[0.12] transition-colors"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50">
                <Check size={12} strokeWidth={3} className="text-violet-600" />
              </span>
              <div>
                <p className="text-[14px] font-700 font-semibold text-[#111] leading-snug">
                  {cap.title}
                </p>
                <p className="mt-1.5 text-[13px] text-[#3C3C43] leading-relaxed">
                  {cap.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section className="border-t border-black/[0.06] bg-[#F5F3FF]">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2
            className="text-[#0A0A0F]"
            style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em" }}
          >
            Ready to try it?
          </h2>
          <p className="mt-3 text-[15px] text-[#3C3C43]">
            {feature.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TrackedLink
              href={feature.ctaHref}
              event="feature_page_cta_clicked"
              metadata={{ feature: feature.slug, location: "footer" }}
            >
              <span className="inline-flex h-11 items-center gap-1.5 rounded-full bg-violet-600 px-6 text-[13px] font-semibold text-white transition-all hover:bg-violet-700">
                {feature.ctaLabel}
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </TrackedLink>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center text-[13px] font-semibold text-[#3C3C43] hover:text-[#111]"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

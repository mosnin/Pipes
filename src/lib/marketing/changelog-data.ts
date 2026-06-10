/**
 * Changelog entries: 16 entries spanning the last ~9 months on a realistic
 * cadence. Dates are inclusive through the current month (June 2026) and
 * step back to October 2025.
 *
 * Voice rules: one idea per sentence, verbs over nouns, ASCII only.
 * See docs/audience.md for the full word list to avoid.
 */

export type ChangeKind = "shipped" | "improved" | "fixed";

export interface ChangelogChange {
  kind: ChangeKind;
  text: string;
}

export interface ChangelogEntry {
  /** Semantic-ish version label (e.g. "v2.4.0"). */
  version: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** Entry title. */
  title: string;
  /** Short summary. One sentence. */
  summary: string;
  /** Categorized change list. */
  changes: ReadonlyArray<ChangelogChange>;
  /** URL-safe anchor id. */
  anchor: string;
}

export const changelogEntries: ReadonlyArray<ChangelogEntry> = [
  {
    version: "v2.7.0",
    date: "2026-06-04",
    anchor: "v2-7-0",
    title: "Subsystem blueprints in conversation",
    summary:
      "Hand the agent a blueprint id. It expands the subsystem into your map and keeps the contract typed.",
    changes: [
      { kind: "shipped", text: "Blueprint expansion via plan_memory entries with the subsystem_blueprint tag." },
      { kind: "shipped", text: "Inspector renders blueprint metadata when a node was instantiated from one." },
      { kind: "improved", text: "Builder retries blueprint lookups once before falling back to a freeform draft." },
      { kind: "fixed", text: "Blueprint titles longer than 64 characters no longer truncate in the instantiate path." },
    ],
  },
  {
    version: "v2.6.2",
    date: "2026-05-21",
    anchor: "v2-6-2",
    title: "Editor undo across agent turns",
    summary:
      "Cmd-Z now reverses the whole agent turn as a single step. Redo replays it.",
    changes: [
      { kind: "shipped", text: "Single-step undo that bundles every node and pipe written during a turn." },
      { kind: "improved", text: "History stack records the prompt that produced each turn for traceability." },
      { kind: "fixed", text: "Optimistic queue no longer double-applies an undone turn on slow reconnects." },
    ],
  },
  {
    version: "v2.6.0",
    date: "2026-05-08",
    anchor: "v2-6-0",
    title: "Per-workspace agent tokens",
    summary:
      "Mint a ptk_ token per workspace. The MCP endpoint resolves the workspace from the bearer and refuses cross-tenant calls.",
    changes: [
      { kind: "shipped", text: "Token mint and revoke flow in /dashboard/settings/tokens with SHA-256 storage." },
      { kind: "shipped", text: "Capability scopes: systems:read, systems:write, graph:write, schema:read, templates:instantiate." },
      { kind: "improved", text: "Token list shows last-used timestamp and most recent capability invoked." },
      { kind: "fixed", text: "Revoking a token now invalidates in-flight SSE streams within 250 ms." },
    ],
  },
  {
    version: "v2.5.1",
    date: "2026-04-23",
    anchor: "v2-5-1",
    title: "MCP errors with stack-free postmortems",
    summary:
      "Every MCP error returns a short cause string instead of a stack frame. Builder retries map errors to next actions.",
    changes: [
      { kind: "shipped", text: "Structured error codes: token.invalid, capability.denied, workspace.mismatch, schema.invalid." },
      { kind: "improved", text: "Builder eval suite now asserts that a capability.denied does not crash the turn." },
      { kind: "fixed", text: "Trailing slash on /api/protocol/mcp no longer returns 308 to legacy SDKs." },
    ],
  },
  {
    version: "v2.5.0",
    date: "2026-04-09",
    anchor: "v2-5-0",
    title: "Schema migration v1 lock",
    summary:
      "pipes_schema_v1 is the canonical export. Older bundles are auto-migrated on import.",
    changes: [
      { kind: "shipped", text: "27 node types frozen under nodeTypeValues with a migration map for legacy bundles." },
      { kind: "shipped", text: "Validation runs server-side on every import; rejects unknown types with a per-line error." },
      { kind: "improved", text: "Export route streams the bundle so 5k-node systems no longer block the editor." },
      { kind: "fixed", text: "Pipe direction inferred wrong for self-loops on review nodes." },
    ],
  },
  {
    version: "v2.4.0",
    date: "2026-03-19",
    anchor: "v2-4-0",
    title: "Tool call cap and wall-clock cap",
    summary:
      "Builder is hard-capped at 30 tool calls and 60 seconds per turn. Caps are enforced server-side.",
    changes: [
      { kind: "shipped", text: "TOOL_CALL_CAP and WALL_CLOCK_CAP_MS enforced in /api/agent/build." },
      { kind: "shipped", text: "Eval gate that fails CI if the cap is exceeded on the regression set." },
      { kind: "improved", text: "Turn telemetry now records tool call count alongside p50/p95." },
      { kind: "fixed", text: "Streaming SSE no longer hangs when the cap fires mid-turn; emits a clean done event." },
    ],
  },
  {
    version: "v2.3.2",
    date: "2026-03-04",
    anchor: "v2-3-2",
    title: "Audit log forwarding",
    summary:
      "Auth and budget rejections forward to your SIEM through the SIEM_WEBHOOK_URL env.",
    changes: [
      { kind: "shipped", text: "forwardAuditEvent honors per-workspace SIEM webhook overrides." },
      { kind: "improved", text: "Event payloads now include workspaceId, userId, action, and the request id." },
      { kind: "fixed", text: "Audit writes no longer block the request path; queue drains in the background." },
    ],
  },
  {
    version: "v2.3.0",
    date: "2026-02-12",
    anchor: "v2-3-0",
    title: "Subsystem reviewer agent",
    summary:
      "A reviewer agent checks every committed turn against the schema and flags missing typed contracts inline.",
    changes: [
      { kind: "shipped", text: "Reviewer pass runs after every successful build turn with its own budget." },
      { kind: "shipped", text: "Inspector surfaces reviewer findings with a one-click accept-or-dismiss." },
      { kind: "improved", text: "Reviewer prompt updated to cite the schema field that fired the warning." },
      { kind: "fixed", text: "Reviewer no longer warns on intentional self-loops in supervisor nodes." },
    ],
  },
  {
    version: "v2.2.0",
    date: "2026-01-28",
    anchor: "v2-2-0",
    title: "Workspace isolation smoke test",
    summary:
      "Tenant boundary is now covered end-to-end. Cross-workspace reads return 403 from both API and MCP paths.",
    changes: [
      { kind: "shipped", text: "Two-user smoke test exercises /api/systems, /api/agent/build, and direct Convex mutations." },
      { kind: "shipped", text: "Lint rule that flags collect() without a by_workspace index on Convex queries." },
      { kind: "improved", text: "AccessService.ensureCanEdit logs the denied workspace pair for triage." },
      { kind: "fixed", text: "Editor no longer briefly renders the previous workspace bundle during workspace switch." },
    ],
  },
  {
    version: "v2.1.1",
    date: "2026-01-14",
    anchor: "v2-1-1",
    title: "Modal executor health",
    summary:
      "Modal endpoint health probe runs every 30 seconds. Banner of last resort flips on three consecutive failures.",
    changes: [
      { kind: "shipped", text: "Probe writes results to metrics_samples; visible at /admin/metrics." },
      { kind: "improved", text: "Banner of last resort now shows the last known healthy timestamp." },
      { kind: "fixed", text: "Health probe no longer false-positives on a cold Modal container." },
    ],
  },
  {
    version: "v2.1.0",
    date: "2025-12-18",
    anchor: "v2-1-0",
    title: "Idempotency keys on write paths",
    summary:
      "Every write-bearing route accepts an idempotency-key header. Duplicates return the prior response.",
    changes: [
      { kind: "shipped", text: "idempotency_keys Convex table with a 24-hour TTL and a key-per-workspace index." },
      { kind: "shipped", text: "Headers respected on /api/agent/build, /api/graph, /api/import, /api/templates." },
      { kind: "improved", text: "SDKs in /docs publish the header automatically on retry." },
      { kind: "fixed", text: "Replays no longer write a second audit_event for the same operation." },
    ],
  },
  {
    version: "v2.0.0",
    date: "2025-12-02",
    anchor: "v2-0-0",
    title: "MCP endpoint at /api/protocol/mcp",
    summary:
      "Single MCP endpoint dispatches all tools. Bearer tokens are SHA-256 hashed and scoped to a workspace.",
    changes: [
      { kind: "shipped", text: "Eleven capabilities: systems read, systems write, schema read, templates read, templates instantiate, versions read, versions write, graph write, comments write, import write, validation read." },
      { kind: "shipped", text: "Connect-Claude flow that exchanges a one-time code for a workspace-scoped token." },
      { kind: "improved", text: "Token list now shows the capability set granted at mint time." },
      { kind: "fixed", text: "OAuth callback no longer 500s when the deeplink omits the state parameter." },
    ],
  },
  {
    version: "v1.9.3",
    date: "2025-11-19",
    anchor: "v1-9-3",
    title: "Inspector typed config schema",
    summary:
      "Per-node-type field definitions render as typed form fields. No more freeform JSON in the inspector.",
    changes: [
      { kind: "shipped", text: "ConfigFieldDef[] for every node type in nodeTypeValues; 27 schemas total." },
      { kind: "improved", text: "Inspector validates on blur and writes through the optimistic queue." },
      { kind: "fixed", text: "Number fields with decimal step no longer round to integer on save." },
    ],
  },
  {
    version: "v1.9.0",
    date: "2025-11-05",
    anchor: "v1-9-0",
    title: "Mock mode for offline dev",
    summary:
      "Set PIPES_USE_MOCKS to true. Every repository is in-memory. No Convex, no Clerk, no external APIs.",
    changes: [
      { kind: "shipped", text: "Mock implementation of every contract in src/lib/repositories/contracts.ts." },
      { kind: "shipped", text: "Unit tests now run against the mock by default and complete in under 8 seconds." },
      { kind: "improved", text: "Editor falls back to a 1.5 s poll on /api/graph when mocks are active." },
    ],
  },
  {
    version: "v1.8.1",
    date: "2025-10-21",
    anchor: "v1-8-1",
    title: "Editor optimistic queue",
    summary:
      "Local edits apply immediately and flush to /api/graph in the background. Brief network blips are invisible.",
    changes: [
      { kind: "shipped", text: "localApply then flush; failed flushes roll back the local state." },
      { kind: "improved", text: "Toast surfaces the saving indicator only when the queue is non-empty for over 800 ms." },
      { kind: "fixed", text: "Queue no longer reorders writes when the user rapidly drags a node." },
    ],
  },
  {
    version: "v1.8.0",
    date: "2025-10-02",
    anchor: "v1-8-0",
    title: "Starter templates v1",
    summary:
      "Three starters land: multi-agent-research, automation-workflow, support-ops-system. Each is one click to a working map.",
    changes: [
      { kind: "shipped", text: "Starter catalog in src/domain/templates/catalog with typed nodes and pipes." },
      { kind: "shipped", text: "Per-starter detail page at /templates/[id]." },
      { kind: "improved", text: "Starter instantiation now lands at /editor with the prompt prefilled." },
    ],
  },
];

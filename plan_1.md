# Looper — Transformation Plan v1

> Pipes → Looper: The Canva/Miro of building agent loops.
> A visual canvas where humans and agents co-author loops together, plus a marketplace for sharing and selling preset loops.

---

## Market Context (June 2026)

**Why now is the moment:**
- Agentic AI market: $7.84B in 2025 → $52.62B by 2030 (46.3% CAGR)
- 40% of enterprise apps will embed task-specific AI agents by end of 2026 (Gartner)
- Only 11% of enterprises run AI agents in production despite 79% claiming adoption — the gap is tooling, not intent
- "Loop engineering" is emerging as a formal discipline, distinct from prompt engineering
- LangGraph has 34.5M monthly downloads but zero visual layer; Langflow/Flowise/n8n exist but are workflow-automation-first, not agent-loop-first
- No visual tool has MCP-native bidirectional sync or human↔agent co-authoring
- Global enterprise AI agent spend projected at $1.4T for 2027

**The unaddressed gap:** Developers build loops in code with no visual layer, no shared format, and no observability. Visual tools that exist are workflow-first, not loop-first — they handle "if webhook → call API → send email," not "plan → act → observe → repeat with memory."

**Looper's bet:** Be the Figma of agent loops — the shared canvas that becomes the format, the system of record, and the marketplace for loop patterns.

---

## Product Identity

**Tagline:** *Build loops. Ship agents.*

**One-liner:** Looper is the visual canvas for designing, sharing, and co-authoring AI agent loops — where you and your agent build together.

**The magic moment:**
1. User opens Looper
2. Types: "A researcher agent finds sources, passes them to a writer agent, who drafts, then sends back for critique and iterates"
3. Presses enter → loop appears on canvas in 2 seconds: nodes, connections, conditions, iteration control
4. User drags the "critique" node to reposition → AI sees the edit and adapts the loop
5. User clicks "Export MCP" → pastes token into Claude
6. Claude: "What's my loop?" → sees the full loop definition live
7. **The line:** "It already knows its loop."

---

## Phase Overview

| Phase | Name | Duration | Outcome |
|---|---|---|---|
| 0 | Research & Planning | Done | plan_1.md + audit_1.md |
| 1 | Core Rebrand | 1-2 days | Every "Pipes" → "Looper" across entire codebase |
| 2 | Domain Model Evolution | 2-3 days | System→Loop, node types loop-first, schema renamed |
| 3 | Marketing Site Overhaul | 2-3 days | New positioning, copy, hero, pricing, use cases |
| 4 | Canvas UX — Loop Language | 2-3 days | Visual metaphor is loops, not pipes |
| 5 | Co-authoring Layer | 3-4 days | Human edits trigger agent response; true bidirectional |
| 6 | Marketplace Foundation | 3-4 days | Public loop listings, creator profiles, sharing |
| 7 | Revenue & Access Control | 2-3 days | Freemium, private loops, teams, creator payouts |
| 8 | CLI & SDK Rebrand + Docs | 1-2 days | `looper` CLI, updated docs, install guide |
| 9 | Validation & Launch Prep | 2-3 days | Typecheck, lint, build, E2E, PR to main |

---

## Phase 1: Core Rebrand

**Goal:** Eliminate every "Pipes" reference and replace with "Looper" brand. No functionality changes — mechanical rename only.

### 1.1 Package Metadata
- `package.json`: `"name": "pipes"` → `"name": "looper"`
- `packages/cli/package.json`: `"@pipes/cli"` → `"@looper/cli"`
- `packages/cli/package.json`: binary `"pipes"` → `"looper"`
- `packages/cli/package.json`: bundle output names `pipes-*` → `looper-*`

### 1.2 CLI Binary & Command
- `packages/cli/src/index.ts`: `new Command("pipes")` → `new Command("looper")`
- All help text and description strings: "Pipes" → "Looper"
- Shell completion functions: `_pipes_completion` → `_looper_completion`, `compdef _pipes` → `compdef _looper`

### 1.3 Domain & URL Strings
- `packages/cli/src/config.ts`: `https://app.pipes.sh` → `https://app.looper.dev`
- `packages/cli/src/commands/init.ts`: same URL change
- `src/lib/seo/canonical.ts`: `https://pipes.dev` → `https://looper.dev`
- All marketing pages: `app.pipes.dev` → `app.looper.dev` in code samples

### 1.4 SEO & Metadata
- `src/app/layout.tsx`: title `"Pipes"` → `"Looper"`
- All 20+ marketing pages: `"- Pipes"` suffix → `"- Looper"`
- `src/lib/seo/jsonld.ts`: Organization/SoftwareApplication name `"Pipes"` → `"Looper"`

### 1.5 Visual Brand
- `src/components/Wordmark.tsx`: render "Looper" instead of "Pipes"

### 1.6 Environment Variables
- `PIPES_USE_MOCKS` → `LOOPER_USE_MOCKS` (all occurrences)
- `NEXT_PUBLIC_PIPES_USE_MOCKS` → `NEXT_PUBLIC_LOOPER_USE_MOCKS`
- `PIPES_API` → `LOOPER_API`
- `PIPES_TOKEN` → `LOOPER_TOKEN`
- `PIPES_MEMORY_SYSTEM` → `LOOPER_MEMORY_SYSTEM`
- `PIPES_AUDIT_LOG` → `LOOPER_AUDIT_LOG`
- `PIPES_TOKEN_BUDGET` → `LOOPER_TOKEN_BUDGET`
- `PIPES_AGENT_ENDPOINT_URL` → `LOOPER_AGENT_ENDPOINT_URL`
- `PIPES_ADMIN_ALLOWLIST` → `LOOPER_ADMIN_ALLOWLIST`
- `NEXT_PUBLIC_PIPES_ADMIN_NAV` → `NEXT_PUBLIC_LOOPER_ADMIN_NAV`

### 1.7 Config Files & Storage
- `.pipes.yml` → `.looper.yml` (config file name + all references)
- `~/.pipes/` → `~/.looper/` (local storage directory)
- `pipes-onboarding-state` → `looper-onboarding-state`
- `pipes-sound-on` → `looper-sound-on`
- `pipes-theme` → `looper-theme`

### 1.8 Type & Class Names
- `PipesClient` → `LooperClient`
- `PipesConfig` → `LooperConfig`
- `PipesSchemaV1` → `LooperSchemaV1`
- `PipesSchemaDocument` → `LooperSchemaDocument`
- `parsePipesSchema` → `parseLooperSchema`
- `serializePipesSchema` → `serializeLooperSchema`
- `pipesService` → `looperService`
- `pipes_schema_v1` → `looper_schema_v1` (canonical format string)
- `PIPES_SCHEMA_VERSION` → `LOOPER_SCHEMA_VERSION`

### 1.9 Schema Directory
- `src/domain/pipes_schema_v1/` → `src/domain/looper_schema_v1/`

### 1.10 Docs & README
- `README.md`: all "Pipes" → "Looper"
- `CLAUDE.md`: schema references updated
- `docs/*.md`: all brand references
- `packages/cli/INSTALL.md`: all references

### 1.11 Email Addresses (Copy Only)
- `security@pipes.dev` → `security@looper.dev`
- `trust@pipes.dev` → `trust@looper.dev`
- `status@pipes.dev` → `status@looper.dev`

### 1.12 Public Fixtures
- `public/sample_system_export.json`: `"version": "pipes_schema_v1"` → `"version": "looper_schema_v1"`
- `public/playground-fixtures/*.json`: all `"addPipe"` action strings remain (semantic, not brand)

---

## Phase 2: Domain Model Evolution

**Goal:** Rename the product's mental model from "system design tool" to "loop builder." Semantic + schema changes.

### 2.1 Terminology Map
| Old (Pipes) | New (Looper) | Rationale |
|---|---|---|
| System | Loop | The top-level artifact is a loop |
| Node | Step | Steps in a loop |
| Pipe (connection) | Connection | Neutral — steps connect, not "pipe" |
| Subsystem | Sub-loop | Nested loops |
| Group | Stage | Groups of steps = loop stages |
| Handoff | Deploy | You deploy a loop |
| Validation report | Health check | Loops have health checks |

### 2.2 Node Type Refinement
Add loop-specific node types to the 27 existing:
- `LoopControl` — iteration counter, max-iterations, termination condition
- `Checkpoint` — save loop state at this point (for resume/replay)
- `Evaluator` — judge/score the loop's last output (reflection pattern)
- `HumanReview` — pause and surface to human (replaces HumanApproval semantically)

Rename existing types where semantically wrong:
- `Annotation` stays (canvas note)
- `Subsystem` → `SubLoop`
- `Reference` stays

### 2.3 Schema File Rename
- `src/domain/pipes_schema_v1/` → `src/domain/looper_schema_v1/`
- Export version string: `"looper_schema_v1"`
- Add migration: `pipes_schema_v1` → `looper_schema_v1` in migration.ts

### 2.4 Convex Schema
- `system_pipes` table stays (semantic: connection between steps) — too risky to rename in DB
- Add `loop_runs` table for future execution state (schema only, no runtime yet)

---

## Phase 3: Marketing Site Overhaul

**Goal:** New positioning, new hero copy, new use cases, updated pricing page, updated protocol page. Everything reads "Looper" with the agent-loop pitch.

### 3.1 Homepage
- Hero: "Build agent loops, visually." / "Your agent and you, building together."
- Sub-headline: "Describe a loop. Watch it appear. Refine it with your agent. Share or sell it."
- Feature sections: Loop canvas → MCP export → Co-authoring → Marketplace
- Trust strip: framework-agnostic (works with LangGraph, AutoGen, CrewAI, OpenAI SDK, Claude)

### 3.2 Use Cases
- Replace system-design use cases with loop-first use cases:
  - "Research loop: find → synthesize → critique → repeat"
  - "Support loop: triage → classify → route → escalate"
  - "Code review loop: scan → flag → fix → verify"
  - "Sales loop: enrich → qualify → draft → follow up"

### 3.3 Pricing
- Free: 3 public loops, basic export, community templates
- Pro ($29/mo): unlimited private loops, version history, MCP tokens, analytics
- Team ($99/mo): seats, SSO, audit log, private registry
- Enterprise: custom

### 3.4 Protocol Page
- Rename "Protocol" → "Loop API"
- Update all code samples to use `looper.dev` domain and `LOOPER_TOKEN`

### 3.5 Docs
- Update all code examples
- Add "Loop concepts" section explaining steps, connections, stages, evaluators

---

## Phase 4: Canvas UX — Loop Visual Language

**Goal:** The canvas looks and feels like a loop tool, not a generic graph/diagram tool.

### 4.1 Visual Metaphor
- Nodes are now called "Steps" in all UI labels
- "Add step" not "Add node"
- Connections show directionality (arrow, flow indicator)
- Loop-back connections rendered with a curved arrow visual that reads as "iteration"

### 4.2 Loop-Specific Canvas Controls
- **LoopControl step**: rendered as a special "loop boundary" node with max-iterations input, termination condition, and current-iteration display
- **Stage grouping**: visual stage swimlanes (optional, toggle)
- **Evaluator step**: rendered with a score icon — makes the "reflect and critique" pattern visible

### 4.3 Toolbar
- "Add Step" button (primary)
- Step type picker shows loop-first categories: "Agents", "Tools", "Control", "I/O", "Memory"
- Removed: "Annotation" from primary toolbar (moved to secondary)

### 4.4 Inspector
- Step inspector header shows: step type, step name, loop it belongs to
- "Connection ports" renamed to "Inputs / Outputs" in UI
- New "Loop behavior" section in inspector for LoopControl steps

---

## Phase 5: Co-authoring Layer

**Goal:** Close the human↔agent iteration loop on the canvas. Human edits the canvas → agent sees it and responds. Agent proposes changes → human approves inline.

### 5.1 Canvas Edit Awareness
- Every manual canvas edit (move step, rename, add connection) emits a `canvas_edit` event
- The AI builder receives these events as context in its next run
- "You moved the Critic step before the Writer. Want me to update the connections to match?"

### 5.2 Inline Proposal UI
- Agent proposals appear as ghost nodes/connections on canvas (dashed border)
- Human clicks ghost → approve/reject/modify inline
- Approved → solid; rejected → fade out; modify → opens inspector pre-filled

### 5.3 Co-authoring Chat
- Chat panel is always visible (not hidden behind a button)
- Chat has two tracks: "Design" (canvas changes) and "Explain" (why this loop structure)
- Agent can reference specific steps by name in chat ("The Evaluator step needs...")
- Human can reference steps in chat ("make the Writer step faster")

### 5.4 Turn History
- Each agent turn shows in a collapsible sidebar timeline
- One Cmd-Z reverts the entire turn (existing behavior, surfaced more prominently)
- "Compare turns" view: before/after diff of the loop

---

## Phase 6: Marketplace Foundation

**Goal:** Creators can publish loops publicly. Browsers can discover, preview, and install preset loops into their own workspace.

### 6.1 Loop Listings
- Public toggle on any loop: makes it discoverable in the marketplace
- Listing fields: title, description, use case category, tags, framework compatibility, screenshot/preview
- Versioned: each public listing has a version (v1, v2...) — older versions remain available

### 6.2 Browse & Discovery
- `/marketplace` route: grid of public loops, filterable by category/tags/framework
- Search: keyword + semantic (via vector embeddings already in CLI memory system)
- Featured: curated picks, trending, new

### 6.3 Install Flow
- "Use this loop" → copy into your workspace with one click
- Installed loop is a full editable copy (no permanent link to original)
- Attribution line in inspector: "Based on [loop name] by [creator]"

### 6.4 Creator Profiles
- `/creator/[username]` page showing all public loops
- Loop stats: installs, stars, forks
- Verified creator badge (manual review program)

### 6.5 Paid Listings (Phase 6b)
- Creator sets a price (free / one-time / subscription)
- Stripe Connect for creator payouts (Looper takes 20% commission)
- Gated preview: browse, see structure, unlock to copy

---

## Phase 7: Revenue & Access Control

**Goal:** Ship the freemium gate and team features that anchor recurring revenue.

### 7.1 Plan Gating
| Feature | Free | Pro | Team | Enterprise |
|---|---|---|---|---|
| Public loops | 3 | Unlimited | Unlimited | Unlimited |
| Private loops | 0 | Unlimited | Unlimited | Unlimited |
| AI builder (turns/mo) | 10 | 200 | 500 | Unlimited |
| MCP tokens | 1 | 10 | Unlimited | Unlimited |
| Version history | Last 3 | Full | Full | Full |
| Marketplace selling | No | Yes | Yes | Yes |
| Team seats | 1 | 1 | Up to 20 | Unlimited |
| SSO / audit log | No | No | Yes | Yes |

### 7.2 Upgrade Flows
- Soft wall: "You've used 3/10 AI builder turns this month" → upgrade CTA
- Hard wall: private loop creation blocked on Free
- Checkout via Creem (already integrated)

### 7.3 Creator Revenue
- Stripe Connect integration
- Creator dashboard: earnings, installs, conversion rate
- Payout threshold: $25

---

## Phase 8: CLI & SDK Rebrand + Docs

**Goal:** `looper` CLI is the terminal interface. Updated install docs, updated MCP server name, updated completion scripts.

### 8.1 CLI
- Binary: `looper` (was `pipes`)
- All commands keep structure: `looper systems list`, `looper memory add`, etc.
- MCP server: `looper mcp-server`
- Completion: `looper completion --shell zsh`

### 8.2 Install Docs
- `packages/cli/INSTALL.md`: curl install from `looper.dev/install`
- npm: `npm install -g @looper/cli`

### 8.3 SDK Teaser
- Export a thin `@looper/sdk` package (stub for now): `Looper.run(loopId, initialState)`
- Marks the path for future runtime integration without committing to runtime now

---

## Phase 9: Validation & Launch Prep

**Goal:** Everything passes. PR created. Ready to ship.

### 9.1 Validation Gates
- `npm run typecheck` — 0 errors
- `npm run lint` — 0 errors
- `npm run build` — succeeds
- `npm test` — all tests pass (fix the 4 pre-existing failures from Phase 0)
- `cd packages/cli && npm run typecheck` — 0 errors

### 9.2 Visual Spot-Check
- Dev server in mock mode (`LOOPER_USE_MOCKS=true`)
- Visit: `/`, `/dashboard`, `/pricing`, `/docs`, `/marketplace`, `/login`, `/settings/billing`
- No "Pipes" branding visible anywhere
- Loop canvas renders correctly with new terminology

### 9.3 PR & Deploy
- Push branch → draft PR to `main`
- Vercel preview deploys clean
- PR #8 superseded or updated

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `pipes_schema_v1` is exported format — changing it breaks users | Ship `looper_schema_v1` as new default, keep `pipes_schema_v1` as read-only import migration |
| "Pipes" semantically describes connections (pipes between nodes) | Rename connections → "connections" not "loops" — the loop is the top-level artifact |
| Marketplace cold-start | Launch with 20+ curated loops from the AI builder; creator seeding program |
| No runtime = "just a diagram tool" criticism | Lean into the design+MCP export story hard; emphasize co-authoring as the differentiator |

---

*Generated: June 2026 | Version: 1.0*

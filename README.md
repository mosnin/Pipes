# Pipes

Pipes is a visual and machine-readable system design platform for agentic systems.

## Structured creation milestone
This pass adds:
- structured AI draft generation + edit suggestions (with explicit review/commit flow)
- template catalog and instantiation into editable systems
- canonical import diagnostics and safe commit path
- canonical export in JSON and Markdown forms
- selective AI edit review with per-change acceptance/rejection
- existing-system import merge planning with pre-merge checkpoints
- editor trust cues for collaboration occupancy and review states

## Core guarantees
- canonical source of truth is `pipes_schema_v1`
- AI calls remain server-side in `src/lib/ai`
- AI outputs are schema-validated before commit
- AI features are gated by entitlements (Builder required)
- AI never writes persistent state without explicit commit/apply requests

## Key routes
- `POST /api/ai/generate-system` (draft + commit)
- `POST /api/ai/suggest-edits` (suggest + apply)
- `POST /api/import/system`
- `GET /api/systems/[systemId]/export?format=json|markdown`
- `GET /api/templates` and `POST /api/templates/[templateId]/instantiate`
- protocol REST + MCP routes under `/api/protocol/*` (see `docs/protocol.md`)

## Protocol docs
- token lifecycle, normalized actors, audits, REST/MCP examples: `docs/protocol.md`
- protocol error model: `docs/errors.md`
- MCP guide: `docs/mcp.md`
- OpenAPI spec: `docs/openapi/protocol.json`
- SDK examples: `examples/protocol/client.ts`, `examples/protocol/client.py`

## Run in mock mode
```bash
cp .env.example .env.local
# PIPES_USE_MOCKS=true
# NEXT_PUBLIC_PIPES_USE_MOCKS=true
npm install
npm run dev
```

## Run in real provider mode
```bash
cp .env.example .env.local
# PIPES_USE_MOCKS=false
# NEXT_PUBLIC_PIPES_USE_MOCKS=false
# CONVEX_URL=...
# NEXT_PUBLIC_CONVEX_URL=...
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-4.1-mini
# CREEM_API_KEY=...
# CREEM_WEBHOOK_SECRET=...
# RESEND_API_KEY=...
npm install
npm run dev
```

## Testing
```bash
npm run lint
npm run typecheck
npm run test
```

## Vercel deployment configuration
- This repository is a **Next.js** app and includes `vercel.json` with `"framework": "nextjs"` to force correct framework detection.
- In Vercel project settings, ensure **Root Directory** points to this repo root (the folder containing `package.json` with `next` dependency and `next.config.ts`).
- Build command should be `npm run build` and install command should be `npm install` (defaults are fine with `vercel.json`).


## Post-launch instrumentation and support pass
- bounded product signal contract is documented in `docs/product_signals.md`
- internal operator support surface: `/admin`
- internal insights surface: `/admin/insights`
- richer audit filtering + CSV export: `/settings/audit`
- internal operator auth model: `PIPES_ADMIN_ALLOWLIST` (mock fallback: `owner@pipes.local`)

## Enterprise trust and scale pass
- workspace trust settings: `/settings/trust`
- workspace export manifest endpoint: `GET /api/settings/export/workspace`
- enterprise auth readiness model: shared vs `sso_ready` (Auth0 connection metadata + allowed domain validation)
- safer permission admin: owner immutability, explicit role-change confirmation, audited role changes
- bounded lifecycle posture: archive/restore for systems, workspace deactivate/reactivate, no hard delete
- see `docs/enterprise_trust.md` for supported vs deferred enterprise controls

## Conversion and growth pass
- strengthened homepage narrative and CTA structure around real product capabilities
- coherent logged-out IA additions: `/use-cases`, `/compare`, template detail pages
- bounded public content model in `src/lib/public/content.ts`
- bounded growth event model and route in `src/lib/public/metrics.ts` and `/api/marketing/signal`
- growth/discovery model documented in `docs/growth_model.md`


## Editor performance and resilience pass
- React Flow node rendering is memoized and heavy editor derivations use deferred/memoized computation.
- Editor history uses explicit graph actions with undo/redo shortcuts (`Cmd/Ctrl+Z`, `Shift+Cmd/Ctrl+Z`).
- Save state is explicit: `Saved`, `Saving`, `Unsaved local changes`, `Sync delayed`, `Error saving`.
- Autosave uses a bounded queued operation model with retry; pending operations are buffered for reload recovery and remain subordinate to persisted state.
- Editor crash boundaries isolate canvas/inspector failures and provide calm recovery actions.
- Lightweight reliability signals are emitted through `signal.editor_*` events via existing audit-backed ProductSignalService.


## System library and activation pass
- Introduces a tags-first library model with favorites, recents, archive/restore, filters, and sort controls via bounded `SystemLibraryService`.
- Dashboard now supports quick create, template launch, search, status filtering, tag filtering, and favorite/archive management.
- Onboarding now captures lightweight role/use-case context and routes users through blank/template/AI/import first-value paths.
- Activation and library quality events are tracked through bounded product signals (`signal.onboarding_*`, `signal.first_*`, `signal.activation_achieved`, `signal.library_*`).


## Launch readiness polish
- Accessibility sweep: improved focus visibility, status semantics, labeled controls, and settings navigation structure.
- Responsive hardening: app shell, dashboard grids, settings nav, and editor layout now degrade intentionally at narrower widths.
- State clarity: loading/empty/error messaging tightened on dashboard, onboarding recommendations, and settings pages.
- Added release docs: `docs/launch_checklist.md`, `docs/accessibility.md`, `docs/qa_checklist.md`.

## Beta launch operations pass
- Internal release review surface: `/admin/release` (environment readiness, critical flow checklist, failure rollups, protocol errors, activation, invite/billing checks).
- Internal issue triage surface: `/admin/issues` (feedback queue + status workflow + grouped failures).
- Structured feedback intake for early users: `/settings/feedback` and `POST /api/feedback`.
- Detailed launch workflow and staged rollout notes: `docs/beta_operations.md`.

## Agent builder realtime foundation
- System editor now includes a first-class builder chat panel attached to a system.
- Sessions, runs, messages, and run events are persisted and replayable.
- Streamed output is normalized into typed run events (not graph truth).
- Current boundary is planning/explanation only; agent graph mutation is intentionally deferred.
- See `docs/agent_builder.md` for full model and runtime boundaries.


## Agent graph action loop (milestone)

The builder agent now emits typed graph action proposals (`add_node`, `move_node`, `delete_node`, `add_pipe`, `delete_pipe`, `add_annotation`, etc.) and only applies graph changes through the trusted graph service path. Safe actions are auto-applied, review-required actions are held for explicit approve/reject in UI.


## Agent builder tools + approvals milestone

Builder runs now include structured planning, bounded tool calls, approval requests for risky actions, and checkpoint-aware apply guarantees. Runs can pause in `waiting_for_approval` and resume after explicit decisions through typed approval routes.


## Multi-stage specialist builder milestone

Agent runs now progress through explicit stages (`intake`, `inspect_context`, `plan`, `design_structure`, `validate_design`, `propose_actions`, `wait_for_approval`, `apply`, `summarize`, `completed|blocked|failed`) with specialist role activity, plan revisions, and proposal batch lineage persisted for replay and trust.

## Real bounded sub-agent execution milestone

- Sub-agent tasks now execute through a real provider boundary in provider mode (`src/lib/ai/sub_agents.ts`) with strict JSON normalization.
- Mock mode remains deterministic and uses the same contracts as provider mode.
- The runtime seam is explicit (`src/lib/runtime/sub_agent_executor.ts`) with inline + modal-ready dispatch posture.
- Sub-agent tasks and skill invocations persist execution lifecycle and normalized outputs.
- Reconciliation persists explicit outcomes and feeds plan revisions and proposal batches.
- Mutation authority is unchanged: sub-agents do not mutate graph state directly; all graph edits still use typed proposals + trusted apply.

- Agent builder review now includes real per-batch diff generation, dependency-safe selective approval, explicit preview state, and affected-region metadata routes for calm review UX.

## Agent memory and continuity milestone

- Builder runs now retrieve bounded prior memory (plan summaries, decision records, reusable patterns, continuation refs) before planning.
- Explicit builder strategies are persisted and selectable (`architecture_first`, `subsystem_first`, `validation_heavy`, etc.).
- Pattern artifacts and decision memory are inspectable through agent memory APIs and UI panel sections.
- Memory reuse remains advisory: trusted typed proposal/apply flow remains the only graph mutation authority.

## Evaluation and learning loop

Agent runs now persist explicit evaluation artifacts (run quality, proposal-batch outcomes, strategy and skill performance, pattern promotion/demotion, and typed learning artifacts). Retrieval for future runs is evaluation-aware: promoted patterns and strong strategies are boosted, while demoted patterns are still visible but deprioritized.

## Collaborative agent building

Pipes now supports explicit collaborative run review: shared run presence, threaded review comments on proposal batches/diff items, collaborative approval input with owner/admin final authority, persisted handoff records, and first-class revision requests. These artifacts are inspectable and auditable, and do not create a second mutation path.

## Agent policy and operational control

Workspaces can now define explicit agent policy (tools, risk posture, approval strictness, runtime/cost limits, escalation). Each run resolves and stores a policy snapshot, and policy decisions/escalations are persisted for inspection and audit.


## Agent operations and tuning

This milestone adds explicit run control (pause/resume/cancel/retry/fork), replay summaries, run comparison, and workspace tuning artifacts for presets, version views, skill bindings, and bounded experiment assignment. Operator APIs live under `/api/agent/*` and remain thin over domain services.


## Implementation handoff and delivery

Pipes can now generate typed implementation handoff packages from accepted persisted system state. Packages include structured artifacts (implementation plan, architecture spec, task breakdown, coding-agent prompt pack, QA checklist, risk register), support target variants (human, Codex, Claude Code, general LLM), require review before export, and provide deterministic markdown/JSON/prompt-pack exports.


## Real runtime stack: Agents SDK + Modal + Convex authority

Real mode now routes sub-agent tasks through an explicit runtime stack: host-side orchestration authority, policy-aware runtime target resolution (`inline_host`, `modal_worker`, `modal_sandbox`), optional OpenAI Agents SDK harness usage behind the AI boundary, and Modal-backed bounded execution for eligible tasks. Convex/mock persisted artifacts remain the only replay truth and graph mutation authority remains typed proposal/apply only.


## Sandbox artifacts and external workspace support

Sandbox-backed tasks now produce explicit, browsable artifacts with normalization records, preview metadata, and provenance linking run/task/session -> artifact. The host orchestrator remains authoritative: raw sandbox output is never treated as trusted app truth until normalized. Bounded workspace mount refs and file bundle refs support controlled external-workspace style inputs for sandbox assembly flows (including handoff bundle assembly).

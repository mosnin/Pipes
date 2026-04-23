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

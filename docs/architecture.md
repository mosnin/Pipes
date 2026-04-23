# Architecture

## AI boundary
- `src/lib/ai` owns provider interactions, prompt shaping, response parsing, and normalized failures.
- Service layer consumes typed AI contracts (`generateSystemFromPrompt`, `suggestSystemEdits`).
- Routes never call provider SDK/HTTP directly.

## Draft vs commit safety
- Draft generation returns structured proposal + assumptions/warnings.
- Commit path is explicit (`commit=true` route payload), then applies through service-layer system/graph rules.
- AI edit apply creates a pre-edit version snapshot before graph mutations.

## Template ownership
- Starter templates live in `src/domain/templates/catalog.ts`.
- Node library definitions (metadata + contextual ranking rules) live in `src/domain/templates/node_library.ts`.
- Editor UI reads node library metadata from domain definitions; insertion ranking/favorites/recents stay data-driven so future node packs can extend catalog without hardcoding UI logic.
- Instantiation uses same create + graph mutation services as manual authoring.

## Canonical import/export
- Import parses/validates `pipes_schema_v1` before mutation.
- Export uses canonical persisted state and supports JSON + markdown spec output.

## Protocol hardening ownership
- Protocol transport helpers (`src/lib/protocol/*`) own auth parsing, error mapping, idempotency coordination, and rate-limit checks.
- `ProtocolGuardService` in bounded services coordinates repository-backed idempotency and rate limit state.
- REST and MCP remain thin delegates to bounded services and capability checks.

## Editor trust loop ownership
- `AiGenerationService` now normalizes edit suggestions into discrete changes and applies only explicitly accepted change IDs with a version checkpoint first.
- `ImportExportService` owns existing-system merge planning and merge apply semantics (`safe_upsert` / optional conflict replacement).
- `PresenceService` remains ephemeral and separate from durable graph state; occupancy cues are derived in UI from presence snapshots.
- `ProductSignalService` emits lightweight product-quality events through existing audit storage boundaries.


## Editor performance + resilience ownership
- `EditorWorkspace` owns rendering orchestration, local optimistic queue, and keyboard ergonomics; domain mutation authority remains in `GraphService` via API routes.
- `editor_state.ts` defines explicit history semantics (forward/inverse action entries and move coalescing).
- `node_definition.ts` owns inspector contract schemas, compatibility hints, and definition validation rules; inspector UI binds to this explicit model instead of embedding contract logic inline.
- `structure_model.ts` owns subsystem semantics (selection → subsystem creation, collapse-aware render mapping, boundary derivation) and optional layout presets.
- `pipe_semantics.ts` owns route labels, typed path states, edge emphasis/focus projection, and simulation trace summaries without introducing runtime execution semantics.
- `agent_builder/model.ts` owns typed session/run/message/event contracts for replayable agent chat state.
- `domain/services/agent_builder.ts` owns session/run lifecycle authority and normalized event persistence; streaming UI is not a source of graph truth.
- `lib/ai/agent_stream.ts` owns provider-specific streaming details (mock/OpenAI) behind a bounded runtime contract.
- `EditorErrorBoundary` contains panel crashes and routes crash signals to `ProductSignalService`.
- Recovery buffer is local-only and subordinate to persisted graph truth; it replays queued graph actions through normal service routes on reload.


## Library + activation ownership
- `SystemLibraryService` owns retrieval, favorites, recents, archive/restore coordination, tags, and search/filter/sort semantics.
- Library organization is tags-first (not folders) for flexibility with low schema overhead.
- `OnboardingService` owns onboarding start/recommend/complete and activation signal semantics.
- UI components remain presentation-focused and delegate business rules to service-backed API routes.


## Polish pass boundaries
- UI polish remains presentation-level; business semantics continue to live in bounded services and thin routes.
- Launch-readiness signals continue through existing product signal/audit boundaries.

## Post-launch insights and support boundaries
- `ProductSignalService` owns bounded product signal ingestion (audit-backed).
- `ProductInsightsService` owns activation/retention/failure summary aggregation.
- `AdminSupportService` owns bounded support inspection (workspace/system/user lookups) without direct storage bypass.
- Admin authorization is explicit and centralized (`AccessService.ensureInternalOperator` with allowlist from config).

## Enterprise trust and governance boundaries
- `WorkspaceGovernanceService` owns enterprise auth-readiness settings, retention metadata, workspace export manifest generation, and workspace deactivate/reactivate posture.
- `CollaborationService` remains authority for invites/member role changes with explicit safety guards and audit emission for risky role transitions.
- Deletion posture is intentionally explicit: system archive/restore is supported; hard-delete flows are deferred.

## Conversion and growth boundaries
- `PublicContentService` owns bounded marketing content retrieval and growth event acceptance checks.
- Public page copy is sourced from a bounded content model (`src/lib/public/content.ts`) rather than scattered page literals.
- Growth instrumentation is intentionally lightweight and bounded (`src/lib/public/metrics.ts`, `/api/marketing/signal`) instead of introducing a heavy analytics platform.

## Beta launch operations boundaries
- `ReleaseReviewService` aggregates launch-readiness snapshots from audits, insights, and issue triage services.
- `FeedbackService` validates and persists bounded feedback records (category/severity/context/status lifecycle).
- `IssueTriageService` joins feedback items with grouped failure signals for compact operator triage.
- Admin/feedback routes remain thin; service layer remains business authority.

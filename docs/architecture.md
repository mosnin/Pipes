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


### Agent graph mutation boundary

- Provider output is normalized into typed `GraphActionProposal` records.
- Proposal policy/risk classification lives in `AgentRunService` authority.
- Persisted graph truth only changes via `GraphService` and repositories (same path used by human edits).
- Streamed run events are timeline/UX signals, never graph truth.


### Agent planner/tool/approval authority

- `AgentRunService` is the state-machine authority (`planning -> tooling -> waiting_for_approval/applying -> completed|blocked|failed`).
- `AgentToolService` exposes bounded read/summary tools; no direct graph mutation bypass is allowed.
- Risky applies require explicit checkpoint creation through `VersionService` policy before mutation.
- Approval requests are persisted typed records and decisions are auditable.


### Multi-stage specialist orchestration boundary

- `AgentRunService` orchestrates stage transitions and records stage lineage; it remains the only business authority for run progression.
- Specialist roles (`architect`, `validator`, `builder`, `explainer`) are strategy markers and timeline artifacts, not independent mutation authorities.
- Proposal batches are explicit persisted records tied to stage lineage and still flow through typed proposal/apply paths.

### Real bounded sub-agent execution boundary

- Real sub-agent provider calls are isolated behind `src/lib/ai/sub_agents.ts`.
- Runtime dispatch seam is isolated behind `src/lib/runtime/sub_agent_executor.ts` (`InlineSubAgentExecutor`, `ModalReadySubAgentExecutor`).
- `AgentRunService` remains orchestration authority and persists task/skill/result/reconciliation artifacts in Convex/mock repositories.
- Sub-agent outputs are normalized into Pipes-native artifacts (no provider payload contracts in routes/UI).
- Graph mutation authority remains unchanged: proposal + apply pathway only.

- Review services (`ProposalDiffService`, `ReviewSelectionService`, `ProposalPreviewService`, `AffectedRegionService`) are authoritative for diff/preview/selection behavior; routes remain thin wrappers.

### Memory and continuity boundary
- `AgentMemoryService` family (`MemoryRetrievalService`, `BuilderStrategyService`, `PatternArtifactService`, `DecisionMemoryService`) owns memory retrieval/persistence policy.
- Convex/mock repositories persist explicit memory artifacts (`memory_entries`, `builder_strategies`, `pattern_artifacts`, `decision_records`, continuation refs).
- Memory is advisory context only and cannot bypass proposal/apply/checkpoint authorities.

## Evaluation/Learning slice

The agent builder keeps evaluation explicit and inspectable. `AgentEvaluationService` computes bounded signals (approval/rejection rate, validation issue impact, apply failures, open questions, accepted pattern reuse, review friction) and stores records through repository contracts. These records feed strategy/skill performance stores, pattern lifecycle records, and learning artifacts. Retrieval in `MemoryRetrievalService` uses those artifacts as bounded recommendation context instead of hidden automation.

## Collaborative run review architecture

Collaboration artifacts (`RunReviewer`, `SharedRunVisibilityState`, `ReviewThread`, `ReviewComment`, `ApprovalParticipantRecord`, `ReviewDecisionRecord`, `HandoffRecord`, `RevisionRequest`) are persisted through repository contracts and owned by collaboration services. Final apply authority remains unchanged in `AgentRunService`; comments/recommendations never mutate graph state directly.

## Agent policy governance boundary

`AgentPolicyService` resolves workspace/system policy into a run snapshot before execution. `AgentRunService` enforces tool, auto-apply, and runtime controls from the snapshot on the existing trusted mutation path. Policy decisions, runtime usage, and escalations persist as first-class records for auditability.


## Agent operations and tuning slice

- `AgentOperationsService` owns run controls, replay summaries, run comparisons, preset activation, and bounded experiment assignment.
- Convex/mock repositories remain the mutation authority; routes are transport only.
- Policy is still the hard governance layer: presets and run overrides shape behavior but do not bypass policy constraints.


## Implementation handoff architecture

- `HandoffGenerationService` converts accepted persisted system truth into typed handoff packages and artifacts.
- `HandoffReviewService` handles approval/rejection/revision decisions as explicit versioned review events.
- `HandoffExportService` provides deterministic export formats and prompt-pack retrieval.
- Handoff artifacts are derived from system truth + bounded memory/evaluation context and do not mutate system graph state.


## Runtime authority split (host vs worker)

- Host orchestrator (`AgentRunService` + `AgentRuntimeService`) remains the only business authority for state transitions and apply decisions.
- `RuntimeRoutingService` resolves explicit execution targets from skill, policy, and task shape.
- Modal worker/sandbox execution is subordinate: it returns normalized payloads only; no graph/state mutation authority.
- Persisted runtime routing + lifecycle artifacts are stored in app repositories and drive replay/UI.


## Sandbox artifact authority model

- `SandboxSessionService` manages explicit sandbox session lifecycle and resumability metadata.
- `SandboxArtifactService` captures raw sandbox output, runs explicit normalization, and persists preview/summary records.
- `AgentRuntimeService` remains host authority and only ingests normalized outputs into trusted app artifacts.
- Mount refs and file bundles are explicit contracts, not arbitrary filesystem access.

# Agent Builder: Bounded Sub-Agent Orchestration

## What this milestone delivers

This milestone implements **real sub-agent orchestration** inside live runs (mock and provider mode), not just schema scaffolding.

Implemented outcomes:
- bounded delegation into persisted sub-agent tasks
- explicit subsystem-scoped context packing
- persisted skill invocation + skill result artifacts
- reconciliation records that feed plan revisions and proposal batches
- UI visibility for subsystem-level co-building work
- all graph mutation still flows through typed proposals + trusted apply path

## Safety and authority boundaries

- `AgentRunService` remains orchestration authority.
- Sub-agents **never mutate graph state directly**.
- All writes to graph state still go through:
  1. typed `GraphActionProposal`
  2. risk classification (`safe_auto_apply` / `review_required` / `forbidden`)
  3. trusted apply path (`GraphService` / `VersionService`)
- Provider internals remain behind `src/lib/ai/agent_stream.ts`.
- Route handlers remain thin transport wrappers.

## Sub-agent model

Artifacts persisted per run:
- `SubAgentTask` (role, stage, skill, bounded context pack, status lifecycle)
- `SkillInvocation` (started/completed/failed records)
- `SubAgentResult` (plan refinement, critique, open questions, proposal input hints)
- `OrchestrationStep` (decomposition/reconciliation decisions)
- `ReconciliationRecord` (merged vs review-required outcomes)

Task lifecycle used in runs:
- `created` → `queued` → `running` → `completed|blocked|failed`

## Subsystem context partitioning model

Context packs are intentionally bounded and explicit. Each sub-task receives:
- target subsystem summary + selected node ids
- local interface contract snippets (node title/type summaries)
- adjacent subsystem/interface summaries derived from crossing edges
- relevant validation issues (bounded list)
- current run stage
- lightweight system goal summary from user intent + system summary

Both mock and provider mode use the same context packing logic.

## Skill model and normalized outputs

Skills are selected from `src/domain/services/agent_skills.ts` and invoked by orchestrator.

Skill outputs are normalized and persisted into:
- plan refinement (`planSummary`)
- critique (`critique`)
- open questions (`openQuestions`)
- proposal batch inputs (`proposedActionTypes`)

Skill invocation records are visible in UI and retrievable by route.

## Reconciliation behavior

Reconciliation consumes sub-agent results and writes:
1. `ReconciliationRecord`
2. `PlanRevision` (with critique/open questions/unresolved risks)
3. `ProposalBatch` rows
4. concrete proposal inputs for downstream typed proposal creation

Conflict policy:
- conflict signals do **not** merge silently
- conflicted outputs become `review_required` reconciliation
- resulting risky batches stay review-gated

## Mock vs provider mode

Both modes share the same orchestration artifacts and contracts.

- Mock mode:
  - deterministic decomposition into at least two sub-tasks
  - deterministic critique + reconciliation
  - one safe apply + one review-required path in normal runs
- Provider mode:
  - model stream still routed through AI boundary
  - sub-agent execution routed through `src/lib/ai/sub_agents.ts` with strict JSON normalization
  - runtime dispatch through `src/lib/runtime/sub_agent_executor.ts` modal-ready seam
  - action chunks normalized into same proposal/apply lifecycle
  - sub-agent orchestration artifacts produced with same domain model

## Current limitations / deferrals

- Provider mode uses bounded model calls per task, but no distributed queue/offload yet (modal-ready seam still inline).
- Reconciliation conflict detection currently keys off bounded conflict signals and validation heuristics.
- No dedicated sub-task detail page yet; retrieval is run-scoped aggregate endpoints.

## Diff, selective review, and preview (implemented)
- Batches now expose concrete diff items via `GET /api/agent/runs/:runId/batches/:batchId`.
- Selection is dependency-validated via `POST /api/agent/runs/:runId/batches/:batchId/selection/validate`.
- Selective decisions apply through the same trusted proposal apply path via `POST /api/agent/runs/:runId/batches/:batchId/selection`.
- Preview state is generated (not persisted as graph truth) via `POST /api/agent/runs/:runId/batches/:batchId/preview`.
- Affected region metadata for focused highlighting is available at `POST /api/agent/runs/:runId/batches/:batchId/region`.

### Intentional deferrals
- Full distributed preview rendering for net-new phantom entities on the canvas remains lightweight (badge overlays + region focus).
- Advanced dependency graph explanation UI is limited to blocked reason text and locked dependency hints in this pass.

## Memory and continuity model

### Core artifacts
- `MemoryEntry`: typed memory facts/preferences/lessons with confidence and status.
- `BuilderStrategy`: explicit reusable planning/batching posture.
- `PatternArtifact` + `ReusableSubsystemPattern`: successful subsystem outcomes promoted for reuse.
- `DecisionRecord`: accepted/rejected/tentative decisions with staleness metadata.
- `SessionContinuationRef`: explicit run-to-run continuity attachment record.

### Retrieval and inclusion rules
- Retrieval is bounded by workspace/system scope and relevance to current prompt keywords.
- Stale memories are marked and ignored for planning inclusion.
- Included memory is summarized into compact notes attached to planning/sub-agent context packs.
- Strategy and retrieved memory are visible in UI and auditable through existing audit records.

### Intentional deferrals
- No vector embedding retrieval yet; current relevance is deterministic keyword + recency heuristics.
- No automatic memory conflict resolution beyond status/staleness filtering.

## Evaluation and learning lifecycle

Completed and meaningful paused runs trigger explicit evaluation generation. Proposal batches are scored with lineage context (risk class, stage, role/skill provenance). Strategy and skill effectiveness records are persisted per run. Reused patterns can be promoted/demoted with persisted evidence, and typed learning artifacts are generated from evaluations. Subsequent runs retrieve promoted patterns, stronger strategies, and relevant learning artifacts while surfacing demoted patterns as avoid signals.

## Collaborative review, approval, and handoff model

- Threaded comments are attached to explicit typed targets (`run`, `plan_revision`, `proposal_batch`, `diff_item`, `approval_request`, `learning_artifact`).
- Collaborative approval is bounded: anyone can comment/recommend/object; only Owner/Admin can finalize approve/reject.
- Handoffs are persisted with stage, pending approvals, open questions, unresolved threads, and status transitions.
- Revision requests are first-class records and visible run negotiation state; they do not mutate graph state directly.
- Mock mode and provider mode share the same collaboration contracts and route surfaces.

## Agent policy and run snapshot model

- Workspace policy defines tool allow/deny, risk posture, approval strictness, runtime/cost limits, and escalation rules.
- At run start, policy is resolved into a persisted run policy snapshot.
- Tool calls and auto-apply are enforced against snapshot values; violations create policy decisions and escalation records.
- Runtime usage is persisted for provider-call, token, cost, and elapsed tracking.
- Existing trusted apply path remains the only mutation authority.


## Operations, presets, and experiments (first pass)

### Run operations model
- Control actions: pause, resume, cancel, retry, fork, replay, compare.
- Controls are explicit and auditable through run events + audit stream.

### Replay and comparison model
- Replay summarizes stages, role activity, sub-agent tasks, tool calls, proposals, approvals, policy decisions, and escalations.
- Comparison provides bounded high-level scoring for two runs.

### Preset/version/experiment model
- Workspace presets are explicit options with batching and review hints.
- Prompt/strategy/skill versions are inspectable via operations endpoints.
- Experiment variant assignment is explicit and recorded; outcomes are rolled up per variant.

### Precedence
1. Policy safety controls (hard authority)
2. Run-level operation requests
3. Workspace preset tuning hints

### Deferrals
- Automated assignment policies and advanced statistical experimentation are intentionally deferred.


## Implementation handoff and delivery model

### Handoff package model
- Typed package status, artifacts, targets, versions, generation records, review decisions, export records, and acceptance criteria.
- Provenance links package artifacts back to persisted accepted system state.

### Target variants
- Shared truth model with target-specific adaptation for `human_engineer`, `codex`, `claude_code`, and `general_llm_builder`.
- Coding-agent prompts contain explicit context/objective/constraints/boundaries/outputs/acceptance criteria.

### Review and export semantics
- Generated packages enter review flow; approved packages become exportable.
- Exports are deterministic and include metadata (source, version, target, timestamps, digest).

### Memory and evaluation influence
- Generation includes bounded decision memory, promoted patterns, and evaluation risk signals.
- Ambiguities remain explicit in risk artifacts instead of being hidden.

### Deferrals
- Multi-file zip bundling and automated repository bootstrapping are deferred in this pass.


## Runtime stack model (Agents SDK + Modal)

### Routing model
- Runtime targets: `inline_host`, `modal_worker`, `modal_sandbox`.
- Routing considers skill shape, sandbox requirement, policy limits, and task heaviness.
- Routing decisions are persisted and auditable (`runtime_target_resolved`).

### Host vs worker authority
- Host orchestrator remains authoritative for run progression and apply decisions.
- Workers/sandboxes only return normalized artifacts; they cannot mutate graph truth directly.

### Policy integration
- Policy can allow/block modal and sandbox pathways and constrain runtime fan-out.
- Sandbox-required tasks blocked by policy fail explicitly and escalate through audit events.

### Realtime/runtime observability
- Task execution lifecycle records persist as queued/dispatched/running/completed/failed artifacts.
- Runtime details are retrievable via `GET /api/agent/runs/{runId}/runtime`.

### Deferrals
- Full queue-backed distributed scheduling and advanced Modal orchestration are deferred; this pass focuses on honest bounded routing and normalization contracts.


## Sandbox artifacts and external workspace model

### Session model
- Sandbox sessions are explicit persisted records with bounded lifecycle (`created`, `active`, `paused`, `completed`, `failed`, `expired`) and optional resume metadata.

### Bundle and mount model
- File bundle refs and workspace mount refs are explicit contracts for bounded input packaging.
- No arbitrary filesystem access is exposed in app contracts.

### Artifact and normalization model
- Raw sandbox outputs become `SandboxArtifact` records first.
- Host-side normalization produces explicit `ArtifactNormalizationRecord` success/failure entries.
- Previews are read-only views and do not become graph/system truth automatically.

### Policy interaction
- Sandbox-required tasks can be blocked by policy and produce explicit audit escalation.
- Bundle/mount use is auditable (`file_bundle_prepared`, `workspace_mount_requested`).

### Deferrals
- Rich multi-file mounted workspace synchronization and long-lived resumable shells are deferred; current pass is bounded to typed bundle refs, session metadata, and normalized artifact ingest.

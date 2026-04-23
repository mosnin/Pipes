# Agent Builder Foundation (Realtime Chat + Run Stream)

## Product boundary
- This slice establishes chat/run orchestration and replayable run events.
- Agent **does not mutate graph state** in this pass.
- Graph remains authoritative through existing graph services and repositories.

## Core model
- `AgentSession`: workspace-scoped, optionally attached to a system.
- `AgentRun`: one user-initiated run in a session.
- `RunMessage`: user/assistant/system messages.
- `RunEvent`: canonical replayable event stream item.
- `ToolCallRecord`, `ApprovalRequest`, `GraphActionProposal`, `RunTraceRef`, `RunCost`: typed placeholders for future evolution.

Model source: `src/domain/agent_builder/model.ts`.

## Event types
Supported run events:
- `run_created`
- `run_started`
- `assistant_text_delta`
- `assistant_text_completed`
- `tool_call_started`
- `tool_call_completed`
- `tool_call_failed`
- `run_waiting`
- `run_completed`
- `run_failed`
- `run_canceled`
- `approval_required` (placeholder)
- `graph_action_proposed` (placeholder)

## Architecture boundaries
- `AgentRunService` is business authority for sessions, runs, messages, and events.
- `RunExecutor` is runtime boundary.
  - `InlineRunExecutor`: current in-process execution path.
  - `ModalReadyRunExecutor`: adapter placeholder to preserve future worker dispatch seam.
- OpenAI/stream provider logic remains inside `src/lib/ai/agent_stream.ts`.

## Streaming behavior
- UI creates run via API, then opens streaming endpoint.
- Streaming endpoint emits normalized run events (`text/event-stream`).
- Every streamed event is persisted for replay through repository contracts.

## Persistence
Persisted entities:
- agent sessions
- agent runs
- run messages
- run events

Both mock and Convex repositories implement the same `agentBuilder` contract.

## Mock vs real mode
- Mock mode: deterministic tokenized stream (no credentials required).
- Real mode: OpenAI chat completion stream, normalized into `RunEvent` deltas.

## Intentional deferrals
- Direct graph mutation actions and approvals.
- Full tool execution.
- Production Modal dispatch.
- Fine-grained cost accounting.


## Typed graph action protocol

Action contract fields include actionId, actionType, targetSystemId, actor context, typed payload, rationale, riskClass, applyMode, sequence, validationStatus, proposedAt, and optional appliedAt.

### Lifecycle

1. model/provider emits proposed action
2. service validates + classifies risk
3. proposal persisted (`proposed`, `pending_review`, `forbidden`)
4. safe actions auto-apply through trusted graph service path
5. review-required actions wait for approve/reject
6. approvals apply through same path and emit audit signals

### Policy (current pass)

- `safe_auto_apply`: add_annotation, move_node, metadata-only update_node
- `review_required`: delete_node, delete_pipe, structural actions, non-metadata update_node
- `forbidden`: unsupported/destructive out-of-scope actions

### Deferrals

- grouped selective approval workflows
- rich visual diffs
- specialist toolchains and deep modal worker execution


## Planner, tools, approvals, and checkpoints

- Planner model: short structured plan with summary, confidence, steps, expected tools/actions.
- Tool model: bounded tools for system summary, schema/context inspection, validation/simulation summaries, template/node-library lookup, and approval/apply orchestration helpers.
- Approval model: typed `ApprovalRequest` records with `pending/approved/rejected` lifecycle; decisions are explicit and auditable.
- Checkpoint policy: risky actions require version checkpoint before apply; checkpoint failure blocks apply.
- Run state machine: `created -> planning -> tooling -> waiting_for_approval|applying -> completed|blocked|failed|canceled`.

### Orchestration posture (current)

- Real mode: OpenAI response stream + structured action proposal normalization, with bounded in-app tool execution and approval orchestration.
- Modal posture: runtime abstraction is explicit (`AgentRuntime` + `ModalReadyAgentRuntime`) and currently delegates inline.

### Deferrals

- Full long-running worker offload orchestration
- multi-party/stepwise approval routing
- specialist sub-agents and richer planning critiques

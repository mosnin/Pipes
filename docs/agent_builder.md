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

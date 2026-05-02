# Agent contract

The headline is "Describe your system. Watch it build itself." The magic moment lands in beat 3: the canvas comes alive in under two seconds with nodes and a typed pipe drawn by the agent. This document is the binding contract between the user, the Next.js app, the Modal + OpenAI Agents SDK runner, and the editor's optimistic queue. It locks Phases 2 through 5. Engineers read this and write code from it. If a section is silent, the answer is in "Open questions for Phase 2" or the silence is intentional and the feature is out.

## The 5 tools (locked for v1)

### 1. add_node

```
add_node(systemId: string, type: string, title: string, description?: string, x?: number, y?: number): { nodeId: string }
```

JSON schema:

```
{ "type": "object",
  "properties": {
    "systemId": { "type": "string" },
    "type": { "type": "string", "description": "One of nodeTypeValues from src/domain/pipes_schema_v1/schema.ts" },
    "title": { "type": "string", "maxLength": 80 },
    "description": { "type": "string", "maxLength": 400 },
    "x": { "type": "number" }, "y": { "type": "number" } },
  "required": ["systemId", "type", "title"] }
```

Adds one node to the canvas. Maps to `EditorGraphAction` `{ action: "addNode", systemId, type, title, description?, x?, y?, clientNodeId }` (src/components/editor/editor_state.ts:5). The runner generates `clientNodeId` and returns it as `nodeId` so subsequent `add_pipe` calls can reference it before server flush completes.

### 2. add_pipe

```
add_pipe(systemId: string, fromNodeId: string, toNodeId: string): { pipeId: string }
```

JSON schema:

```
{ "type": "object",
  "properties": {
    "systemId": { "type": "string" },
    "fromNodeId": { "type": "string" },
    "toNodeId": { "type": "string" } },
  "required": ["systemId", "fromNodeId", "toNodeId"] }
```

Connects two existing nodes. Maps to `EditorGraphAction` `{ action: "addPipe", systemId, fromNodeId, toNodeId, clientPipeId }` (editor_state.ts:8). The runner picks default ports server-side (output of `fromNodeId`, input of `toNodeId`); port editing is out of scope for v1.

### 3. update_node

```
update_node(nodeId: string, title?: string, description?: string, position?: { x: number, y: number }, config?: Record<string, unknown>): { ok: true }
```

JSON schema:

```
{ "type": "object",
  "properties": {
    "nodeId": { "type": "string" },
    "title": { "type": "string", "maxLength": 80 },
    "description": { "type": "string", "maxLength": 400 },
    "position": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"] },
    "config": { "type": "object" } },
  "required": ["nodeId"] }
```

Edits an existing node. Maps to `EditorGraphAction` `{ action: "updateNode", nodeId, title?, description?, position?, config? }` (editor_state.ts:6). Used to rename, rewrite, or relocate a node.

### 4. delete_node

```
delete_node(nodeId: string): { ok: true }
```

JSON schema: `{ "type": "object", "properties": { "nodeId": { "type": "string" } }, "required": ["nodeId"] }`

Removes a node. Maps to `EditorGraphAction` `{ action: "deleteNode", nodeId }` (editor_state.ts:7). The server-side flush cascades to attached pipes (convex/app.ts:87); the optimistic queue mirrors that cascade by emitting one synthetic `deletePipe` action per affected pipe so undo restores both endpoints and the connection.

### 5. validate

```
validate(systemId: string): { ok: boolean, errors: Array<{ nodeId?: string, pipeId?: string, message: string }> }
```

JSON schema: `{ "type": "object", "properties": { "systemId": { "type": "string" } }, "required": ["systemId"] }`

Validates the current graph against pipes_schema_v1. Read-only. Produces no `EditorGraphAction`. The result is included on the `tool_result` event verbatim; the agent uses it to write its final message.

## What is intentionally missing in v1

- Layout / auto-arrange. The agent places nodes by the rule in the system prompt; we do not ship a layout engine until users complain.
- Port editing. Default in / out ports are picked server-side; users cannot rewire ports from chat.
- Subsystem creation. Subsystems exist in the schema but the agent does not author them.
- Comments. The agent does not annotate the graph; comments are a human surface in v1.
- Version checkpoints. The agent does not snapshot; manual versioning stays a power-user action.
- Suggestions on top of suggestions. The agent commits one plan per turn; it does not propose alternatives mid-build.
- Simulation runs. Pipes does not execute the graph; the agent cannot kick off runs.

## The streaming protocol

Wire format: Server-Sent Events over a long-lived `POST` to `/api/agent/build`. The response `Content-Type` is `text/event-stream`. Each event is `event: <name>\ndata: <json>\n\n`.

### Events

- `tool_call` - agent is about to invoke a tool. Payload: `{ id: string, tool_name: "add_node" | "add_pipe" | "update_node" | "delete_node" | "validate", arguments: object }`. Fires the moment the runner decides to call a tool, before the tool executes.
- `tool_result` - tool returned. Payload: `{ id: string, ok: boolean, action?: EditorGraphAction, error?: string, data?: object }`. Fires once per `tool_call`. `action` is present for `add_node`, `add_pipe`, `update_node`, `delete_node`. `data` carries the validate result for `validate`. `error` is set when `ok` is false.
- `message` - agent text to the user, markdown allowed. Payload: `{ text: string, role: "assistant" }`. May fire multiple times per turn for streamed chunks; the client appends.
- `status` - coarse state for UI. Payload: `{ state: "thinking" | "calling_tool" | "writing_message", tool_name?: string }`. `tool_name` is present only when `state` is `calling_tool`.
- `done` - turn complete. Payload: `{ conversationId: string, turnId: string }`. Last event in a successful turn.
- `error` - terminal error. Payload: `{ code: string, message: string, retryable: boolean }`. Codes: `tool_call_limit_exceeded`, `timeout`, `auth_required`, `rate_limited`, `internal`, `model_unavailable`.

### Ordering invariants

- Every `tool_call` is followed by exactly one matching `tool_result` with the same `id`, OR by a terminal `error` if the turn was cancelled mid-call.
- `done` is the last event in a successful turn. After `done` no events are emitted on the connection.
- `error` is terminal. After `error` no events are emitted.
- The client may abort the connection at any time. The server observes `request.signal.aborted` and cancels the in-flight Modal call. See "The interruption contract."

## The request shape

`POST /api/agent/build`

Body (JSON):

```
{
  "systemId": "string",
  "prompt": "string",
  "conversationId": "string (optional, omit to start a new conversation)"
}
```

Required headers: `Content-Type: application/json`. Auth is the Clerk session cookie, enforced by middleware; no Authorization header.

Response: `text/event-stream`. The route is a Next.js Route Handler returning a `ReadableStream`.

## The conversation history shape

Persistence: Convex. Two new tables.

```
agent_conversations:
  _id: Id<"agent_conversations">
  systemId: Id<"systems">
  userId: Id<"users">
  createdAt: string (ISO)
  updatedAt: string (ISO)

agent_turns:
  _id: Id<"agent_turns">
  conversationId: Id<"agent_conversations">
  index: number
  prompt: string
  toolCalls: Array<{
    id: string,
    tool_name: string,
    arguments: object,
    ok: boolean,
    action?: EditorGraphAction,
    error?: string
  }>
  finalMessage: string | null
  startedAt: string (ISO)
  completedAt: string | null
  cancelled: boolean
```

State rule: a turn is APPEND ONLY. Once `done` or `cancelled` is written, no field is edited. The conversation is the ordered list of turns by `index` ascending. Resuming a session loads all turns oldest first and replays them as chat history; the graph is loaded separately from the Convex graph tables.

The mock-mode equivalent lives in `src/lib/repositories/mock.ts` as in-memory arrays keyed by conversationId.

## The optimistic apply contract

When a `tool_result` event arrives with an `action`:

1. The client immediately calls `localApply(nodes, pipes, action)` (the same function manual edits use; see editor_state.ts).
2. The client enqueues the action onto the existing optimistic queue, identical to the path manual user actions take into `/api/graph`.
3. The graph mutation eventually flushes to `/api/graph`. Idempotency: the queue keys on the `tool_result.id` for agent-originated actions and dedupes on retry.
4. Undo: every `tool_result` action from a single agent turn collapses into ONE composite history entry. Cmd-Z undoes the entire turn, not one node at a time. Implementation hint: open a synthetic history accumulator at the first `tool_result` of a turn (keyed by `turnId`), append each `forward` and prepend each `inverse` as actions arrive, then on `done` push one `HistoryEntry` whose `forward` is the full ordered list and whose `inverse` is the reverse-order undo list. Use `coalesceKey = turn:${turnId}` so the entry never coalesces with subsequent manual edits. See `pushHistory` in editor_state.ts:20.

If the user edits the graph manually mid-turn, the manual edit pushes its own normal history entry between the agent's accumulator opens and the `done` close. The agent's composite entry still bundles only the agent's actions; the manual edit is a separate undo step that sits between them in the stack.

## The interruption contract

- The user clicks Stop or presses Escape.
- The client closes the SSE connection.
- The server route handler observes `request.signal.aborted` and signals Modal cancellation.
- Modal: if the runtime supports cancellation, the function exits. If not, the function continues to completion but the route stops persisting events and stops writing to `agent_turns` after the abort timestamp; the partially completed turn is marked `cancelled: true`.
- UI: the chat shows a single line "Stopped." Partial graph writes that already arrived stay on the canvas; Pipes is forgiving and the user can keep editing.
- The user can type a new prompt immediately. The next turn starts fresh and reads the current graph (including the partial state) as its starting point.

## The cap contract

- Each turn is hard-capped at 30 tool calls server-side. The 31st `tool_call` is refused; the route emits `error` with `code: "tool_call_limit_exceeded"`, `retryable: false`.
- Each turn is hard-capped at 60 seconds of wall-clock time measured from the first byte of the response. On exceed, the route emits `error` with `code: "timeout"`, `retryable: false`.

These caps are non-negotiable for v1. They exist to bound runaway loops and runaway cost.

## The cold-start contract

V1 ships without warm pools. The first request after a quiet period may take up to 800 ms before the first SSE event arrives. The client:

- MUST display a "Building..." placeholder within 100 ms of the user pressing return.
- MUST NOT change the placeholder text until either the first event arrives or 5 s elapse.
- After 5 s with no event, the placeholder upgrades to "Spinning up...".
- After 30 s with no event, the client treats the connection as failed, closes it, and shows a Retry button.

## The mock-mode contract

When `PIPES_USE_MOCKS=true`:

- `/api/agent/build` returns canned events from a fixture file at `tests/fixtures/agent-build/<sha256(prompt).slice(0,12)>.json` if one exists, else a generic 3-node fixture at `tests/fixtures/agent-build/_default.json`.
- No Modal call. No OpenAI call. No network egress.
- The streaming format is byte-identical to production: same SSE `event:` and `data:` framing, same payload schemas, same ordering invariants. The frontend cannot tell the difference.
- Fixture file shape: a JSON array of objects, each `{ event: string, data: object, delay_ms?: number }`. `delay_ms` (default 0) is a wait BEFORE emitting the event. Conversation persistence is mirrored to the in-memory mock repository so reload-and-resume works in dev.

## The system prompt contract

The agent's system prompt lives at `agents/system_prompt.md`, created in Phase 2. This contract defines what that prompt MUST and MUST NOT do.

MUST:

- Speak in the voice of `docs/audience.md`: one idea per sentence, verbs over nouns, ASCII only.
- Output one plan, build it, stop. No second-guessing mid-turn.
- Call `add_node` before `add_pipe`. You cannot connect what does not exist.
- Lay out nodes left to right. The first node goes at `x=240, y=180`. Each subsequent node steps `x` by 220. New rows step `y` by 140 and reset `x` to 240.
- Call `validate` at most once per turn, at the end, before sending the final message.
- Send exactly one final `message` event after the last tool call.

MUST NOT:

- Suggest features the user did not ask for.
- Apologize.
- Use any banned word from `docs/audience.md` (platform, solution, leverage, empower, seamless, unlock, robust, holistic, cutting-edge, world-class, best-in-class).
- Stop in the middle of a build to ask the user a question. If the prompt is ambiguous, pick the most plausible reading and build it; the user will Cmd-Z and rephrase.
- Make more than 30 tool calls.

## What "looks Apple" about this contract

- 5 tools. Not 20. The surface is so small a new engineer holds it in their head.
- One Cmd-Z per turn. The user thinks in turns; the undo stack thinks in turns.
- Manual edits during a build always win. The agent yields to the human hand.
- Streaming animations are 80 to 120 ms per beat. The user is informed, not entertained.
- The cold-start placeholder is one word: "Building...". No progress bar. No percentages.
- The chat is the input. There is no second window.

## Open questions for Phase 2 (do not answer here, just list)

- Modal cancellation API: which version of the Modal client supports clean mid-call cancellation? If none, we drop writes post-abort instead and document the budget waste.
- OpenAI Agents SDK: pinned package version and minimum compatible model that reliably handles our 5-tool surface within the 30-call cap.
- Conversation pruning: at what conversation length do we summarize older turns to fit the model context window? Hypothesis: prune at 20 turns, summarize the oldest 10 into a single system message.
- Cost telemetry: do we record per-turn input/output token counts and dollar cost on `agent_turns`? Likely yes; field names TBD (`promptTokens`, `completionTokens`, `costUsd`).
- Idempotency keying for `/api/graph` flushes originating from the agent: confirm whether `tool_result.id` is sufficient or whether we need a composite `(turnId, toolCallId)` key.
- Multi-tab behavior: if the same user opens the same system in two tabs and runs two turns concurrently, which turn wins on flush? Recommend rejecting the second with `rate_limited` until v2.

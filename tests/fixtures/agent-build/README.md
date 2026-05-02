# Agent build fixtures

Canned SSE event streams used by `/api/agent/build` in mock mode (when
`PIPES_USE_MOCKS=true` or no `PIPES_AGENT_ENDPOINT_URL` is configured).

## Lookup

The route hashes the prompt with SHA-256, takes the first 12 hex chars, and
loads `<hash>.json` from this directory. If no hash file matches, the route
falls back to `_default.json`.

To pin a fixture for a specific prompt:

```bash
node -e 'console.log(require("crypto").createHash("sha256").update("your prompt here").digest("hex").slice(0,12))'
```

Save the canned events at `<hash>.json`.

## Format

A JSON array of frames. Each frame:

```
{
  "event": "status" | "message" | "tool_call" | "tool_result" | "done" | "error",
  "data": { ... payload per docs/agent-contract.md ... },
  "delay_ms": number (optional, default 0)
}
```

`delay_ms` is the wait BEFORE emitting the event. Use small values (40-200ms)
to mimic streaming cadence. Use 0 for fast tests.

## Runtime substitutions

The route replaces these literal strings before sending each frame:

- `"<runtime>"` in any data field is replaced with the live `conversationId`,
  `turnId`, or `systemId` value depending on the field name.

For example, in a `done` event:

```
"data": { "conversationId": "<runtime>", "turnId": "<runtime>" }
```

becomes:

```
"data": { "conversationId": "ac_abc123", "turnId": "at_def456" }
```

For `addPipe` actions, `systemId: "<runtime>"` is replaced with the request's
`systemId`.

## Ordering invariants

Fixture authors MUST preserve the contract from `docs/agent-contract.md`:

- Every `tool_call` is followed by exactly one `tool_result` with the same `id`.
- `done` is the last event in a successful turn.
- `error` is terminal.
- The route enforces a 30-tool-call cap; fixtures with more than 30 tool calls
  trigger `error` with `code: "tool_call_limit_exceeded"`.

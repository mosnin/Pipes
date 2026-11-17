# Connecting agents over MCP

Pipes runs a Model Context Protocol server at:

```
https://<your-pipes-host>/api/mcp
```

Transport: Streamable HTTP (JSON responses). Protocol versions `2025-06-18`,
`2025-03-26` and `2024-11-05`.

## Authentication

**OAuth (recommended).** Clients that support MCP authorization (Claude,
ChatGPT, Cursor and others) only need the URL. Pipes publishes
`/.well-known/oauth-protected-resource` and
`/.well-known/oauth-authorization-server`, supports dynamic client
registration and PKCE (S256), and shows a consent page in the workspace. The
access token it issues is a normal Pipes API token named after the client, so
it appears under **API tokens** and can be revoked there.

Claude Code:

```bash
claude mcp add --transport http pipes https://<your-pipes-host>/api/mcp
```

**API token.** Create a token under **API tokens** and send it as
`Authorization: Bearer <token>`. Capabilities decide which tools work:

| Capability | Tools |
| --- | --- |
| `systems:read` | `list_workflows`, `get_workflow` |
| `runs:read` | `get_current_step`, `get_run`, `list_runs` |
| `runs:write` | `start_run`, `complete_step`, `cancel_run` |
| `connections:secrets` | step payloads include connection headers (never implied by `systems:write`) |
| `templates:read`, `templates:instantiate` | `list_templates`, `create_workflow_from_template` |
| `schema:read` | `export_workflow` |
| `comments:write` | `add_comment` |
| `memory:read` | `search_memory` |
| `memory:write` | `remember`, `forget_memory`, and `remember` on `complete_step` |

A token scoped to one workflow only sees that workflow.

## The run loop

A run is an agent walking a workflow one step at a time. Pipes holds the
procedure and the state; the agent does the work.

1. `start_run { systemId, input? }` returns the first step.
2. Do the step. The payload includes `instructions`, `doneWhen`, `skills`,
   `connections`, earlier steps' outputs, and the `options` (routes) out of it.
3. `complete_step { runId, nodeId, outcome?, output?, notes?, next? }`.
   `outcome` is `success` (default), `failure`, `retry`, or a route label.
   When a step has several routes, pass the label as `outcome` or a pipe id as
   `next`. Loops stop at their iteration limit and take the exit route.
4. Repeat with the step it returns until `status` is `completed` or `failed`.

When the run reaches a human approval step its status is `waiting_approval`.
A person decides it in Pipes (Approvals); poll `get_current_step` meanwhile.

## Rails, retries and the journal

- Send `idempotencyKey` with `start_run` and `complete_step`. A retry with the
  same key returns the same run, or recognises the completion, instead of
  acting twice.
- `complete_step` takes `costMicros` (integer micro-dollars) for steps that
  spend money.
- `get_current_step` lists the limits that apply under `rails`: deadline, step
  timeout, allowed outcomes, output schema, steps and cost remaining. Pipes
  refuses a completion that breaks them, with the reason.
- `get_run_events { runId, afterSeq? }` returns the run's journal, for an agent
  resuming after a disconnect.
- Each token has per-minute call and write limits and an hourly start limit,
  set by the workspace (`RATE_LIMITED` when exceeded).

See [rails.md](rails.md) and [agent_contract.md](agent_contract.md).

## Memory

- `get_current_step` returns `memory`: up to five facts the workflow learned
  on earlier runs that match the step.
- `complete_step` takes `remember`, a list of facts for later runs (strings,
  or `{ text, key?, scope? }`). The result lists each one under `remembered`;
  a fact that is refused never undoes the completion.
- `search_memory`, `remember` and `forget_memory` work outside a step.

See [memory.md](memory.md).

## Raw JSON-RPC

```bash
curl -s https://<host>/api/mcp \
  -H "Authorization: Bearer $PIPES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_workflows","arguments":{}}}'
```

Every tool call is audited (`mcp.<tool>`) and metered as usage. Rate limit:
240 requests a minute per token.

## Legacy endpoint

`POST /api/protocol/mcp` with `{ "tool": "...", "input": {} }` still works for
existing integrations but is not an MCP server. Prefer `/api/mcp`.

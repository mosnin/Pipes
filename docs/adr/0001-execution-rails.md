# ADR 0001: Execution rails at the step boundary

Status: accepted, phase 1 and part of phase 2 built.

## Context

Agents walk Pipes workflows over MCP. Before rails, a run document was saved
with an unconditional write, so concurrent completions could overwrite each
other; retried starts created duplicate runs and retried writes billed twice;
nothing ended a stuck run; and stopping agents in an incident meant revoking
tokens and canceling runs one at a time.

We studied Coral (github.com/withcoral/coral), which describes itself as
"execution rails for agents": a self-hosted Rust gateway that runs agent
programs in a sandbox and checks every tool call at one choke point against
per-tool policy (allow, ask, block), with approvals bound to the exact call,
run deadlines, budgets, idempotent requests and a run ledger whose writes only
land if they extend its head.

## Decision

Re-implement the ideas in TypeScript at Pipes' step boundary, rather than
vendor or port Coral:

- Coral is about thirty Rust crates plus a V8 runner; nothing compiles into a
  Next.js and Convex app.
- The problems differ. Coral sits on every tool call; Pipes deliberately does
  not run steps, so its rails belong where it hands out and records steps.
- Writing our own code and docs owes no attribution. Coral's core is
  Apache-2.0 and its `ee/` directory is under a commercial license; we copied
  nothing from either.

What we took, as ideas: a conditional commit that only lands on the current
revision, an append-only journal written with each change, idempotent requests
that return the recorded answer, a hard run deadline nothing pauses, exact
budgets, one choke point that rechecks live facts (kill switches) before every
effect, and attributing every change to an actor.

What Pipes adds that Coral cannot: because the run engine is pure and takes the
clock as an input, the journal replays a run exactly.

## Consequences

- Every run write goes through load, gate, transition, conditional commit, with
  retries on conflict (`src/domain/runs/service.ts`).
- Rails are optional and frozen into the run snapshot; switches and token limits
  are live.
- Time rails are enforced on read plus a cron sweep, because Pipes has no worker.
- Cost limits rely on what agents report until connection calls are brokered.
- A workflow can later point a step's MCP connection at a self-hosted Coral to
  get call-level rails inside a step, with no code shared.

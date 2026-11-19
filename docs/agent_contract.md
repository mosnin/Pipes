# The agent contract

What an agent walking a Pipes workflow must do, may do, and can expect. It
holds for MCP (`/api/mcp`) and REST alike.

## Must

1. Get the step before doing it: `start_run` or `get_current_step` returns the
   step's instructions, `doneWhen`, skills, connections, routes and rails.
2. Do only that step, then report it with `complete_step`, passing the
   `nodeId` it was given. Pipes refuses a completion for a step the run is no
   longer on (`stale_step`).
3. Respect the step's rails. If `rails.allowedOutcomes` is set, report one of
   them. If `rails.outputSchema` is set, the output must fit it. If a deadline
   or timeout is listed, finish before it.
4. Stop when Pipes says no. A refusal carries a code and a plain sentence; do
   not retry `kill_switch`, `budget_steps` or `deadline_exceeded`.

## Should

- Send an `idempotencyKey` with `start_run` and `complete_step`. Use a value
  unique to the attempt you mean (for example `ticket-4812-start`). Retrying
  with the same key after a timeout is then always safe.
- Report `costMicros` (integer micro-dollars) on `complete_step` when the step
  spent money, so cost limits work.
- After reconnecting, read `get_run_events` with the last `seq` you saw.
- Read the step's `memory` before starting, and pass `remember` on
  `complete_step` for anything a later run should know. One fact per item,
  true beyond this run, never a secret. See [memory.md](memory.md).

## Can expect

- **At most once.** A completion lands once, even when retried or raced.
- **Frozen procedure.** The workflow, its instructions and its rails are fixed
  for the life of the run.
- **Clear refusals.** Every refusal names its rule and what to do about it.
- **A record.** Everything the agent did is in the run's journal, with time
  and actor.

## Codes an agent will see

`stale_step`, `awaiting_approval`, `run_finished`, `choose_route`,
`invalid_next`, `loop_limit`, plus the rails codes in [rails.md](rails.md):
`kill_switch`, `concurrency_limit`, `budget_steps`, `budget_cost`,
`deadline_exceeded`, `step_timeout`, `invalid_output`, `outcome_not_allowed`,
`conflict`. Over MCP, a token over its limits gets `RATE_LIMITED` with the time
to wait. Memory tools add `not_found`, `memory_full` and `looks_secret`.

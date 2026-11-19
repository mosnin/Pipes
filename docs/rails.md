# Execution rails

Rails are the limits and switches every run passes through. They make Pipes
safe to hand to agents at enterprise scale: a run cannot be completed twice,
cannot run forever, cannot spend without limit, and can be stopped across a
workflow or the whole workspace in one action. Every rail is optional. A
workflow with no rails configured behaves exactly as it did before rails
existed.

This page explains what each rail does, why it exists, where the logic lives,
and how agents see it. Related pages:

- [run_journal.md](run_journal.md): the run journal and replay
- [agent_contract.md](agent_contract.md): what an agent must and may do
- [kill_switch.md](kill_switch.md): the incident runbook
- [adr/0001-execution-rails.md](adr/0001-execution-rails.md): why rails look like this

## Where rails sit

Pipes does not run steps itself; agents do the work and report back over MCP or
REST. So Pipes' rails sit at the **step boundary**: starting a run, handing out
the current step, completing it, routing it, and deciding an approval. Every
one of those actions goes through the same path:

1. **Load.** The run is read, and any time-based rail that has come due
   (a deadline, a step timeout) is applied and saved first.
2. **Gate.** A pure function decides whether the action may happen, from the
   run, its frozen rails and live facts (kill switches, active run count).
3. **Transition.** The pure run engine computes the new run, with the clock
   passed in.
4. **Commit.** The new run and its journal events are written in one
   conditional transaction that only lands if nobody else changed the run
   since step 1. If someone did, the service re-reads and starts again.

| Piece | File |
|---|---|
| Rail types | `src/domain/rails/types.ts` |
| Gate, budgets, expiry | `src/domain/rails/gate.ts` |
| Output contracts and sanitising | `src/domain/rails/validate.ts` |
| Journal and replay | `src/domain/rails/journal.ts` |
| Kill switches and token limits | `src/domain/rails/switches.ts` |
| Wiring (load, gate, commit, retry) | `src/domain/runs/service.ts` |
| Conditional commit | `DocumentsRepository.commit` in `src/lib/repositories/*`, `convex/documents.ts` `commit` |
| Live rails API | `src/app/api/rails/route.ts` |
| Sweep for untouched runs | `src/app/api/cron/rails/route.ts` |
| Tests | `tests/unit/rails.test.ts` |

## Frozen and live rails

- **Frozen rails** live on the workflow's design document (`SystemDesign.rails`
  for the workflow, `StepSpec.rails` per step) and are copied into each run's
  snapshot when it starts, like step instructions. Editing a workflow's rails
  never changes runs already in flight.
- **Live rails** are read at the moment of each action: kill switches and
  per-token limits. Turning runs off takes effect on the very next call.

## The rails

### Conditional commit (always on)

Every saved change to a run increments its `rev`. A save lands only if the
stored `rev` still equals the one the writer read (compare and set). Convex
mutations are serializable transactions, so the compare and every write happen
as one unit.

**Prevents:** two agents, or one agent retrying after a network timeout,
completing the same step at once. Before rails the later write silently
overwrote the earlier one, dropping a step record or routing twice. Now the
second writer re-reads, sees the step already moved on, and gets `stale_step`
(when it sent `nodeId`) or completes the step it is actually on.

### Idempotency keys (opt in per call)

- `start_run` and `POST /api/systems/{id}/runs` take an `idempotencyKey` (or an
  `Idempotency-Key` header). A retry with the same key returns the first run.
  The key record is the target of the conditional commit, so two simultaneous
  starts with one key can never both create a run.
- `complete_step` and `POST /api/runs/{id}/complete` take an `idempotencyKey`.
  The key is stored on the step record; a retry returns the run as it is now
  instead of completing a second step.
- Webhook senders can send `Idempotency-Key`; schedules use a key per schedule
  per minute, so overlapping cron calls start one run.
- Usage events for run starts and step completions have deterministic ids, so a
  retried request is never billed twice.

**Prevents:** duplicate runs (duplicate refunds, duplicate tickets) and double
billing from client retries.

### Kill switch (live)

Owners and admins can set a switch on the workspace or on one workflow:

| Mode | Effect |
|---|---|
| `off` | Normal. |
| `pause` | New runs are refused and steps cannot be completed. Approvals and cancels still work. In-flight runs wait where they are. |
| `halt` | Everything `pause` does, and every active run in scope is canceled. |

A workflow's own switch is checked before the workspace's. Every change is
audited (`rails.kill_switch.<mode>`). See [kill_switch.md](kill_switch.md).

**Prevents:** having to revoke tokens and cancel runs one by one during an
incident.

### Per-token limits (live)

Workspace settings set three limits applied to every agent token:

| Limit | Default | Applies to |
|---|---|---|
| Calls per minute | 240 (the platform ceiling) | every MCP call |
| Run changes per minute | 120 | `start_run`, `complete_step`, `cancel_run`, `add_comment`, `create_workflow_from_template` |
| Runs per hour | 600 | `start_run` |

**Prevents:** one leaked or looping token using up the workspace's shared limits.

### Budgets (frozen, per workflow)

| Rail | Effect |
|---|---|
| `budgets.maxSteps` | When completed steps (counting loops and send-backs) reach the limit, the run ends `failed` with `errorCode: "budget_steps"`. This complements `maxIterations`, which only caps one loop. |
| `budgets.maxDurationMs` | The run's `deadlineAt` is its start plus this. Past it, the run ends `failed` with `deadline_exceeded`. Waiting for a person does not pause the deadline. |
| `budgets.maxCostMicros` | Agents report `costMicros` on `complete_step`. A completion that would take the run over the limit is refused with `budget_cost`. |

Cost is only as honest as what agents report. Pipes cannot see spend that
happens inside an agent; the limit stops a run whose reported spend runs away.

### Concurrency (frozen, per workflow)

`concurrency.maxActiveRuns` caps running plus waiting-for-approval runs of the
workflow. A start over the limit is refused with `concurrency_limit`.

The count and the insert are separate reads today, so two starts at the same
instant can exceed the limit by one. A single-transaction start is planned.

**Prevents:** a webhook storm or a bad schedule starting hundreds of runs
against the same downstream system.

### Step rails (frozen, per step)

| Rail | Effect |
|---|---|
| `timeoutMs` | From entering the step. Past it, the step times out: it takes its failure route, or the run fails if there is none (or if `onTimeout` is `fail_run`). |
| `allowedOutcomes` | The only outcome labels an agent may report. Anything else is refused with `outcome_not_allowed`. |
| `output.schema` | A JSON Schema subset the step's output must fit. With `onInvalid: "reject"` the completion is refused with readable problems (`output.amount: expected a number`) and the agent can fix and resubmit. With `"failure_route"` the step is completed as a failure. |
| `maxCostMicros` | Most one completion of the step may report spending. |

The schema subset is `object` (properties, required, additionalProperties),
`array` (items, minItems, maxItems), `string` (enum, minLength, maxLength,
pattern), `number` / `integer` (minimum, maximum) and `boolean`. Pipes validates
it without a dependency.

## Time without a worker

Pipes has no background process. Time-based rails are applied whenever a run is
read (every `get_current_step`, every page load), and `/api/cron/rails` applies
them to runs nobody has touched. Call it every few minutes with
`Authorization: Bearer $CRON_SECRET`. Expiry uses the time the rail came due,
not the time it was noticed, so a run that passed its deadline at 09:00 and was
read at 09:30 records 09:00.

## What agents see

`get_current_step` returns a `rails` object whenever limits apply: `deadlineAt`,
`stepTimesOutAt`, `allowedOutcomes`, `outputSchema`, `stepsRemaining`,
`costRemainingMicros`. A refused action returns the reason as plain text with a
code (see [agent_contract.md](agent_contract.md) and [errors.md](errors.md)).

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `kill_switch` | 423 | Runs are paused or halted here. |
| `concurrency_limit` | 429 | The workflow is at its active run limit. |
| `budget_steps` | 409 | The run reached its step limit (the run ends). |
| `budget_cost` | 409 | The completion would go over a cost limit. |
| `deadline_exceeded` | 409 | The run passed its deadline (the run ends). |
| `step_timeout` | 409 | The step ran out of time. |
| `invalid_output` | 422 | The output does not fit the step's contract. |
| `outcome_not_allowed` | 422 | The outcome is not one the step allows. |
| `conflict` | 409 | The run kept changing under the write; get the current step and try again. |

## Not built yet

- Step leases with heartbeats, and retries with backoff.
- Approvals required before or after risky steps (beyond HumanApproval steps).
- Releasing connection secrets only to the agent holding a step.
- A single-transaction start for an exact concurrency limit.
- Brokered connection calls, which would make cost exact rather than reported.

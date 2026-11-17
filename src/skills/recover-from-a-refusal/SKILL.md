---
name: recover-from-a-refusal
version: 1.0.0
description: Read a refusal from Pipes, fix the cause and retry once, instead of retrying blindly.
triggers:
  - complete_step failed
  - refused
  - error code
tools:
  - get_current_step
  - complete_step
  - get_run_events
capabilities:
  - runs:read
  - runs:write
---

# Recover from a refusal

Every refusal names the rule it applied and what to do. Read it; the fix is
usually one change.

## When to use

A run tool returned an error.

## What each code means

| Code | Do this |
|---|---|
| `stale_step` | The run moved on. Call `get_current_step` and work from that step. |
| `conflict` | Someone else changed the run at the same moment. Get the current step, check whether your work still applies, retry once. |
| `choose_route` | Use the choose-a-route skill. |
| `invalid_output` | The output broke the step's schema. The message names the field. Fix it and retry with the same idempotencyKey. |
| `outcome_not_allowed` | Use one of `rails.allowedOutcomes`. |
| `step_timeout`, `deadline_exceeded` | Too late. The run took its timeout route or ended. Report what you had in notes on the next step, or tell a person. |
| `budget_steps`, `budget_cost` | The run hit its limit and stopped. Tell a person; do not start a new run to get around it. |
| `kill_switch` | A person paused or stopped runs. Stop and report. |
| `concurrency_limit` | Too many runs are open. Wait for one to finish. |
| `awaiting_approval` | Use the wait-for-approval skill. |
| `run_finished` | Nothing left to do. |
| `RATE_LIMITED` | Wait the number of seconds in the message. |

## Rules

- Retry at most once per fix. Two identical refusals mean the fix was wrong.
- A retry of the same completion reuses its idempotencyKey; a new attempt
  after changing the output may too, since the first never landed.
- Never work around a kill switch or a budget.

## Done when

The step completed, or a person knows why it could not.

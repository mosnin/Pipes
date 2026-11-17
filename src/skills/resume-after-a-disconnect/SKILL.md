---
name: resume-after-a-disconnect
version: 1.0.0
description: Pick a run back up after a timeout, crash or restart without doing any step twice.
triggers:
  - lost connection
  - timed out
  - did it go through
tools:
  - get_run
  - get_current_step
  - get_run_events
  - complete_step
capabilities:
  - runs:read
  - runs:write
---

# Resume after a disconnect

A request that timed out may still have landed. The run's journal says what
actually happened.

## When to use

A call to Pipes timed out or you restarted partway through a run.

## Steps

1. Call `get_run_events` with the run id and the last `seq` you saw (or none).
2. Find your last `step.completed` event. If it is there, your completion
   landed; do not send it again.
3. If it is not there, retry `complete_step` with the same
   `idempotencyKey`. Pipes recognises the key and never completes twice.
4. Call `get_current_step` and continue with the walk-a-run skill.

## Rules

- Never guess. The journal is the truth.
- A `start_run` that timed out is safe to retry with the same key; you get
  the same run back.

## Done when

You are working on the step the journal says is current.

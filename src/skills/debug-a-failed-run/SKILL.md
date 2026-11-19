---
name: debug-a-failed-run
version: 1.0.0
description: Find why a run failed or stalled, from its journal, and say what to change.
triggers:
  - run failed
  - why did it stop
  - stuck run
tools:
  - get_run
  - get_run_events
  - list_runs
  - get_workflow
  - add_comment
capabilities:
  - runs:read
  - systems:read
  - comments:write
---

# Debug a failed run

Every run keeps a journal of what happened, in order, with who did it. Start
from the journal, not from a guess.

## When to use

A run failed, was canceled by the rails, or has sat on one step too long.

## Steps

1. `get_run` for the status, `error`, `errorCode` and the step records.
2. `get_run_events` for the full journal. Find the last event before the
   failure and who caused it: a performer, a person, a schedule or the rails.
3. Name the cause in one of these buckets:
   - the step's instructions were unclear or wrong;
   - the performer reported the wrong outcome or a bad output;
   - a limit was too tight (`budget_steps`, `step_timeout`, `deadline_exceeded`);
   - a tool or connection failed;
   - a person rejected or canceled it.
4. Check whether it is a pattern: `list_runs` for the workflow and look for
   the same step failing.
5. Write it up with `add_comment` on the workflow: the run, the cause, the
   evidence (event numbers), and the one change you recommend.

## Rules

- Quote what the journal says. Do not infer what an agent "probably" did.
- Recommend a change to the workflow, not a new run, unless the cause was a
  one-off.

## Done when

The comment names the cause with evidence and one concrete change.

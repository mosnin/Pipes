---
name: walk-a-run
version: 1.0.0
description: Start a workflow run and carry it from the first step to the last, one step at a time.
triggers:
  - run a workflow
  - follow the workflow
  - start a run
tools:
  - list_workflows
  - get_workflow
  - start_run
  - get_current_step
  - complete_step
capabilities:
  - systems:read
  - runs:read
  - runs:write
---

# Walk a run

A Pipes workflow is the procedure your team agreed on. Your job is to follow
it, not to improve it mid-run. Pipes hands you one step at a time and records
everything you report.

## When to use

You were asked to do work that a workflow covers, or you were given a run id.

## Steps

1. Find the workflow with `list_workflows`. If you were given a run id, skip
   to step 3.
2. Call `start_run` with the workflow id, the input you were given, and an
   `idempotencyKey` unique to this job (for example `ticket-4812-start`).
3. Call `get_current_step`. Read, in this order: `instructions`, `doneWhen`,
   `memory`, `rails`, `suggestion`, `options`, then `previousOutputs`.
4. Do the step. Use only the connections and skills the step lists.
5. Report it with `complete_step` (see the report-a-step skill). Pass the
   `nodeId` you were given so you never complete a step you did not see.
6. Repeat from step 3 with the step `complete_step` returns, until the run's
   status is `completed`, `failed` or `canceled`.

## Rules

- One step at a time. Never complete a step you have not read.
- If the step is `waiting_approval`, stop and use the wait-for-approval skill.
- If Pipes refuses a completion, read the message before retrying. Use the
  recover-from-a-refusal skill.
- If you must stop before the end, use the hand-off-a-run skill.

## Done when

The run's status is final, and every step you completed has an output that
meets its `doneWhen`.

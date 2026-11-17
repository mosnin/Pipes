---
name: wait-for-approval
version: 1.0.0
description: Handle a step that a person has to approve, without guessing the answer or spinning.
triggers:
  - waiting_approval
  - awaiting_approval error
  - needs sign off
tools:
  - get_current_step
  - get_run
capabilities:
  - runs:read
---

# Wait for approval

Human approval steps are decided by a person in Pipes. No agent, and no
decision model, can approve or reject them.

## When to use

The run's status is `waiting_approval`, or a completion came back with
`awaiting_approval`.

## Steps

1. Tell whoever you are working for that the run is waiting on an approval,
   with the step title and the run link.
2. Stop working on this run. Do something else, or end your turn.
3. When you come back, call `get_current_step` once. If it moved on, continue
   with the walk-a-run skill.
4. If it was sent back to an earlier step, read the approver's comment in
   `previousOutputs` and the step record, then redo that step with the
   comment in mind.
5. If it was rejected, the run ends. Report that, with the approver's
   comment, to whoever you are working for.

## Rules

- Do not poll in a tight loop. Check back when you are asked, or on a
  schedule of minutes, not seconds.
- Never try to complete an approval step.

## Done when

The approval was decided and you acted on the result.

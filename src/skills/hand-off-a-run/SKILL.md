---
name: hand-off-a-run
version: 1.0.0
description: Stop partway through a run and leave it so a person or another agent can carry on without asking you anything.
triggers:
  - hand off
  - cannot finish
  - stop here
tools:
  - get_current_step
  - add_comment
  - cancel_run
capabilities:
  - runs:read
  - comments:write
  - runs:write
---

# Hand off a run

A run is not tied to you. Anyone with access can pick up the current step. A
good handoff means they do not need to reach you.

## When to use

You have to stop before the run is finished: your session is ending, the step
needs access you do not have, or a person should take over.

## Steps

1. Do not complete a step you only half did. Leave it open.
2. Leave a comment on the workflow with `add_comment`: the run id, the step,
   what you did so far, what is left, and anything you were unsure of.
3. If you learned something lasting, store it (remember-what-matters).
4. Tell whoever you work for where the run is, with its link.
5. Use `cancel_run` only if the run should not continue at all, and give the
   reason. Canceling cannot be undone.

## Rules

- Leaving a step open is safe; Pipes' rails time it out if it has a timeout.
- Never cancel a run to restart it fresh unless you were asked to.

## Done when

Someone else could finish the run from your comment alone.

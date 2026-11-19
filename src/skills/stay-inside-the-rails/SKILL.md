---
name: stay-inside-the-rails
version: 1.0.0
description: Read a step's limits before starting it, and plan the work so it finishes inside them.
triggers:
  - deadline
  - cost limit
  - output schema
tools:
  - get_current_step
capabilities:
  - runs:read
---

# Stay inside the rails

Rails are the limits a workflow puts on every run: a deadline, a step timeout,
allowed outcomes, an output contract, steps and cost remaining. Pipes enforces
them; you save time by planning for them.

## When to use

The step you were given has a `rails` object. Read it before starting.

## Steps

1. Note the step's timeout and the run's deadline. If the work cannot fit,
   say so in notes and report `failure` early rather than running out the
   clock.
2. Note `allowedOutcomes`. Only those will be accepted.
3. If there is an output schema, build your output to it from the start.
4. Check steps and cost remaining. If an expensive action would cross the
   cost limit, stop and ask a person first.
5. Report `costMicros` honestly on every completion that spent money.

## Rules

- A limit is a decision someone made. Do not split work across runs to get
  around one.
- If a limit looks wrong, finish inside it and leave a comment on the
  workflow with `add_comment`.

## Done when

The step completed without a rails refusal.

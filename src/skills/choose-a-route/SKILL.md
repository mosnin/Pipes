---
name: choose-a-route
version: 1.0.0
description: Pick where a run goes next when a step has more than one route, and use Pipes' suggestion well.
triggers:
  - several routes
  - choose_route error
  - which way next
tools:
  - get_current_step
  - complete_step
capabilities:
  - runs:read
  - runs:write
---

# Choose a route

Decision, Router and Condition steps branch. Each branch is a route with a
label, and the label is what you report.

## When to use

`get_current_step` returned more than one entry in `options`, or
`complete_step` answered with a `choose_route` error.

## Steps

1. Read every option's `label`, `routeKind` and target step. The labels are
   the vocabulary for this decision.
2. If the step has a `suggestion`, read its label, confidence and reason. It
   comes from Pipes' decision model and is a starting point, not an order.
3. Decide from the step's instructions and the evidence in front of you.
4. Call `complete_step` with `outcome` set to the route label exactly as
   written, or `next` set to the option's `pipeId`.
5. If you got `choose_route` back, Pipes could not match your outcome. The
   message names the route it thinks you meant. Confirm it is right, then
   pass that `next`.

## Rules

- Never invent a label. If no route fits, report `failure` with notes saying
  why, so a person can add the missing route.
- Disagreeing with a suggestion is fine. Your choice is recorded and used to
  measure how often the suggestion is right, so say why in `notes`.
- A step marked "Route chosen by Pipes" was already decided; you will not see it.

## Done when

The run moved down the route you meant, and your notes explain a choice that
went against the suggestion.

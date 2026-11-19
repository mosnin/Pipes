---
name: review-a-run
version: 1.0.0
description: Check a finished run step by step against each finish line and leave a short verdict.
triggers:
  - review the run
  - did it do it right
  - audit a run
tools:
  - get_run
  - get_workflow
  - add_comment
capabilities:
  - runs:read
  - systems:read
  - comments:write
---

# Review a run

A run that completed is not the same as a run that did the job. A review
checks the outputs, not just the status.

## When to use

You were asked to check a run, or a workflow asks for review after it ends.

## Steps

1. `get_workflow` for each step's `doneWhen`.
2. `get_run` for each step's output, notes and outcome. Note any finish line
   Pipes flagged as not met or unclear.
3. For each step, decide: met, not met, or cannot tell from the record.
4. Check the route choices: where Pipes suggested a route and a different one
   was taken, was the choice right?
5. Leave one comment with `add_comment`: an overall verdict, the steps that
   fell short with why, and anything worth adding to memory or instructions.

## Rules

- Judge against the step's own `doneWhen`, not your taste.
- "Cannot tell" is a finding. It usually means the step's output should
  carry more.

## Done when

Each step has a verdict and the comment says what to change, if anything.

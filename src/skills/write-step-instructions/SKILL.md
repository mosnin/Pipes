---
name: write-step-instructions
version: 1.0.0
description: Write step instructions and a finish line that an agent new to the job can follow and a reviewer can check.
triggers:
  - write instructions
  - done when
  - improve a step
tools:
  - get_workflow
  - add_comment
capabilities:
  - systems:read
  - comments:write
---

# Write step instructions

Instructions tell a performer what to do. The finish line (`doneWhen`) tells
everyone when it is done. Pipes can check completions against the finish
line, so it has to be checkable.

## When to use

You are drafting a workflow, or a run review found a step that was unclear.

## Steps

1. Open with the outcome in one sentence: "Refund the customer if the order
   arrived damaged."
2. List the inputs the step can rely on, and where they come from (the run
   input, a previous step's output field).
3. Give the procedure in at most five numbered actions. Name the tool or
   connection for each.
4. State the edge cases you know: what to do when information is missing,
   when to report failure.
5. Write `doneWhen` as something visible in the output: "The output has a
   refundId and the amount refunded." Not "the customer is happy".
6. If the step branches, say in the instructions what each route label means.

## Rules

- Write for someone competent who has never seen this process.
- No hedging words like "try to" or "if possible". Say what to do when it is
  not possible.
- Keep it under 200 words. Long instructions belong in a linked document.

## Done when

Another performer could do the step from the text alone, and a reviewer could
tell from the output whether `doneWhen` was met.

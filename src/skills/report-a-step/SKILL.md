---
name: report-a-step
version: 1.0.0
description: Complete a step with an output the next step can use, notes a person can read, and nothing that will be refused.
triggers:
  - complete the step
  - report the result
  - what to put in output
tools:
  - complete_step
capabilities:
  - runs:write
---

# Report a step

What you report is the record. The next step reads your `output`, a person
reviewing the run reads your `notes`, and Pipes checks both against the step's
rules.

## When to use

You finished the work a step asked for, or you know it cannot be done.

## Steps

1. Check the work against `doneWhen`. If it is not met, either keep working
   or report `failure`; do not report success on a hope.
2. Build `output` as JSON when you can: the facts the next step needs, named
   plainly (`{ "refundId": "re_123", "amount": 4200 }`). If the step has an
   output schema under `rails`, match it exactly.
3. Write `notes` for a person: what you did, anything surprising, anything
   you were unsure of. Two or three sentences.
4. Choose `outcome`: `success`, `failure`, `retry` (loops only), or a route
   label. If `rails.allowedOutcomes` is set, use one of those.
5. Add `costMicros` if the step spent money (1,000,000 is one dollar).
6. Add `remember` for anything later runs should know (see the
   remember-what-matters skill).
7. Send an `idempotencyKey` unique to this completion, and reuse it only to
   retry this same completion.

## Rules

- Never put secrets in output, notes or remember.
- Do not paste whole documents into output. Link or summarize.
- If Pipes flags the finish line as "not met" after you complete, read the
  reason. It does not block the run, but a reviewer will see it.

## Done when

`complete_step` succeeded and returned the next step, or the run finished.

---
name: remember-what-matters
version: 1.0.0
description: Decide what a later run should know, store it as a clean fact with a key, and correct facts that stopped being true.
triggers:
  - remember this
  - next time
  - learned something
tools:
  - search_memory
  - remember
  - forget_memory
  - complete_step
capabilities:
  - memory:read
  - memory:write
---

# Remember what matters

Workflow memory is shared by every agent and person who runs the workflow.
Good facts save the next run a question; bad ones mislead it for months.

## When to use

You found out something that will still be true on the next run: a
preference, a quirk of a tool, an owner, a rule nobody wrote down.

## Steps

1. Check it is not already known: read the step's `memory`, or
   `search_memory` with a few words.
2. Write it as one sentence that stands on its own: "Acme pays invoices by
   bank transfer, not card." Not "they prefer transfer" and not "I am on
   step 3".
3. Give it a `key` when it answers a question that can change
   (`acme-payment-method`). A newer fact with the same key replaces the old
   one and keeps the old one in history.
4. Scope it to the workflow by default. Use `scope: "workspace"` only for
   facts every workflow needs.
5. Pass it in `remember` on `complete_step`, so it is tied to the step that
   taught it. Use the `remember` tool only outside a step.
6. If a fact in `memory` turned out to be wrong, remember the right one with
   the same key, or `forget_memory` with a reason if there is no right one.

## Rules

- Never store secrets, tokens or personal data beyond what the workflow
  already holds. Pipes refuses anything that looks like a credential.
- One fact per item. Split "A and B" into two.
- Do not store what the run itself records: outputs, outcomes, timings.

## Done when

The next performer of a matching step will be handed the fact, and nothing
you stored is a guess.

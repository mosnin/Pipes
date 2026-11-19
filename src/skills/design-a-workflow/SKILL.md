---
name: design-a-workflow
version: 1.0.0
description: Turn a process someone describes into a Pipes workflow draft, starting from the closest template.
triggers:
  - make a workflow
  - turn this into a process
  - new workflow
tools:
  - list_templates
  - create_workflow_from_template
  - export_workflow
  - add_comment
capabilities:
  - templates:read
  - templates:instantiate
  - schema:read
  - comments:write
---

# Design a workflow

A good workflow is the smallest set of steps that someone new could follow
and get the right result. Start from a template, then shape it.

## When to use

Someone describes a process they want agents to follow and there is no
workflow for it yet.

## Steps

1. Write the process as a numbered list first: who does what, where it can
   branch, where a person must sign off, and what done means overall.
2. `list_templates` and pick the closest match by shape, not by name.
3. `create_workflow_from_template` with a plain name ("Refund requests").
4. `export_workflow` to see its steps, then compare with your list.
5. Leave a comment with `add_comment` listing the changes to make in the
   editor: steps to add or remove, route labels, approvals, and instructions
   and finish lines for each step (write-step-instructions helps).
6. Hand the link to the person who asked, so they can review and publish.

## Rules

- Put a human approval before anything that leaves the building: money,
  messages to customers, deletions.
- Name routes by what happened ("Refund approved"), not by the next step.
- Fewer steps is better. Merge steps one performer would always do together.

## Done when

A draft exists, and the comment lists every change it needs to match the
process.

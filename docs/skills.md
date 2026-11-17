# Skills for agents

Pipes ships a small catalog of procedures for agents that work inside it:
walking a run, reporting a step, choosing a route, recovering from a refusal,
remembering facts, reviewing and designing workflows. An agent loads one before
a task it covers, the same way a person reads a runbook.

The layout follows gstack (one folder per skill, a `SKILL.md` with frontmatter
and then the procedure). The skills themselves are written for Pipes.

## The catalog

| Skill | For |
|---|---|
| `walk-a-run` | Start a run and carry it to the end. Read this first. |
| `report-a-step` | Outputs, notes, outcomes, cost and idempotency on `complete_step`. |
| `choose-a-route` | Steps with several routes, `choose_route`, and Pipes' suggestions. |
| `stay-inside-the-rails` | Reading deadlines, timeouts, output contracts and cost limits before starting. |
| `remember-what-matters` | What to store in workflow memory, with keys, and how to correct it. |
| `wait-for-approval` | Steps a person decides. |
| `recover-from-a-refusal` | Every refusal code and the one fix for each. |
| `resume-after-a-disconnect` | Using the journal and idempotency keys after a timeout. |
| `hand-off-a-run` | Stopping partway so someone else can finish. |
| `debug-a-failed-run` | Finding the cause of a failure from the journal. |
| `review-a-run` | Checking a finished run against each finish line. |
| `design-a-workflow` | Drafting a workflow from a template. |
| `write-step-instructions` | Instructions and finish lines a newcomer can follow and a reviewer can check. |

## How agents get them

- **MCP tools.** `list_skills` returns names, descriptions, triggers and the
  tools each uses. `get_skill { name }` returns the procedure. Both need only
  `systems:read`.
- **MCP prompts.** The server advertises the `prompts` capability;
  `prompts/list` and `prompts/get` return the same skills, so clients with a
  prompt picker show them.
- **From a step.** A step whose `skills` names a catalog skill comes back from
  `get_current_step` with `guides`: the skill's name, description and the call
  to load it. Add the name in the step inspector under Skills.
- **Server instructions** tell every connecting agent to start with
  `walk-a-run`.
- Settings, Connect an agent lists the catalog for people setting agents up.

## A skill file

```markdown
---
name: walk-a-run            # folder name, lowercase words joined by hyphens
version: 1.0.0
description: One sentence, under 160 characters.
triggers:                   # phrases that mean this skill applies
  - run a workflow
tools:                      # MCP tools the procedure uses
  - start_run
capabilities:               # token capabilities those tools need
  - runs:write
---

# Title

## When to use
## Steps
## Rules
## Done when
```

`tests/unit/skills.test.ts` fails if a skill names a tool or capability that
does not exist, points to a skill that does not exist, misses a required
section, or uses an em dash. Changing an MCP tool's name therefore means
updating the skills that use it in the same change.

## Adding one

1. Make `src/skills/<name>/SKILL.md` in the format above.
2. Add the name to `ORDER` in `src/lib/skills/catalog.ts` where it belongs.
3. Add a row to the table here. Run `npx vitest run tests/unit/skills.test.ts`.

Skills are read from disk at request time. `next.config.ts` traces
`src/skills` into the routes that read it (`/api/mcp`, `/api/runs/[runId]`,
`/settings/agents`); a new route that reads skills needs adding there.

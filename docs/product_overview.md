# Product overview

Pipes is where teams design, store and version the workflows and loops their
agents follow, and where agents run them.

Pipes does not execute steps itself. It holds the workflow, hands the current
step to whoever is running it (an agent over MCP, or a person in the app),
records what came back, and decides where the run goes next.

## Workflows

- Built in a visual editor from typed steps: agent steps, tools, models,
  prompts, memory, human approvals, loops, conditions and routers, joined by
  pipes. The canonical format is `pipes_schema_v1`.
- Each step can carry a step spec (`StepSpec` in `src/domain/runs/types.ts`):
  instructions, a done-when line, skills, connections, an iteration limit and
  exit condition for loops, and an approver role for approvals.
- Validation flags disconnected and unreachable steps, incompatible pipes and
  cycles outside a loop step. Simulation walks a path through the graph.
- Versions, comments, archive and restore, tags and favorites.
- Starter templates, and import and export as `pipes_schema_v1`.
- AI drafting and edit suggestions (Builder plan), always reviewed before
  they are applied.

## Runs

- A run freezes the workflow as it was when it started, so later edits never
  change a run in progress. It records every step taken, its outcome, output,
  notes and who performed it.
- Agents run workflows over the MCP server at `/api/mcp`
  (see [mcp.md](mcp.md)): `start_run`, do the step, `complete_step`, repeat
  until the run is `completed` or `failed`.
- Loops take their exit route when they reach their iteration limit.
- A human approval step sets the run to `waiting_approval` until a person
  approves, rejects or sends it back from the Approvals inbox.
- Run history is kept per workflow and per version.

## Triggers and connections

- Inbound webhook per workflow: `POST /api/hooks/{systemId}` with the
  workflow's key in `x-pipes-key`; the body becomes the run's input.
- Cron schedules, fired by `GET /api/cron/schedules` with
  `Authorization: Bearer $CRON_SECRET`.
- Signed outbound run events (`run.started`, `run.completed`, `run.failed`,
  `run.canceled`, `approval.requested`) with
  `x-pipes-signature: sha256=HMAC(secret, timestamp.body)`.
- Connections: MCP servers, HTTP APIs and skills that steps use, with
  secrets encrypted at rest. Step payloads include connection headers only
  for tokens with the `connections:secrets` capability.

## Access

- MCP with OAuth 2.1 (dynamic client registration, PKCE) or API tokens with
  scoped capabilities and an optional single-workflow scope.
- A REST API for reading and editing workflows (see [protocol.md](protocol.md)).
- Workspace members with roles, invites, and an audit log with filtering and
  CSV export.

## Plans and usage

Plans are per workspace (`src/domain/templates/plans.ts`):

| | Free | Pro | Builder |
| --- | --- | --- | --- |
| Workflows | 3 | 25 | 250 |
| Shared editing, version history | no | yes | yes |
| API and MCP access | no | yes | yes |
| AI drafting | no | no | yes |

Usage is metered (`src/domain/usage/service.ts`): runs started, steps
completed, and API, MCP and webhook calls. Each plan includes a monthly
allowance (`MONTHLY_INCLUDED`). Free stops starting new runs once its runs
are used, until the next month. Pro and Builder keep running and bill usage
past the allowance at `OVERAGE_CENTS`.

## Internal surfaces

- `/admin`, `/admin/insights`, `/admin/issues`, `/admin/release` for
  operators listed in `PIPES_ADMIN_ALLOWLIST`.
- `/settings/feedback` for structured feedback from workspace members.

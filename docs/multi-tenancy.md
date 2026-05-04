# Multi-tenancy

The tenant boundary is the workspace. Every workspace is a wall. Code on
the inside of the wall reads and writes only the rows tagged with its
`workspaceId`. Code on the outside of the wall sees nothing.

## What a tenant is

- A `workspace` is the unit of isolation. A workspace owns systems,
  members, plan state, agent tokens, audit events.
- A `user` may belong to many workspaces. A request always resolves to
  exactly one `(userId, workspaceId, role)` triple via
  `getServerApp()` -> `repositories.users.provision()`.
- The active `workspaceId` is the membership the user opened. There is
  no "personal" data store; everything the user creates lives inside a
  workspace.

## Storage isolation

- Every Convex query filters by `workspaceId` at the index level. See
  `convex/app.ts` and the `by_workspace` indexes on `systems`,
  `audit_events`, `feedback_items`, `agent_runner_metrics`, etc.
- The `AccessService` (`src/domain/services/bounded.ts`) is the single
  authorization gate. It is consulted before every write through
  `services.access.ensureCanEdit(ctx)`.
- The mock repository mirrors the same invariant. Every list/find takes
  a `workspaceId` and filters in-memory. Cross-tenant reads in dev would
  fail the same tests they fail in prod.

## Compute isolation

- The Modal endpoint that runs the agent is a single shared deployment
  for v1. Inputs are scoped to the requesting workspace; the runner
  receives `systemId`, `prompt`, `conversationId`, and personalization
  fields - never another workspace's data.
- Per-tenant deploy is a future option for sensitive customers. We will
  parameterize `MODAL_EXECUTOR_URL` per workspace and bind via plan
  state when we ship it.

## Network isolation

- Clerk session cookies are per-user. They identify which user is
  acting; the workspace is resolved server-side from membership.
- Agent tokens (`ptk_...`) are per-workspace. The hash is stored
  (`agent_tokens.tokenHash`); the plaintext is shown once at creation
  and never persisted.
- The MCP endpoint at `/api/protocol/mcp` validates the bearer token,
  attaches the resolved workspace, and runs every capability check
  against that workspace only. See `src/lib/protocol/auth.ts`.

## Threat model

| Threat | Mitigation |
| --- | --- |
| Cross-tenant read via direct Convex query | Every Convex query filters by workspaceId at the index. Lint catches collect() without an index. |
| Cross-tenant write via crafted body | Routes parse with Zod, then look up the target system and confirm `system.workspaceId === ctx.workspaceId` before any write. See `src/app/api/agent/build/route.ts:259`. |
| Cross-tenant via agent token | Tokens are hashed; the lookup returns the workspace the token was minted for. Capability check rejects access to other workspaces. |
| Cross-tenant via shared agent runtime | The Modal runner is stateless. Each call carries only the calling workspace's context. No memoization across calls. |
| Cross-tenant via metrics samples | Metrics samples in `metrics_samples` are anonymized: only `userId` is in tags, never workspace-scoped business data. The metrics dashboard is admin-only. |
| Replay attack on agent token | Tokens are bearer credentials; revocation is immediate via `agent_tokens.revokedAt`. Rotate on suspicion. |
| Privilege escalation within a workspace | Roles are enforced by `AccessService`. Editor cannot mutate plan state; Commenter cannot edit graph; Viewer cannot comment. |

## Test plan

A workspace-isolation smoke test confirms the wall holds:

1. Provision two users `a@test`, `b@test`. Each gets their own workspace
   `wks_a` and `wks_b` via `provisionUser`.
2. User A creates a system `sys_a` in `wks_a` and adds two nodes.
3. User B authenticates and tries to:
   - GET `/api/systems/sys_a` -> 403.
   - POST `/api/agent/build` with `systemId: sys_a` -> 403
     (current route returns "System not found in this workspace").
   - Mint an agent token for `sys_a` via direct Convex mutation -> 403
     because their `ctx.workspaceId` is `wks_b`.
4. The system bundle returned to user B's editor contains only systems
   from `wks_b`.

The smoke test lives at `tests/unit/multi-tenancy.test.ts` (planned;
currently exercised piecewise across `agent-build-route.test.ts`,
`admin-access.test.ts`, and `governance-rules.test.ts`).

## What we deliberately do not isolate (yet)

- The Modal compute pool. v1 ships shared compute. Per-tenant pools are
  optional for enterprise customers; the trigger is a signed contract,
  not a hunch.
- The OpenAI / Anthropic API key. We use a single org key; per-tenant
  keys are a future option for customers who want their own provider
  spend.
- The Sentry project. Errors from all workspaces flow into one project.
  PII is filtered before send; workspace context is added as a tag for
  triage but never leaks user content.

## Definition of done for "tenant safe"

- A new feature ships only when:
  - Every read filters by `workspaceId`.
  - Every write checks `services.access.*` before mutating.
  - A unit test confirms a foreign workspace gets a 403.
  - The audit event names the workspace, the user, and the action.

If those four lines do not exist, the feature is not tenant safe and
does not ship.

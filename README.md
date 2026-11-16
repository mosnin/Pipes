# Pipes

Pipes is where teams design, store and version the workflows and loops their
agents follow, and where agents run them. A workflow is a graph of steps
(agent steps, tools, human approvals, loops, conditions and routers). An agent
connects over MCP, starts a run and walks it one step at a time; Pipes holds
the procedure and the state, the agent does the work.

Next.js 16 (App Router) with Convex for storage, plus a mock mode for local
work.

## Features

- **Visual editor.** Step types include agent steps, tools, human approvals,
  loops with iteration limits, and conditions and routers. Each step carries
  instructions, a done-when line, skills and connections
  (`StepSpec` in `src/domain/runs/types.ts`).
- **Runs over MCP.** An MCP server at `/api/mcp` (Streamable HTTP, OAuth 2.1
  or API tokens) with `list_workflows`, `get_workflow`, `start_run`,
  `get_current_step`, `complete_step`, `get_run`, `list_runs`, `cancel_run`
  and a few template, export and comment tools (`src/lib/mcp/tools.ts`).
- **Human approvals.** An approval step pauses the run until a person
  approves, rejects or sends it back from the Approvals inbox.
- **Triggers.** An inbound webhook per workflow, cron schedules and signed
  outbound run events (`src/domain/triggers`).
- **Connections.** MCP servers, HTTP APIs and skills that steps use, with
  secrets encrypted at rest (`src/domain/connections`).
- **History.** Versions, run history per workflow and version, comments and
  an audit log.
- **Templates and portability.** Starter templates, and import and export as
  `pipes_schema_v1`.
- **Usage and plans.** Runs, steps and calls are metered against monthly
  allowances (`src/domain/usage/service.ts`). Plans live in
  `src/domain/templates/plans.ts`: API and MCP access start on Pro, AI
  drafting is on Builder. Free stops new runs once its monthly runs are used;
  paid plans keep running and bill overage.
- **Workspaces.** Members and roles, invites, and API tokens with scoped
  capabilities.

## Run it

### Mock mode

No external services. Data lives in a local file, `.pipes-db.json` by default (`PIPES_MOCK_DB_FILE` moves it).

```bash
cp .env.example .env.local   # PIPES_USE_MOCKS=true, NEXT_PUBLIC_PIPES_USE_MOCKS=true
npm install
npm run dev
```

### Real mode

Everything is stored in Convex, with first-party email and password accounts.

```bash
cp .env.example .env.local
# PIPES_USE_MOCKS=false
# NEXT_PUBLIC_PIPES_USE_MOCKS=false
# PIPES_SESSION_SECRET=<32+ random characters>
# PIPES_CONVEX_SERVER_KEY=<32+ random characters>
npx convex env set PIPES_CONVEX_SERVER_KEY <the same value>
npm install
npx convex dev   # first run creates a deployment and writes CONVEX_URL; keep it running
npm run dev
```

No Convex account? `CONVEX_AGENT_MODE=anonymous npx convex dev` runs a local
backend on http://127.0.0.1:3210. Set `CONVEX_URL` to the deployment URL.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PIPES_USE_MOCKS`, `NEXT_PUBLIC_PIPES_USE_MOCKS` | `true` for mock mode, `false` for real mode |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app |
| `CONVEX_URL`, `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT` | Convex deployment |
| `PIPES_CONVEX_SERVER_KEY` | Shared secret between the server and Convex; set it on both |
| `PIPES_SESSION_SECRET` | Signs sessions; required for real sign-in in production |
| `PIPES_ENCRYPTION_KEY` | Encrypts connection secrets (falls back to a key derived from `PIPES_SESSION_SECRET`) |
| `CRON_SECRET` | Bearer secret for `GET /api/cron/schedules`; call it every minute or few |
| `PIPES_ADMIN_ALLOWLIST` | Emails allowed into the internal `/admin` pages |
| `AUTH0_*` | Optional: sign in with Auth0 instead of passwords |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional: AI drafting |
| `CREEM_*` | Optional: billing |
| `RESEND_API_KEY` | Optional: email |

See `.env.example` for the full list.

## Testing

```bash
npm run lint
npm run typecheck
npm run test          # unit tests (vitest, tests/unit)
npm run test:e2e      # end-to-end tests (playwright, tests/e2e)
```

Smoke tests against a running server in real mode:

```bash
# two accounts walking the main user journeys over HTTP; the second line also exercises paid-plan paths
BASE_URL=http://localhost:3000 node scripts/smoke-provider.mjs
SMOKE_UPGRADE_WITH_CONVEX=1 BASE_URL=http://localhost:3000 node scripts/smoke-provider.mjs

# workflows end to end: step specs, runs over MCP, approvals, connections,
# webhooks, cron, OAuth and usage (start the server with CRON_SECRET set)
BASE_URL=http://localhost:3000 CRON_SECRET=... node scripts/smoke-workflow.mjs
```

## Docs

- `docs/mcp.md`: the MCP server, authentication and the run loop
- `docs/protocol.md`: the REST API, tokens, idempotency and rate limits
- `docs/errors.md`: REST error codes
- `docs/openapi/protocol.json`: OpenAPI description of the REST routes
- `docs/product_overview.md`: what Pipes does today
- `docs/architecture.md`, `docs/domain_model.md`: how it is built
- `docs/local_development.md`: running locally
- `docs/DESIGN_LANGUAGE.md` and `anti-slop.md`: the design rules every UI change follows

## Deploying

The repo deploys to Vercel as a Next.js app (`vercel.json`). Build with
`npm run build`; run `npx convex deploy` for the Convex functions.

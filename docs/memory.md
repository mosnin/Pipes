# Agent memory

A workflow forgets everything between runs unless someone writes it into the
instructions. Memory fixes that for the small things: the customer who wants
invoices in euros, the tool that times out on Sundays, the reviewer who always
asks for a screenshot. An agent or person writes a fact once and every later
performer of a matching step is handed it.

It borrows two ideas and leaves the rest:

- From temporal knowledge graphs (Graphiti): facts carry when they became true
  and when they stopped, and a newer fact replaces an older one instead of
  overwriting it. Nothing is erased.
- From agent brains (gbrain): every fact keeps where it came from, so a person
  can see which run taught it and decide whether to trust it.

There is no graph database, embedding index or model call. Facts are short,
per workflow, and ranked by shared words, which is enough at this size and
costs nothing to run.

## Scopes

Every fact has one of three scopes. Which one a request reaches is decided on
the server from who is signed in, never from what the request asks for.

| Scope | Who can see it | Who can write it |
|---|---|---|
| `private` | Only the person who saved it, in this workspace. No role can read another member's private memory, not even the Owner. | Any member, for themselves. |
| `team` | Everyone in the workspace. | Editors and above. |
| `workflow` | Everyone in the workspace, given to that workflow's steps. | Editors and above. |

- An agent token acts for the person who made it. It reaches that person's
  private memory only with the `memory:private` capability, which is never
  implied by any other capability (see [mcp.md](mcp.md)). Webhook and
  schedule triggers have no person behind them and never see private memory.
- A private fact's id answers "not found" to anyone else, so ids reveal
  nothing.
- A step's performer gets matching facts from the workflow, the team and
  their own private memory.
- People can erase all their private memories in a workspace (Memory page,
  or `DELETE /api/account/memory`). This is a real delete, history included,
  in Pipes and in Supermemory.

## A fact

| Field | Meaning |
|---|---|
| `text` | One sentence, up to 500 characters. |
| `key` | Optional. Facts with the same key in the same scope replace each other, so `acme-invoice-currency` can only have one current answer. |
| scope | One workflow, or every workflow in the workspace. |
| source | Who taught it (agent, person or a run step), the step's title and the run id. |
| `validAt` | When it was remembered. |
| `invalidAt`, `invalidReason` | When and why it stopped holding: replaced by a newer fact, or forgotten. |
| `supersedes`, `supersededBy` | The chain of facts with the same key. |

Rules, in `src/domain/memory/service.ts`:

- The same sentence twice (ignoring case and spacing) returns the existing fact.
- A fact that looks like a credential (API keys, tokens, private keys, bearer
  headers) is refused with `looks_secret`. Memory is shown to every performer;
  secrets belong in a connection.
- A scope holds at most 500 current facts (`memory_full`). Keys keep it small.
- Forgetting marks a fact invalid with a reason. It stays in the history.

## How performers get it

`get_current_step` (MCP) and `GET /api/runs/{id}` include `memory`: up to five
current facts that share words with the step's title, instructions and finish
line, rarer words counting more and newer facts breaking ties. When nothing
matches, the five newest facts for the workflow. The run page shows them under
"What this workflow remembers".

Facts are read when the step is handed out, not frozen into the run, so a fact
corrected mid-run reaches the next step.

## How facts get in

- **On completion.** `complete_step` and `POST /api/runs/{id}/complete` accept
  `remember: ["fact", { "text": "fact", "key": "k", "scope": "workspace" }]`,
  up to ten. Each comes back under `remembered` with `ok` and the fact id or
  the reason it was refused. A refused fact never undoes the completion. The
  source is the step just completed. Over MCP this needs `memory:write`.
- **Directly.** The MCP `remember` tool, or Memory in the workflow editor
  (`/systems/{id}/memory`).

## Reading and forgetting

| Surface | What |
|---|---|
| MCP `search_memory { systemId?, query?, limit? }` | Current facts, best match first (`memory:read`). |
| MCP `forget_memory { factId, reason? }` | Marks a fact invalid (`memory:write`). |
| `GET /api/systems/{id}/memory?q=` | Current facts and the history. |
| `POST /api/systems/{id}/memory` | `{ text, key?, scope? }`, as a person (Editor and up). |
| `DELETE /api/systems/{id}/memory?factId=&reason=` | Forget (Editor and up). |

Writes count against a token's write limit like run changes do.

## Storage and recall

Pipes' own `memory_fact` records are the source of truth: every fact, its
scope, its owner, its source and its history. Private facts are filed under
their owner (`refId` `private:{userId}`), team facts under `workspace`, and
workflow facts under the workflow id. Both backends (mock and Convex) work
unchanged.

Search by meaning goes through a recall provider (`src/domain/memory/recall.ts`):

- **local** (default): ranks the records by shared words. No network. Used in
  mock mode, tests, and whenever Supermemory is not configured.
- **supermemory**: each fact is also sent to [Supermemory](https://supermemory.ai)
  and searched there, so "who handles refunds?" finds "Refunds go to finance".

How Supermemory is used:

- One namespace per workspace for team and workflow facts,
  `pipes:{env}:ws:{workspaceId}`, and one per person per workspace for private
  facts, `pipes:{env}:ws:{workspaceId}:u:{userId}`. `{env}` is prod, preview or
  dev, so test data never sits next to real data. Only `namespaceFor` builds a
  namespace, and it refuses ids that could add a level.
- A search covers the caller's own private namespace and the team's, never
  anyone else's.
- **Every hit is joined back to the facts the caller may see in Pipes'
  records before it is returned.** A provider bug or misconfiguration cannot
  show one person's private fact to another; the tests prove it with a
  provider that deliberately leaks.
- Only ids and the key are sent as metadata: never names, emails, run
  payloads or anything `looksSecret` refuses.
- Writes happen after Pipes has stored the fact. A failed write never fails
  the request: it goes to a `memory_outbox` and the rails cron retries it.
  Replaced and forgotten facts are deleted from Supermemory; Pipes keeps
  their history. Erasing private memory deletes the person's namespace.
- If Supermemory is slow or down, search falls back to local ranking, and
  facts from the last minute are merged in while Supermemory processes them.

| Variable | Meaning |
|---|---|
| `PIPES_MEMORY_PROVIDER` | `local` (default) or `supermemory`. |
| `SUPERMEMORY_API_KEY` | Server-side only. Never sent to browsers or agents. |
| `SUPERMEMORY_BASE_URL` | The Cloudflare memory gateway's URL, when using it. |
| `PIPES_MEMORY_GATEWAY_SECRET` | Shared with the gateway, for signing requests. |

## Cloudflare

Supermemory runs on Cloudflare already; its engine is closed source and
cannot be self-hosted on Workers, D1 or Vectorize. Pipes therefore uses the
hosted API, optionally through its own Worker, `cloudflare/memory-gateway`:

- The Supermemory key lives in the Worker as a secret, not on Vercel. Pipes
  holds only a signing secret.
- Pipes signs each request (HMAC-SHA256 over method, path and a 60-second
  expiry). The Worker refuses unsigned, expired or altered requests, any
  operation Pipes does not use, and any namespace that is not a Pipes
  namespace for its own environment.
- Every call is recorded in D1 (`memory_calls`: time, operation, namespace,
  private or not, status), never the content or the query.

To deploy it (needs a person with the Cloudflare and Supermemory accounts):

1. `cd cloudflare/memory-gateway`, `wrangler d1 create pipes-memory-audit`,
   put the id in `wrangler.toml`, then
   `wrangler d1 execute pipes-memory-audit --remote --file schema.sql`.
2. `wrangler secret put SUPERMEMORY_API_KEY` and
   `wrangler secret put PIPES_MEMORY_GATEWAY_SECRET` (a long random value).
3. Set `PIPES_ENV` in `wrangler.toml` (prod, preview or dev) and
   `wrangler deploy`.
4. On Vercel: `PIPES_MEMORY_PROVIDER=supermemory`,
   `SUPERMEMORY_BASE_URL=<worker URL>`, `PIPES_MEMORY_GATEWAY_SECRET=<same value>`,
   and no `SUPERMEMORY_API_KEY`.

Without the gateway, set `SUPERMEMORY_API_KEY` on Vercel instead. Use a
separate Supermemory organization for production and for everything else.

## Not built yet

- Facts drawn out of run outputs automatically. Today a performer has to say
  what to remember; nothing is inferred.
- Per-person Supermemory scoped keys, which would add a wall at
  Supermemory's side between namespaces and lift its 500 requests a minute
  per key limit.
- Supermemory profiles (a short summary of what a team or person usually
  needs) as a preamble for performers.
- Counting how often a fact is used, to retire ones nobody reads.

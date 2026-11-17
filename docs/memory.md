# Workflow memory

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

## Storage

Facts are `memory_fact` documents in the shared documents store, `refId` set to
the workflow id or `workspace`. Both backends (mock and Convex) work unchanged.

## Not built yet

- Facts drawn out of run outputs automatically. Today a performer has to say
  what to remember; nothing is inferred.
- Semantic search. Word overlap misses synonyms; an embedding pass can sit
  behind `rank` without changing the contract.
- Counting how often a fact is used, to retire ones nobody reads.

# agents/

The Modal-sandboxed runner that turns one sentence into a Pipes graph. The Next.js route at `/api/agent/build` (Phase 3) forwards the user's prompt here. This service streams Server-Sent Events back to the editor, which applies each tool result to the canvas through the same optimistic queue manual edits use.

## What this is

- A FastAPI app, exposed by Modal at one HTTPS endpoint, that streams `text/event-stream` per `docs/agent-contract.md`.
- A model-agnostic agent with exactly 5 tools: `add_node`, `add_pipe`, `update_node`, `delete_node`, `validate`. The default provider is OpenAI's Agents SDK; Anthropic is a flag-flip away (see "Multi-provider" below).
- A 30-tool-call hard cap and a 60-second wall-clock cap per turn.
- A plan-first turn shape: every turn emits a `message` event with the agent's plan paragraph BEFORE any tool call.
- Two deterministic eval gates: `evaluate_plan` runs on the plan paragraph; `evaluate_action` runs on every tool call. Both live in `plan_evaluator.py`.
- No warm pools in v1. Cold starts are accepted.

## Install

```bash
cd /path/to/Pipes
pip install -r agents/requirements.txt
```

Or with `uv`:

```bash
uv pip install -e agents/
```

Python 3.11 or newer is required. Modal recommends 3.11 for current images and the SDK uses modern type syntax.

## Locked dependency versions

| Package | Min version | Why |
| --- | --- | --- |
| `python` | 3.11 | Modern type syntax. Modal default image. |
| `modal` | 0.66 | Stable ASGI streaming. |
| `openai-agents` | 0.0.18 | Function-tool decorator and streaming Runner. The 0.x line is API-volatile; pin a minimum and re-test on each bump. |
| `openai` | 1.40.0 | Required by `openai-agents` for tool-call streaming. |
| `anthropic` | 0.39 | Optional second provider. Used only when `provider=anthropic`. |
| `pydantic` | 2.0 | Strict argument validation. |
| `httpx` | 0.27 | Streaming HTTP for the Modal endpoint. |
| `sse-starlette` | 2.1 | Imported defensively; the active framing is hand-rolled. |
| `fastapi` | 0.115 | The ASGI app Modal serves. |

No new external deps were added in the audit. The eval gates are pure Python.

## Configure secrets

Modal pulls a single secret named `pipes-agent-secrets` containing `OPENAI_API_KEY` and, optionally, `ANTHROPIC_API_KEY`:

```bash
modal secret create pipes-agent-secrets \
  OPENAI_API_KEY=sk-... \
  ANTHROPIC_API_KEY=sk-ant-...
```

`ANTHROPIC_API_KEY` is only required when the provider is Anthropic. Leaving it unset still ships a working OpenAI deploy.

See https://modal.com/docs/guide/secrets for the latest CLI surface.

## Multi-provider

The runner supports two providers behind a single env var. The default is OpenAI; existing callers see no behavior change.

| Env var | Purpose |
| --- | --- |
| `PIPES_AGENT_PROVIDER` | Deploy-wide default. `openai` (default) or `anthropic`. |
| `OPENAI_AGENTS_MODEL` | OpenAI model id. Default `gpt-4o-mini`. |
| `ANTHROPIC_AGENTS_MODEL` | Anthropic model id. Default `claude-haiku-4-5-20251001`. Set to `claude-sonnet-4-6` for stronger reasoning. |
| `OPENAI_API_KEY` | Required when provider is OpenAI. |
| `ANTHROPIC_API_KEY` | Required when provider is Anthropic. |

Per-request override: the `BuildRequest` body accepts `provider: "openai" | "anthropic"`. When set, it wins over the env var. Order of precedence:

1. `BuildRequest.provider` (per-request).
2. `PIPES_AGENT_PROVIDER` (deploy-wide default).
3. Hardcoded default `openai`.

If the relevant API key is missing, the runner emits an SSE `error` event with `code: "model_unavailable"` and a human-readable message; the editor surfaces it as a soft failure.

To swap to Anthropic deploy-wide:

```bash
modal secret create pipes-agent-secrets \
  OPENAI_API_KEY=sk-... \
  ANTHROPIC_API_KEY=sk-ant-... \
  PIPES_AGENT_PROVIDER=anthropic
```

Or override per-request from the Next.js side by including `provider: "anthropic"` in the body forwarded to the runner.

## Deploy

```bash
bash agents/deploy.sh
```

`deploy.sh` is idempotent. Re-run on every change. Modal prints the HTTPS URL of the function. Copy that URL into `PIPES_AGENT_ENDPOINT_URL` in `.env.local` for the Next.js route to consume.

## Going to production

The full production walk-through lives in [`docs/production-checklist.md`](../docs/production-checklist.md). It is the one-page deploy: preflight, secrets, deploy, env wiring, the live eval, a curl smoke test, and the rollback switch. Each step has a verification command and an expected output.

### Preflight

`agents/preflight.py` runs as Step 0 of `bash agents/deploy.sh`. It exits 0 only when every prerequisite is satisfied:

- Python 3.11 or newer.
- `OPENAI_API_KEY`, `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET` env vars set.
- The runtime deps (`modal`, `openai`, the `openai-agents` SDK, `pydantic`, `httpx`, `fastapi`, `sse-starlette`) importable.
- `modal token list` succeeds (the CLI is authenticated).
- `OPENAI_API_KEY` is accepted by `api.openai.com` (HTTP 200 from `/v1/models`).
- The Modal secret `pipes-agent-secrets` exists.

Failed checks return numeric exit codes 10 through 16 with an actionable message. Run by hand any time:

```bash
python agents/preflight.py
```

### CI live eval

A GitHub Actions workflow at `.github/workflows/live-eval.yml` runs `agents/eval/run_live_eval.py` against the production endpoint after every push to `main`. The job is gated on two repo secrets, `PIPES_AGENT_ENDPOINT_URL` and `OPENAI_API_KEY`. When either secret is absent, the gate step prints a skip notice and the job still finishes green so a fresh fork or a pre-deploy branch never sees a red check. When the secrets are present, the job installs `agents/requirements.txt`, runs the eval, and uploads `docs/builder-live-eval.md` as a build artifact.

### The live eval

`agents/eval/run_live_eval.py` runs the same 14 starter prompts as the stub-driven eval against a real Modal endpoint, captures cold-start and wall-clock latency, and writes `docs/builder-live-eval.md`. Exit 0 requires 12 of 14 PASS plus p95 cold start under 1500 ms plus p95 wall clock under 30 s. The pytest at `agents/eval/test_live_eval_smoke.py` runs three of the prompts when `PIPES_AGENT_ENDPOINT_URL` is set in the test environment and skips otherwise.

## Run locally without Modal

```bash
export OPENAI_API_KEY=sk-...
modal run agents/sandbox.py::serve --local --prompt "Planner agent feeds a Coder agent."
```

That bypasses Modal and prints SSE frames to stdout in this Python process. It still calls the live OpenAI API. For a fully offline run, the Next.js route handles mock mode separately (see "Mock mode" below).

## Run the tests

```bash
pip install pytest pytest-asyncio
pytest agents/tests/
```

Tests stub the SDK and the model. They never hit the network.

## Mock mode

This service does not implement mock mode. The Next.js route at `/api/agent/build` short-circuits to canned fixture files when `PIPES_USE_MOCKS=true` and never invokes Modal. That keeps `npm run dev` zero-dependency. See `docs/agent-contract.md`, "The mock-mode contract."

## Plan-first flow

Every turn proceeds in three beats:

1. The runner emits one `plan` Step (or the builder receives one from an injected planner). The text is the agent's plan paragraph: 3 to 5 sentences naming the system, the nodes, the pipes, and one sentence on why the layout earns its place.
2. The builder runs `evaluate_plan` against the plan text. If it passes, the plan is forwarded to the editor as a `message` event. If it fails, the agent re-plans once. If the second plan also fails, the builder emits an `error` event whose message starts with `plan_rejected:` (the contract's error code list does not include a dedicated value, so we use `internal`).
3. After a successful plan, the builder accepts tool calls. Each tool call passes `evaluate_action` before being forwarded. Rejections emit a `Skipped: ...` message and continue; they do not abort the turn.

A no-op plan (`Nothing to build.`) short-circuits to a clean `done` with zero tool calls.

## Why eval before execute

Deterministic checks beat probabilistic models for catching dumb plans. The plan eval runs in microseconds; the action eval runs once per tool call. Together they catch:

- Banned voice words slipping into the plan.
- Plans that mention zero connections (a system without flow is not a system).
- Plans that propose 50 nodes for a "two-node loop" prompt.
- Self-loops, duplicate edges, and references to missing endpoints.
- Coordinate collisions and out-of-bounds positions.
- Calling `validate` more than once per turn.

The Musk lens: the cheapest reliable check beats the most expensive unreliable one. Run the cheap check first.

## Tailoring

`BuildRequest` accepts six optional fields the Next.js route can pass through to tailor the system prompt:

| Field (alias) | Purpose |
| --- | --- |
| `userFirstName` | The engineer's first name. |
| `userTeam` | The engineer's team name. |
| `priorSystemsSummary` | A one-sentence summary of what they have built before, max 80 chars. |
| `systemName` | The current system's display name. |
| `existingNodesCount` | Existing node count on the canvas. Drives "iterate vs build from scratch" prompt branch. |
| `existingPipesCount` | Existing pipe count on the canvas. |

`builder.render_system_prompt(request)` substitutes these into the `{{user_first_name}}` style placeholders. Empty values render as empty strings; the prompt reads cleanly when no context is known. The Next.js side currently does not populate these (a Phase 3 follow-up); the agent accepts and uses them today.

## Cold-start budget

Modal cold starts for a Python 3.11 + small-image function typically land in 300 to 700 milliseconds for the first byte. The contract sets the budget at 800 ms before the first SSE event. We meet that by:

- Lazy-importing the OpenAI Agents SDK inside `run_turn_stream`.
- Not instantiating any model client at module top-level.
- Keeping the Modal image lean (no `torch`, no `transformers`).

We do NOT prewarm. Warm pools are out of scope for v1 by deliberate decision (see `docs/agent-product.md`, "V1 cost decision").

## Status of the open questions from `docs/agent-contract.md`

| Open question | Status | Notes |
| --- | --- | --- |
| Modal cancellation API | Answered for v1 | The FastAPI handler observes `request.is_disconnected()` per request loop and stops streaming. The builder also accepts an `abort_signal: asyncio.Event` for in-process cancellation. Mid-call hard cancellation of an in-flight OpenAI API call is not supported by the SDK as of v0.0.18; we accept the budget waste. |
| OpenAI Agents SDK version + model | Answered | `openai-agents>=0.0.18`, default model `gpt-4o-mini`. Override with `OPENAI_AGENTS_MODEL`. |
| Conversation pruning | Deferred | The Phase 3 route owns history hydration. The runner accepts a `history` field on the request shape but does not yet consume it. |
| Cost telemetry | Deferred | The runner does not currently surface input/output token counts. Add a `usage` event in Phase 4 once the SDK exposes it consistently. |
| Idempotency keying | Answered | `tool_result.id` is sufficient. The runner emits a unique 12-hex id per tool call (`tc_<hex>`); the editor queue dedupes on that id. |
| Multi-tab behavior | Deferred | The runner is stateless. Concurrency control is a route concern in Phase 3. |
| Plan-first contract | Closed by the audit | The agent emits a plan `message` before any tool call. Two eval gates run before forwarding events to the editor. |
| Tailoring placeholders | Closed by the audit | `BuildRequest` accepts the six fields above. The Next.js route still needs to populate them (Phase 3 follow-up). |
| Dedicated `plan_rejected` error code | Open | The contract's error code list is frozen for v1. The runner uses `internal` with a `plan_rejected:` message prefix. Adding `plan_rejected` to the contract is a Next.js + docs change, deferred to a contract revision. |

## Next.js follow-ups (out of audit scope)

The audit did not modify any code under `src/`. The following Next.js work is required to surface the new agent capabilities end to end:

- `/api/agent/build` should forward the six tailoring fields to Modal: `userFirstName`, `userTeam`, `priorSystemsSummary`, `systemName`, `existingNodesCount`, `existingPipesCount`. Pull these from the Clerk user, the workspace, the prior `agent_conversations`, and the system bundle.
- The route should treat `error` events whose message starts with `plan_rejected:` as a soft failure rather than retryable.
- The editor should render the plan `message` distinctly from the final `message` (different visual weight, e.g. dimmed).

## What `validate()` actually validates in v1

Honest answer: a minimum subset of the TypeScript validator at `src/domain/validation/index.ts`. The Python port checks:

- No duplicate node ids in the in-memory graph.
- No pipes referencing missing endpoint nodes.
- No pipes whose source equals their target (self-loops).

It does NOT check port directions, port type compatibility, cycle detection, reachability, or subsystem interface completeness. Those checks need port-level data that the agent does not own; the Convex flush triggers the full validator on the Next.js side. The agent uses `validate()` to write its final message; users see the authoritative report from the editor's validation panel.

If the lightweight checks are too lenient and the agent ships obviously broken graphs, replace the body of `tools.validate` with a richer port and re-run tests. That is the only file to change.

## Divergence from the contract

| Contract clause | Implementation note |
| --- | --- |
| "Streaming animations are 80 to 120 ms per beat" | The runner does not throttle; the editor handles paced animation. |
| `validate` "thin in-process simulator" | Implemented as a pure function over `GraphState`. No process boundary. |
| `update_node`, `delete_node` ids | Generated as `tmp_<8 hex>`. The editor's optimistic queue replaces these with server ids on flush. |
| Error code coverage | All 6 codes from the contract are emitted. Of those, `auth_required`, `rate_limited`, and `model_unavailable` are reachable only from the Phase 3 route, not from this runner. |
| `plan_rejected` event | Not in the contract. Surfaced as `error` with code `internal` and message prefix `plan_rejected:`. Adding the code requires a contract revision. |

# agents/

The Modal-sandboxed runner that turns one sentence into a Pipes graph. The Next.js route at `/api/agent/build` (Phase 3) forwards the user's prompt here. This service streams Server-Sent Events back to the editor, which applies each tool result to the canvas through the same optimistic queue manual edits use.

## What this is

- A FastAPI app, exposed by Modal at one HTTPS endpoint, that streams `text/event-stream` per `docs/agent-contract.md`.
- An OpenAI Agents SDK agent with exactly 5 tools: `add_node`, `add_pipe`, `update_node`, `delete_node`, `validate`.
- A 30-tool-call hard cap and a 60-second wall-clock cap per turn.
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
| `pydantic` | 2.0 | Strict argument validation. |
| `httpx` | 0.27 | Streaming HTTP for the Modal endpoint. |
| `sse-starlette` | 2.1 | Imported defensively; the active framing is hand-rolled. |
| `fastapi` | 0.115 | The ASGI app Modal serves. |

## Configure secrets

Modal pulls a single secret named `pipes-agent-secrets` containing `OPENAI_API_KEY`:

```bash
modal secret create pipes-agent-secrets OPENAI_API_KEY=sk-...
```

See https://modal.com/docs/guide/secrets for the latest CLI surface.

## Deploy

```bash
bash agents/deploy.sh
```

`deploy.sh` is idempotent. Re-run on every change. Modal prints the HTTPS URL of the function. Copy that URL into `PIPES_AGENT_ENDPOINT_URL` in `.env.local` for the Next.js route to consume.

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

## Cold-start budget

Modal cold starts for a Python 3.11 + small-image function typically land in 300 to 700 milliseconds for the first byte. The contract sets the budget at 800 ms before the first SSE event. We meet that by:

- Lazy-importing the OpenAI Agents SDK inside `run_turn_stream`.
- Not instantiating any model client at module top-level.
- Keeping the Modal image lean (no `torch`, no `transformers`).

We do NOT prewarm. Warm pools are out of scope for v1 by deliberate decision (see `docs/agent-product.md`, "V1 cost decision").

## Status of the open questions from `docs/agent-contract.md`

| Open question | Status | Notes |
| --- | --- | --- |
| Modal cancellation API | Answered for v1 | The FastAPI handler observes `request.is_disconnected()` per request loop and stops streaming. If the model has not yet returned, the underlying Modal function continues to completion but the HTTP layer drops the bytes. Persistence happens in Phase 3 and will mark the partial turn `cancelled: true`. Mid-call hard cancellation of an in-flight OpenAI API call is not supported by the SDK as of v0.0.18; we accept the budget waste. |
| OpenAI Agents SDK version + model | Answered | `openai-agents>=0.0.18`, default model `gpt-4o-mini`. Override with `OPENAI_AGENTS_MODEL`. |
| Conversation pruning | Deferred | The Phase 3 route owns history hydration. The runner accepts a `history` field on the request shape but does not yet consume it. |
| Cost telemetry | Deferred | The runner does not currently surface input/output token counts. Add a `usage` event in Phase 4 once the SDK exposes it consistently. |
| Idempotency keying | Answered | `tool_result.id` is sufficient. The runner emits a unique 12-hex id per tool call (`tc_<hex>`); the editor queue dedupes on that id. |
| Multi-tab behavior | Deferred | The runner is stateless. Concurrency control is a route concern in Phase 3. |

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

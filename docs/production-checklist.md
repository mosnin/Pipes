# Production checklist - Pipes agent runner

This is the one-page deploy. Follow it top to bottom. Each step ends
with a verification command and what you should see. If a step's
output diverges, jump to the troubleshooting note at the bottom.

## 0. Prerequisites

- A Modal account (https://modal.com). Free tier covers the smoke
  test; sustained traffic needs a paid plan.
- An OpenAI API key with access to `gpt-4o-mini` or any model you
  override via `OPENAI_AGENTS_MODEL`.
- Production env access to the Next.js app on Vercel (or your host).
- A Convex deployment URL and a Clerk publishable + secret key.
- Local `modal` CLI installed and authenticated:

```bash
pip install modal && modal token new
```

# Expected output:
```
Web authentication started. Open the URL in your browser.
Token created.
```

## 1. Set Modal secrets

The Modal app reads one secret named `pipes-agent-secrets`
containing `OPENAI_API_KEY`.

```bash
modal secret create pipes-agent-secrets OPENAI_API_KEY=sk-...
modal secret list
```

# Expected output:
```
Name                  Last used    Created
pipes-agent-secrets   never        a few seconds ago
```

## 2. Deploy the Modal endpoint

```bash
bash agents/deploy.sh
modal app list
```

# Expected output:
```
Name              State    Created       Stopped
pipes-agent       deployed a moment ago  -
```

## 3. Capture the endpoint URL

The deploy command prints the function URL. If you missed it:

```bash
modal app stats pipes-agent
```

Look for the line starting with `serve_modal => https://...`. Copy
that URL (no trailing slash). It is `PIPES_AGENT_ENDPOINT_URL` for
the rest of the steps.

# Expected output:
```
serve_modal => https://<workspace>--pipes-agent-serve-modal.modal.run
```

## 4. Set Next.js env in production

In Vercel (or your host), set:

- `PIPES_AGENT_ENDPOINT_URL=<from step 3>`
- `OPENAI_AGENTS_MODEL=gpt-4o-mini` (optional override)
- `CLERK_SECRET_KEY=<from Clerk dashboard>`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk dashboard>`
- `CONVEX_URL=<from Convex dashboard>`
- `NEXT_PUBLIC_CONVEX_URL=<same>`
- `PIPES_USE_MOCKS=false`
- `NEXT_PUBLIC_PIPES_USE_MOCKS=false`

```bash
vercel env ls production
```

# Expected output:
```
PIPES_AGENT_ENDPOINT_URL          Encrypted   Production
CLERK_SECRET_KEY                  Encrypted   Production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY Encrypted   Production
CONVEX_URL                        Encrypted   Production
NEXT_PUBLIC_CONVEX_URL            Encrypted   Production
PIPES_USE_MOCKS                   Encrypted   Production
```

## 5. Run the live eval

From your laptop, with `OPENAI_API_KEY` exported (the harness
checks the var as a guardrail against a missing Modal secret):

```bash
PIPES_AGENT_ENDPOINT_URL=https://...modal.run \
OPENAI_API_KEY=sk-... \
python agents/eval/run_live_eval.py
```

# Expected output (last lines):
```
Pass: 14 / 14  (threshold 12)
Cold start: p50=... ms, p95=... ms (budget p95 < 1500 ms)
Wall clock: p50=... s, p95=... s (budget p95 < 30.0 s)
Transport errors: 0, agent errors: 0
```

Exit code is `0` on success. Full report at
`docs/builder-live-eval.md`. If any threshold (12/14 PASS, p95 cold
start < 1500 ms, p95 wall clock < 30 s) fails, the script exits 1.
Read the table and fix the regression before continuing.

## 6. Smoke test from a real client

A direct curl confirms the endpoint streams SSE end to end:

```bash
curl -N -X POST "$PIPES_AGENT_ENDPOINT_URL/build" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"systemId":"sys_smoke","prompt":"Planner agent feeds a Coder agent."}'
```

# Expected output (first frames, then `done`):
```
event: message
data: {"text":"...plan paragraph..."}

event: tool_call
data: {"id":"tc_...","tool_name":"add_node","arguments":{...}}

event: tool_result
data: {"id":"tc_...","ok":true,"action":{...}}

event: done
data: {"conversationId":"...","turnId":"..."}
```

## 7. Rollback

If the production endpoint misbehaves, set in the host env:

```
PIPES_USE_MOCKS=true
NEXT_PUBLIC_PIPES_USE_MOCKS=true
```

Redeploy. The Next.js route at `/api/agent/build` short-circuits to
canned fixtures under `tests/fixtures/agent-build/` and never calls
Modal. The wire format is byte-identical; the editor cannot tell.
See `docs/agent-contract.md`, "The mock-mode contract."

To stop the Modal app entirely:

```bash
modal app stop pipes-agent
```

# Expected output:
```
Stopped app pipes-agent.
```

## Open follow-ups (not blocking deploy)

- Real telemetry: per-turn token counts and dollar cost on
  `agent_turns`. Tracked under "Cost telemetry" in
  `agents/README.md`.
- Warm-pool tuning: defer until paying users complain about cold
  starts.
- Multi-region Modal deploy: defer until p95 cold start regresses
  for two consecutive weeks.
- Cancellation live test: contract is covered, but the harness does
  not yet exercise mid-turn aborts.

## Troubleshooting

- `modal secret list` shows no `pipes-agent-secrets`: re-run step 1.
- `modal app list` shows `pipes-agent` as `stopped` after step 2:
  re-run with `MODAL_LOGLEVEL=DEBUG bash agents/deploy.sh` and check
  the last error.
- `curl` in step 6 returns HTTP 500: a Modal dep is missing. Confirm
  `agents/requirements.txt` lines match the `_build_image()` pip
  list in `agents/sandbox.py`, then redeploy.
- Live eval reports cold start p95 above 1500 ms: the function is
  cold-spawning each request. Re-run; the second pass should land
  inside budget. If it does not, file a ticket against the warm-pool
  follow-up.

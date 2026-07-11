# Runbook

Sev-1 and Sev-2 procedures for the three failure classes we expect.
Every section follows the same structure: detection, immediate
mitigation, root cause investigation, comms.

Severity levels:

- Sev-1: agent build is fully unavailable for all users for more than
  five minutes.
- Sev-2: agent build is degraded (>10% error rate or p95 latency >2x
  baseline) for more than ten minutes.

The on-call engineer responds within five minutes for Sev-1 and within
fifteen minutes for Sev-2.

## 1. Modal endpoint unreachable

Symptoms: `/api/agent/build` returns SSE `error` events with `code:
"internal"` and message "Agent endpoint is unreachable" or "Agent
endpoint returned 502". 30 s wall-clock timeouts spike.

### Detection

- `/admin/metrics` -> "Recent errors" table fills with
  `agent_build.handler_error` and `agent_build.stream_error` rows.
- `/admin/metrics` -> Error rate KPI exceeds 5%.
- Sentry: spike in `Agent endpoint is unreachable` exceptions.
- OTEL: `agent_build.duration_ms` p95 above 30 s.

### Immediate mitigation

1. Check Modal status page (status.modal.com). If they are degraded,
   announce in the in-app status banner and wait.
2. If Modal is healthy, restart the executor app:
   `modal app stop pipes-executor && modal deploy agents/executor.py`.
3. If the deploy fails, flip `LOOPER_AGENT_ENDPOINT_URL` to an empty
   string in Vercel env. The route will return a clean error to clients
   instead of hanging on the timeout. Users can still browse and edit
   manually.
4. Verify by hitting `/api/agent/build` with a known-good prompt; if it
   succeeds, clear the banner.

### Root cause investigation

- Pull the last 100 lines of Modal logs:
  `modal app logs pipes-executor --tail 100`.
- Check OpenAI / Anthropic provider status.
- Check whether a recent deploy changed `agents/system_prompt.md` or the
  tool list.
- Look at p50 vs p95: a spread means a thundering herd; a flat high
  number means the upstream API is slow.

### Comms

- Status banner: "Agent build is degraded. Manual edits work."
- Internal Slack: post in #ops within five minutes of detection.
- Postmortem within 48 hours, file in /docs/postmortems/.

## 2. Convex outage

Symptoms: writes to `agent_turns`, `agent_runner_metrics`,
`metrics_samples` time out. Editor real-time queries hang. Toast
notifications "Failed to save" appear in the editor.

### Detection

- `/admin/metrics` -> "Slowest builds" table sits flat (no new samples
  arriving).
- Convex dashboard: error rate > 1%, function latency p95 > 1 s.
- Sentry: spike in `ConvexError` and `Failed to fetch` from the editor.

### Immediate mitigation

1. Check Convex status page.
2. If Convex is degraded, flip `LOOPER_USE_MOCKS=true` only as a last
   resort - this drops all writes to the in-memory store and is data
   loss for that period. Default is to wait Convex out.
3. If only writes are failing, queue them client-side. The editor's
   optimistic queue already handles brief outages. Users will see the
   "saving" indicator but their canvas state is preserved.
4. The `metrics_samples` writes are fire-and-forget; we lose telemetry
   during the outage but never block the request path. No action needed
   on metrics specifically.

### Root cause investigation

- Convex deployment dashboard for the affected functions.
- Did we recently add an unindexed `collect()`? Check `convex/app.ts`
  diff over last week.
- Hot key? Check `agent_turns` write rate by `conversationId`.

### Comms

- Status banner: "Saving is paused. Your work is held locally."
- Internal Slack: #ops within five minutes.
- If the outage exceeds 30 minutes, email all active workspaces.

## 3. Clerk auth failures

Symptoms: `/api/agent/build` returns 401 to a high fraction of users.
Sign-in page loops or shows generic "Authentication required."

### Detection

- `/admin/metrics` -> `agent_build.auth_required` counter spikes to
  >50/min.
- Sentry: `Authentication required` returns from `getServerApp()`
  spike.
- Clerk dashboard: webhook delivery failures or sign-in success rate
  drops.

### Immediate mitigation

1. Check Clerk status page.
2. If our Clerk keys were rotated recently, confirm both
   `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are set
   and matching the Clerk dashboard. A mismatch silently fails auth.
3. Roll back the most recent middleware deploy if Clerk is healthy and
   our error rate is elevated. The `middleware.ts` matcher must include
   `/api/agent(.*)` for protection.
4. Verify a clean sign-in cycle: sign out, sign in via Google or
   magic link, hit `/dashboard` -> 200.

### Root cause investigation

- Clerk dashboard: review recent session events.
- If 401s are concentrated on one route, check that the matcher
  pattern still covers it.
- If the `clerkMiddleware` callback is throwing, check Vercel logs for
  the request path.

### Comms

- Status banner: "Sign-in is degraded."
- Internal Slack: #ops within ten minutes.
- Postmortem if more than 5% of sign-ins fail for more than fifteen
  minutes.

## On-call cheat sheet

| Symptom | First check | First fix |
| --- | --- | --- |
| 502 from `/api/agent/build` | Modal status | Restart executor |
| Editor hangs | Convex status | Wait, flip banner |
| Repeated 401 | Clerk keys | Re-verify env, redeploy |
| Slow but working | OTEL p95 chart | Inspect upstream provider latency |
| Banner of last resort | Vercel env | Flip `LOOPER_AGENT_ENDPOINT_URL=""` |

The runbook is short on purpose. The first hour is detection and
mitigation; analysis comes after the bleeding stops.

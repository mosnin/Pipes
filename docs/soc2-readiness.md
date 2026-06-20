# SOC2 readiness

Internal map of where Looper meets SOC2 Trust Services Criteria today, what
is missing, and who owns each gap. Not a submission. The auditor reads
this; engineers fix the gaps before signing the engagement letter.

Status legend: `done` (control in production), `gap` (work to do), `n/a`
(not applicable).

## CC1-CC9 Common Criteria (Security)

| Control | Status | Evidence | Owner |
| --- | --- | --- | --- |
| Access control - SSO | done | Clerk session middleware in `middleware.ts`. All `/dashboard`, `/admin`, `/api/agent`, `/api/graph` routes are gated. | Platform |
| Access control - role-based authorization | done | `services.access.ensureCanEdit(ctx)` and `ensureInternalOperator(email)` in `src/domain/services/bounded.ts`. Per-workspace role check. | Platform |
| Token authentication | done | Bearer tokens (ptk_...) hashed with SHA-256 before storage; capability scoping in `src/lib/protocol/auth.ts`. | Agent |
| Encryption in transit | done | HTTPS enforced via Vercel edge + HSTS header `max-age=63072000; includeSubDomains; preload` in `middleware.ts`. | Platform |
| Encryption at rest | done | Convex managed encryption at rest; documented at https://docs.convex.dev/security. | Platform |
| Session management | done | Clerk session cookies with rotation; `SameSite=Lax`. | Platform |
| Secret rotation policy | gap | We rotate Clerk + Convex keys on demand only. Need a documented 90-day rotation cadence and a runbook entry. | Platform |
| Audit logging | done | `audit_events` table in Convex; SIEM forwarding via `forwardAuditEvent` for auth and budget rejections. | Platform |
| Vulnerability management | gap | Dependabot is on but no scheduled triage. Need a weekly review cadence. | Platform |
| Endpoint protection | n/a | No employee endpoints in scope; we do not run servers, we run on Vercel + Convex + Modal. | - |
| Background checks | n/a | Single-founder phase; revisit at first non-founder hire. | HR |

## A1 Availability

| Control | Status | Evidence | Owner |
| --- | --- | --- | --- |
| Uptime target | gap | Target 99.9% for `/api/agent/build`. We have not signed an SLA with end users. | Platform |
| Monitoring | done | `recordLatency` / `recordCounter` / `recordError` in `src/lib/observability/index.ts`. Sentry + OTEL exporters guarded by env. | Platform |
| In-app dashboard | done | `/admin/metrics` reads from `metrics_samples` table. p50/p95/error rate visible. | Platform |
| Incident response | done | `docs/runbook.md` covers Sev-1/2 for the three known failure classes. | Platform |
| Backup + restore | gap | Convex offers point-in-time recovery; we have not tested a restore drill. | Platform |
| Capacity planning | gap | No documented headroom. Modal scales to 10 concurrent containers default. | Platform |

## PI1 Processing Integrity

| Control | Status | Evidence | Owner |
| --- | --- | --- | --- |
| Input validation | done | All API routes validate via Zod schemas. See `buildRequestSchema` in `src/app/api/agent/build/route.ts`. | Platform |
| Idempotency | done | `idempotency_keys` Convex table; `repositories.idempotency.get/put` for write-bearing routes. | Platform |
| Eval gates | done | Builder eval suite documented in `docs/builder-eval.md`; runs in CI before deploy. | Agent |
| Audit trail | done | `audit_events` table + SIEM forwarding (`SIEM_WEBHOOK_URL`) for auth and budget rejections. | Platform |
| Tool call cap | done | 30 tool calls per turn, hard-capped server-side. See `TOOL_CALL_CAP` in build route. | Agent |
| Wall-clock cap | done | 60 s per turn. See `WALL_CLOCK_CAP_MS` in build route. | Agent |
| Schema versioning | done | `looper_schema_v1` is the canonical export; migration map in `src/domain/looper_schema_v1/migration.ts`. | Platform |

## C1 Confidentiality

| Control | Status | Evidence | Owner |
| --- | --- | --- | --- |
| Data classification | gap | We treat all workspace data as confidential. No formal classification matrix yet. | Platform |
| Workspace isolation | done | Every Convex query filters by `workspaceId`. See `docs/multi-tenancy.md`. | Platform |
| Tenant data deletion | gap | Delete-account flow does not yet purge `agent_turns` and `metrics_samples`. | Platform |
| Access matrix | done | Roles: Owner, Admin, Editor, Commenter, Viewer in `src/domain/looper_schema_v1/schema.ts`. | Platform |
| Vendor management | gap | Vendor list (Clerk, Convex, OpenAI, Anthropic, Modal, Resend, Creem, Sentry, Upstash) needs a DPA inventory. | Platform |

## P1-P8 Privacy

| Control | Status | Evidence | Owner |
| --- | --- | --- | --- |
| Data retention | gap | No documented TTL for `metrics_samples` or `agent_turns`. Need a 90-day default. | Platform |
| Deletion policy | gap | User-initiated delete must purge per workspace. Stub exists in admin support tools. | Platform |
| GDPR posture | gap | DPA template + data-subject-request flow not yet shipped. | Legal |
| Cookie disclosure | done | Clerk cookies are session + auth only; no analytics cookies. | Platform |
| Subprocessor list | gap | Public list at /trust required. | Platform |
| Privacy notice | gap | No privacy policy linked from the public site. | Legal |

## Action items (priority order)

1. Document secret rotation cadence; add a quarterly calendar reminder.
2. Run a backup-restore drill against Convex; record the result here.
3. Ship a delete-account purge that touches every per-workspace table.
4. Publish subprocessor list and privacy notice on the marketing site.
5. Establish 90-day retention TTL for `metrics_samples` and old `agent_turns`.

The bar is honest. Each `gap` line above is a real piece of work; the
status flips to `done` only when the evidence link points at a deployed
control, not a plan.

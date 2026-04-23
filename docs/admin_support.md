# Admin & Support Operations

## Authorization model

Pipes uses a simple **internal operator allowlist** by email via `PIPES_ADMIN_ALLOWLIST`.

- `src/lib/admin/access.ts` parses and normalizes the allowlist.
- In mock mode (`PIPES_USE_MOCKS=true`), `owner@pipes.local` is allowed by default.
- Admin API routes call `services.access.ensureInternalOperator(identity.email)`.

This is intentionally separate from workspace collaboration roles.

## Internal surfaces

- `/admin` — support inspection surface
- `/admin/insights` — post-launch insights summary surface
- `/settings/audit` — richer audit filters + CSV export
- `/settings/trust` — enterprise trust/governance controls

## Supported inspection tasks

- find user by email (or by id fallback)
- inspect workspace summary and plan state
- inspect system summary
- inspect invites and token list from workspace support summary
- inspect recent audits and recent product signals
- inspect activation/health-oriented summaries

## Safety model

- No direct storage mutation from UI.
- Service layer remains the business authority.
- Support actions remain constrained and explicit.

## Mock vs real behavior

- Mock mode supports full local operator flow using audit-backed signals and local persistence.
- Real mode uses real auth + provider-backed repositories with the same service contracts.

## Release review and issue triage additions
- `/admin/release` provides compact launch readiness summary from bounded services.
- `/admin/issues` provides bounded triage over feedback intake and grouped failure signals.
- `/settings/feedback` provides user-facing structured feedback capture for early beta loops.
- Issue triage status transitions are intentionally bounded to `new`, `reviewing`, and `closed`.
- Feedback `systemId` is optional and provider-agnostic (bounded alphanumeric/underscore/hyphen format), not `sys_` specific.

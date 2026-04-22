# Beta Operations Playbook

## Purpose
This playbook supports a controlled beta launch with bounded operator tools, rapid issue triage, and clear rollback posture.

## Operator surfaces
- `/admin/release` launch-readiness review snapshot.
- `/admin/issues` feedback + failure grouping triage queue.
- `/admin` support inspection.
- `/admin/insights` trend summary.
- `/settings/feedback` user-facing structured feedback intake.

## Pre-launch checks
1. Run `npm run lint`, `npm run typecheck`, `npm run test`.
2. Run `npm run test:e2e` where browser runtime is available.
3. Validate critical routes listed in `/admin/release` checklist.
4. Confirm provider readiness flags in `/admin/release`.
5. Confirm operator allowlist (`PIPES_ADMIN_ALLOWLIST`) in real mode.

## Launch day checks
1. Freeze non-critical merges.
2. Execute `docs/qa_checklist.md` release-candidate smoke sequence.
3. Open `/admin/release` and capture baseline snapshot.
4. Open `/admin/issues` and verify triage queue starts clean.

## Post-launch monitoring
1. Review `/admin/release` every 2-4 hours in day 1.
2. Triage new feedback items (`new -> reviewing -> closed`) in `/admin/issues`.
3. Check failure grouping deltas (editor, protocol, billing, invite).
4. Escalate critical regressions to rollback/mitigation runbook.

## Rollback and mitigation guidance
- Prioritize mitigation over rapid feature changes.
- For provider instability, temporarily run mock-mode validation to isolate logic regressions.
- For protocol auth/rate issues, reduce rollout and verify token scopes + rate-limit posture.
- For editor reliability spikes, pause expansion of usage cohorts and ship focused fixes only.

## Mock vs real mode notes
- Mock mode: deterministic local persistence and full feedback + triage flow for rehearsal.
- Real mode: same service contracts with provider-backed persistence and real operator allowlist.
- `/admin/release` runtime mode reflects effective configuration:
  - `mock` when mocks are forced,
  - `provider` when provider config is complete,
  - `fallback_mock` when provider mode is requested but configuration is incomplete (with warning).

## First-week watch items
- Signup to onboarding completion gap.
- Editor crash/autosave failure trend.
- Invite + billing failure rate.
- Protocol auth/rate-limit/write failure concentration.
- Time-to-triage for high severity feedback.

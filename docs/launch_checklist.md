# Launch Checklist

## Product readiness
- [ ] Dashboard library search, filters, sort, favorites, tags, archive, and restore verified.
- [ ] Onboarding start paths (blank, template, AI, import) verified.
- [ ] Editor core open/edit/save loop verified in mock and real modes.
- [ ] Settings pages (billing, collaboration, tokens, audit) verified.
- [ ] Admin support surface (`/admin`) verified for internal operators.
- [ ] Admin insights surface (`/admin/insights`) verified for internal operators.
- [ ] Trust settings surface (`/settings/trust`) verified for workspace owner/admin paths.
- [ ] Public growth IA routes (`/use-cases`, `/compare`, `/templates/[slug]`) verified for logged-out users.

## Reliability and safeguards
- [ ] Not found route fallback checked.
- [ ] Empty/loading/error states reviewed across dashboard/onboarding/settings/editor.
- [ ] Product signals visible for onboarding/library/editor trust events.
- [ ] Operator allowlist configured (`PIPES_ADMIN_ALLOWLIST`) for production.
- [ ] Enterprise auth readiness posture documented (`docs/enterprise_trust.md`) and reviewed.
- [ ] Growth model documented (`docs/growth_model.md`) and reviewed.

## Release notes
- [ ] Known limitations documented.
- [ ] Smoke test flows recorded in `docs/qa_checklist.md`.
- [ ] Environment setup validated in `docs/local_development.md`.

## Pre-release validation command flow
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:e2e` (where browser runtime is available)

## Beta launch operations
- [ ] `/admin/release` reviewed and provider readiness captured.
- [ ] `/admin/issues` triage queue checked (new/reviewing/closed workflow).
- [ ] `/settings/feedback` intake path verified in current mode.
- [ ] `docs/beta_operations.md` pre-launch and post-launch sequences followed.

# ADR 0002: Sign-in security and roles, built like the rails

Status: accepted, built.

## Context

Sign-in was a signed cookie holding the user's id and an expiry. Nothing on
the server knew a session existed, so a session could not be revoked, did not
end when idle, and survived a password change. Failed sign-ins were counted
together with successful ones. There was no second factor. Workspace
"allowed domains" could be saved on the Trust page but nothing enforced them.
Role checks were spread across about forty call sites with three different
helpers and inconsistent rules: an Admin could make someone else an Admin,
ownership could not move, and members could not be removed.

## Decision

Apply the execution-rails approach (ADR 0001) to identity:

1. **State on the server, a pointer in the cookie.** Sessions are documents.
   The cookie names one and is checked on every request.
2. **Refuse early and say why.** Lockout, per-network limits and policy run
   before the work. Refusals are typed (401, 403 with a code, 423, 429).
3. **Journal everything.** An append-only `auth_event` stream, like the run
   journal.
4. **One table for permissions.** Every check reads
   `src/domain/permissions`. Roles are cumulative, the rules for changing
   them are code, and a test keeps the docs and the table in step.
5. **Build, don't buy, for now.** TOTP and recovery codes are about a hundred
   lines on Node's crypto, tested against the RFC 6238 vectors. No new
   dependency or vendor. A hosted identity provider stays possible: Auth0
   mode already exists, and the session layer sits after sign-in either way.

## Consequences

- Every signed-in request does one more document read (the session) and,
  for workspaces with a policy, one more (the policy). Last-seen writes are
  throttled to one per session every five minutes.
- Existing cookies are refused once, signing everyone out on deploy.
- Lockout lets someone who knows an email lock that account for a while. The
  per-network limit slows this, a reset always works, and the lock decays.
  This is the usual trade, and the journal shows who did it from where.
- SSO, SCIM and passkeys are the next steps (docs/security.md, "Not built yet").

# Sign-in security

Pipes' sign-in is built the way its execution rails are (see
[rails.md](rails.md)). Every security fact lives on the server, every refusal
names its rule, and every event is written to a journal. Roles and
permissions are in [rbac.md](rbac.md).

| Piece | Where |
|---|---|
| Sessions, lockout, journal, workspace policy | `src/domain/auth/security.ts` |
| Password accounts, two-step sign-in | `src/domain/services/accounts.ts` |
| One-time codes (RFC 6238) | `src/lib/auth/totp.ts` |
| Cookies, session checks | `src/lib/auth/index.ts`, `src/lib/auth/session.ts` |
| Policy on every request | `getServerApp` in `src/lib/composition/server.ts` |
| Same-origin check | `src/proxy.ts` |
| Security headers | `headers()` in `next.config.ts` |
| Tests | `tests/unit/auth-security.test.ts`, `tests/unit/rbac.test.ts` |

## Sessions

A signed-in browser holds a cookie that names a session. The session lives on
the server as an `auth_session` document, so it can end without the browser's
help.

- **Checked on every request.** A cookie is accepted only if its signature is
  ours (HMAC-SHA256 over `PIPES_SESSION_SECRET`) and the session it names is
  still live.
- **Idle timeout.** A session ends after a period without use: one day by
  default, from 15 minutes to 7 days as the workspace sets. Last-seen is
  written at most every five minutes.
- **Absolute limit.** No session lasts more than 7 days, however active.
- **Revocation.** Signing out ends the session on the server, so a copied
  cookie stops working at once. People can see where they are signed in
  (Settings, Account) and sign out any session, or every session but this one.
- **Automatic revocation.** Changing your password ends every other session.
  A password reset ends all of them.
- **Cookies.** HttpOnly, SameSite=Lax, Secure in production, with the
  `__Host-` prefix in production, so no subdomain can set or read them.
  Cookies from before server-side sessions are refused, which signs everyone
  out once.

## Signing in

- **Lockout.** Five failed attempts within 15 minutes lock the account for
  15 minutes. Each later lock lasts twice as long as the last, up to a day.
  While locked, even the right password is refused (HTTP 423). A password
  reset still works, so the owner of the account is never stuck.
- **Per-network limit.** 30 attempts per IP address per 15 minutes, across
  all accounts, so one address cannot try many emails (HTTP 429).
- **No account probing.** An unknown email answers exactly like a wrong
  password and takes as long, because a decoy hash is checked in its place.
  Password reset answers the same way whether or not the email has an account.
- **Passwords.** At least 10 characters, hashed with scrypt and a per-password
  salt. Passwords from public leak lists, single repeated characters, and
  passwords containing the email's name are refused.

## Two-step sign-in

Password accounts can add a code from an authenticator app (TOTP, RFC 6238:
HMAC-SHA1, 30-second steps, 6 digits), set up in Settings, Account.

- The secret is encrypted at rest with AES-256-GCM. It is shown once during
  setup as a key and an `otpauth://` link.
- A code is accepted one step either side of now, for clock drift, and each
  code works once: the last step used is stored, so a code seen over a
  shoulder cannot be replayed.
- Ten recovery codes are issued at setup. They are stored only as SHA-256
  hashes and each works once.
- After a correct password, the browser holds a five-minute challenge cookie
  and no session. The session starts only when `/api/auth/mfa` accepts a code.
  Wrong codes count toward the lockout.
- A password reset proves the email, not the phone. An account with two-step
  sign-in still asks for a code after a reset.
- Turning it off needs the password and a current code, so a stolen session
  alone cannot remove it.

Accounts that sign in through the identity provider (Auth0 mode) use that
provider's two-step settings. Pipes does not ask them for a second code.

## Workspace policy

Admins and the Owner set a policy in Settings, Security
(`PUT /api/settings/security`, permission `security.manage`):

| Setting | Effect |
|---|---|
| Two-step sign-in required | Anyone signing in with a password must set it up before they can do anything else. |
| Session length | How long a session lasts without use, for new sign-ins. |
| Allowed email domains | Only these domains, and their subdomains, can be invited, accept an invite, or stay signed in. |

The policy is checked in `getServerApp` on every signed-in request, so a
change applies at once. Someone who does not meet it is sent to
`/security-check`, where they can set up two-step sign-in. API calls get
HTTP 403 with `code: "security_policy"` and a `reason` (`two_step` or
`domain`). A policy that would lock out the person saving it is refused.

## The auth journal

Every security event is an `auth_event` document, written and never changed.
Events: `signup`, `login.succeeded`, `login.failed`, `login.locked`,
`login.blocked_ip`, `mfa.challenged`, `mfa.failed`, `mfa.enabled`,
`mfa.disabled`, `mfa.recovery_used`, `session.revoked`, `session.revoked_all`,
`session.expired`, `logout`, `password.changed`, `password.reset_requested`,
`password.reset` and `policy.changed`.

Each records when, which account (or a hash of the email, for attempts on
unknown emails), the IP address, the user agent and the details. People see
their own under Recent security activity on the Account page. Policy changes,
role changes, member removals and ownership transfers also go to the
workspace audit log.

## Requests

- **Same-origin check.** A state-changing request to `/api/*` that carries a
  session cookie and an `Origin` from another site is refused with 403
  `cross_site_request`, on top of SameSite=Lax. Bearer-token and webhook
  requests carry no session cookie and are not affected.
- **Typed refusals.** API calls without a live session get 401
  `unauthenticated`. Permission refusals get 403 `not_allowed`. Policy blocks
  get 403 `security_policy`. Pages redirect instead.
- **Headers.** Every response carries `Content-Security-Policy:
  frame-ancestors 'none'; object-src 'none'; base-uri 'self'`,
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
  `Permissions-Policy` and `Cross-Origin-Opener-Policy: same-origin`, plus
  HSTS in production. `form-action` is left out on purpose: OAuth consent
  posts a form that redirects to the client's callback, which it would block.

## Agents

API and OAuth tokens never use these sessions. They act with their creator's
role capped at Editor, within the capabilities granted, under per-token
limits and the kill switches ([rails.md](rails.md), [rbac.md](rbac.md)).
Tokens stop working when their creator leaves the workspace.

## Not built yet

- SAML and OIDC single sign-on per workspace, and SCIM provisioning. Auth0
  mode covers OIDC sign-in for the whole deployment today.
- Passkeys (WebAuthn) as a second factor or a password replacement.
- Email alerts for new-device sign-ins and lockouts.
- A workspace-wide view of members' security events for Admins.
- A QR code for setup. The `otpauth://` link and the key work in every app,
  but a desktop user has to type the key.

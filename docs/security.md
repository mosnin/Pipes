# Sign-in security

Pipes signs people in with [Better Auth](https://www.better-auth.com), and adds
the rules Better Auth does not have the way its execution rails do (see
[rails.md](rails.md)). Every security fact lives on the server, every refusal
names its rule, and every event is written to a journal. Roles and permissions
are in [rbac.md](rbac.md); who can see which memories is in
[memory.md](memory.md).

| Piece | Where |
|---|---|
| Better Auth configuration, one for every mode | `src/lib/auth/options.ts`, `src/lib/auth/schema-options.ts` |
| Pipes' rules as Better Auth hooks | `src/lib/auth/hooks.ts` |
| The instance, and where accounts are stored | `src/lib/auth/server.ts` |
| Convex storage through a key-guarded bridge | `src/lib/auth/convex-adapter.ts`, `convex/authBridge.ts`, `convex/betterAuth/` |
| Who is signed in, for the rest of Pipes | `src/lib/auth/index.ts` |
| Lockout, journal, workspace policy, session rules | `src/domain/auth/security.ts` |
| Workspace rules on every request | `getServerApp` in `src/lib/composition/server.ts` |
| Browser calls to Better Auth | `src/lib/auth/client.ts` |
| Same-origin check, headers | `src/proxy.ts`, `next.config.ts` |
| Moving accounts from the earlier sign-in | `src/lib/auth/migrate.ts`, `scripts/migrate-auth-to-better-auth.mts` |
| Tests | `tests/unit/better-auth.test.ts`, `auth-security.test.ts`, `auth-bridge.test.ts`, `rbac.test.ts` |

## How it is put together

Better Auth runs inside the Next server and answers under `/api/auth/*`
(`src/app/api/auth/[...all]/route.ts`). One configuration serves every mode;
only where accounts are stored changes:

| Mode | Accounts and sessions |
|---|---|
| Production (`CONVEX_URL` set) | Convex, in Better Auth's component installed in `convex/betterAuth`. The Next server reaches it through `convex/authBridge.ts`, whose functions need Pipes' server key like every other Convex function, so the Convex URL alone opens nothing. |
| Real sign-in without Convex | A SQLite file (`PIPES_AUTH_DB_FILE`, default `.pipes-auth.sqlite`). |
| Tests | SQLite in memory. |
| Demo (`PIPES_USE_MOCKS=true`) | No Better Auth: everyone is the demo owner. |

The component's tables come from Pipes' own configuration:
`npx tsx scripts/generate-auth-schema.mts` writes `convex/betterAuth/schema.ts`
from `schema-options.ts`. Run it after changing plugins or fields, then deploy
Convex. Two compatibility rewrites in the bridge cover where Better Auth 1.7's
queries go beyond what the component accepts (`_id ne` and a range delete on
challenge rows); both are tested.

Pipes users, workspaces and roles stay in Pipes' own tables. A Better Auth
account carries an `externalId` that is the key into them, so everything
after sign-in works as before.

## Sessions

- **Stored on the server, checked every request.** Better Auth keeps
  sessions in the database and never caches them in the cookie, so a revoked
  session ends at once.
- **Workspace idle limit.** A session ends after the workspace's period
  without use (one day by default; 15 minutes to 7 days), checked per request
  from when Better Auth last refreshed it (at most every five minutes).
- **Absolute limit.** No session lasts more than 7 days, however active.
- **Revocation.** People see where they are signed in (Settings, Account) and
  sign out any session, or all but this one. Session tokens never reach the
  browser; it sees session ids.
- **Automatic revocation.** Changing your password signs out every other
  session (enforced, whatever the request asks). A password reset signs out
  all of them, and the person signs in again.
- **Cookies.** `pipes.session_token`, HttpOnly, SameSite=Lax, with the
  `__Secure-` prefix and the Secure flag in production.

## Signing in

- **Lockout.** Five failed attempts within 15 minutes lock the account for 15
  minutes, from any number of addresses. Each later lock lasts twice as long,
  up to a day. While locked, even the right password is refused (HTTP 423)
  before it is checked. A password reset still works.
- **Rate limits.** Per IP address and endpoint: 30 sign-ins, 10 sign-ups, 5
  reset requests per 15 minutes, stored in Pipes' rate-limit table.
- **No account probing.** Better Auth answers an unknown email exactly like a
  wrong password, and reset requests the same whether or not the email has
  an account.
- **Passwords.** 10 to 200 characters. Passwords from public leak lists,
  single repeated characters and passwords containing the email's name are
  refused at sign-up, reset and change. New passwords are hashed with scrypt;
  accounts from the earlier sign-in keep their scrypt hashes and keep working.

## Two-step sign-in

Password accounts can add a code from an authenticator app (TOTP: 30-second
steps, 6 digits), in Settings, Account. Setting it up asks for the password.

- The secret is encrypted with Better Auth's key. It is shown once, as a key
  and an `otpauth://` link, and two-step sign-in turns on only after a code
  from the app proves it was added.
- **Each code works once.** Better Auth accepts a code for its whole window;
  Pipes refuses a code that was already used, and ends the session it would
  have started.
- Ten recovery codes are shown once and stored only as SHA-256 hashes; each
  works once.
- After a correct password the browser holds a five-minute challenge cookie
  and no session. Only a session started by the second step is marked as
  two-step verified. Five wrong codes lock the second step for 15 minutes.
- A password reset still asks for the code at the next sign-in.
- **Turning it off needs the password and a current code** (or a recovery
  code), so a stolen session and password are not enough.
- Accounts that sign in through the identity provider (Auth0) use the
  provider's two-step settings.

## Workspace policy

Admins and the Owner set a policy in Settings, Security
(`PUT /api/settings/security`, permission `security.manage`):

| Setting | Effect |
|---|---|
| Two-step sign-in required | Anyone signing in with a password must set it up, and sign in with it, before they can do anything else. |
| Session length | How long a session lasts without use. |
| Allowed email domains | Only these domains, and their subdomains, can be invited, accept an invite, or stay signed in. |

The policy is checked in `getServerApp` on every signed-in request, so a
change applies at once. Someone who does not meet it is sent to
`/security-check`, where they can set up two-step sign-in. API calls get
HTTP 403 with `code: "security_policy"` and a `reason`. A policy that would
lock out the person saving it is refused.

## The auth journal

Every security event is an `auth_event` record, written and never changed:
`signup`, `login.succeeded`, `login.failed`, `login.locked`, `mfa.challenged`,
`mfa.failed`, `mfa.enabled`, `mfa.disabled`, `mfa.recovery_used`,
`session.revoked`, `session.revoked_all`, `session.expired`, `password.changed`,
`password.reset_requested`, `password.reset` and `policy.changed`. Each records
when, which account (or a hash of the email, for attempts on unknown emails),
the IP address, the user agent and the details. People see their own under
Recent security activity. Policy, role and membership changes also go to the
workspace audit log.

## Requests

- **Same-origin checks.** Better Auth refuses state-changing requests to
  `/api/auth/*` from another origin, always (Pipes turns off Better Auth's
  habit of skipping the check under test runners). For the rest of `/api/*`,
  `src/proxy.ts` refuses a state-changing request that carries a session
  cookie and another site's `Origin` (403 `cross_site_request`). Bearer-token
  and webhook requests carry no session cookie and are not affected.
- **Typed refusals.** No live session: 401 `unauthenticated`. Permission:
  403 `not_allowed`. Policy: 403 `security_policy`. Pages redirect instead.
- **No internals in errors.** Convex errors are reduced to the function's own
  message before anything can return them, so call arguments (which carry
  the server key) never reach a response.
- **Headers.** `Content-Security-Policy: frame-ancestors 'none'; object-src
  'none'; base-uri 'self'`, `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
  `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and HSTS in
  production.

## Agents

API and OAuth tokens never use these sessions. They act with their creator's
role capped at Editor, within the capabilities granted, under per-token limits
and the kill switches ([rails.md](rails.md), [rbac.md](rbac.md)). Tokens stop
working when their creator leaves the workspace.

## Settings

| Variable | Meaning |
|---|---|
| `BETTER_AUTH_SECRET` | 32+ random characters. Signs cookies and encrypts two-step secrets. Falls back to `PIPES_SESSION_SECRET`. Required in production. |
| `NEXT_PUBLIC_APP_URL` | The app's URL: Better Auth's base URL and trusted origin. |
| `PIPES_AUTH_DB_FILE` | SQLite file for accounts when running real sign-in without Convex. |
| `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` | Optional: sign in through Auth0 instead of passwords. |

## Moving to Better Auth

1. Deploy Convex (`npx convex deploy`) so the Better Auth component and
   `authBridge` exist, and set `BETTER_AUTH_SECRET` on Vercel.
2. Run `npx tsx scripts/migrate-auth-to-better-auth.mts` with the production
   environment. Accounts move with their passwords, two-step secrets and
   recovery codes; it is safe to run twice.
3. Everyone is signed out once and signs in as before.

## Verification

Besides the unit tests, the same 24-step browser run passes against SQLite and
against a local Convex backend through the bridge: sign-up, the leaked-password
refusal, two-step setup, sign-out, a real sign-in through the form and the
two-step page, a recovery code on a second device, signing that device out
from the first, both cross-site refusals, the lockout, and a required-two-step
policy sending someone to set it up before the workspace opens.

## Not built yet

- SAML and OIDC single sign-on per workspace (Better Auth's SSO plugin) and
  SCIM provisioning. Auth0 covers OIDC sign-in for the whole deployment.
- Passkeys (Better Auth's passkey plugin).
- Moving workspaces onto Better Auth's organization plugin. Pipes' own
  workspaces and role table stay the source of truth (ADR 0003).
- Email alerts for new-device sign-ins and lockouts; a QR code for setup.
- Deleting an account, with its private memories, from Settings.

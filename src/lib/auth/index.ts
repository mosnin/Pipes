import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { createSecurityService, requestMeta, type RequestMeta } from "@/domain/auth/security";
import { getRepositories } from "@/lib/composition/repositories";
import { redirect } from "next/navigation";
import { env, runtimeFlags } from "@/lib/env";
import { decodeSignedSession, encodeSignedSession, SESSION_TTL_SECONDS, type SessionUser } from "@/lib/auth/session";

export type AppUser = SessionUser;

export interface AuthService {
  getCurrentUser(): Promise<AppUser | null>;
  requireUser(): Promise<AppUser>;
  getLogoutUrl(): string;
}

// In production the cookies carry the __Host- prefix: Secure, path /, no Domain, so no subdomain can set or read them.
const COOKIE_NAME = env.NODE_ENV === "production" ? "__Host-pipes_session" : "pipes_session";
const STATE_COOKIE_NAME = env.NODE_ENV === "production" ? "__Host-pipes_oauth_state" : "pipes_oauth_state";
const MFA_COOKIE_NAME = env.NODE_ENV === "production" ? "__Host-pipes_mfa" : "pipes_mfa";
const MFA_CHALLENGE_SECONDS = 5 * 60;
const DEV_SESSION_SECRET = "pipes-dev-only-session-secret-do-not-use-in-production";
const isProduction = env.NODE_ENV === "production";

export const MOCK_USER: AppUser = {
  externalId: "mock|usr_1",
  email: "owner@pipes.local",
  name: "Alex Rivera"
};

/**
 * How requests are authenticated.
 * - mock: everyone is the demo owner. Allowed in development, or in production only when
 *   PIPES_USE_MOCKS=true is set explicitly (a deliberate demo deployment, never a default).
 * - password: first-party email + password accounts with signed session cookies (the default
 *   real mode; needs only PIPES_SESSION_SECRET in production).
 * - auth0: sign-in through Auth0, also with signed session cookies.
 * - unconfigured: real mode was requested but sign-in isn't fully configured. Fail closed:
 *   nobody is signed in, instead of silently treating every visitor as the owner.
 */
export type AuthMode = "mock" | "password" | "auth0" | "unconfigured";

function sessionSecret(): string | undefined {
  if (env.PIPES_SESSION_SECRET && env.PIPES_SESSION_SECRET.length >= 32) return env.PIPES_SESSION_SECRET;
  return isProduction ? undefined : DEV_SESSION_SECRET;
}

export function resolveAuthMode(): AuthMode {
  if (runtimeFlags.useMocks) {
    const explicitlyEnabled = process.env.PIPES_USE_MOCKS === "true";
    return !isProduction || explicitlyEnabled ? "mock" : "unconfigured";
  }
  if (!sessionSecret()) return "unconfigured";
  return runtimeFlags.hasAuth0 ? "auth0" : "password";
}

const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: "lax" as const, path: "/" };

function requireSecret(): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("PIPES_SESSION_SECRET (32+ characters) is required to create sessions in production.");
  return secret;
}

/** The caller's IP and user agent, for the auth journal and per-IP limits. */
export async function currentRequestMeta(): Promise<RequestMeta> {
  return requestMeta(await headers());
}

/**
 * Sign someone in: a new server-side session (with the idle timeout their
 * workspace sets) and a cookie that names it. `mfa` records whether a second
 * factor was checked.
 */
export async function startSession(user: AppUser, options: { mfa: boolean }): Promise<void> {
  const secret = requireSecret();
  const repos = getRepositories();
  const security = createSecurityService(repos);
  const ctx = await repos.users.provision(user);
  const policy = await security.policy(ctx.workspaceId);
  const session = await security.startSession(user, await currentRequestMeta(), { mfa: options.mfa, idleMs: policy.idleTimeoutMinutes * 60_000 });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSignedSession({ ...user, sid: session.id }, secret), { ...cookieOptions, maxAge: SESSION_TTL_SECONDS });
  cookieStore.delete(MFA_COOKIE_NAME);
}

/** Re-sign the cookie for the same session, after a change to the person's name. */
export async function setSessionCookie(user: AppUser) {
  if (!user.sid) throw new Error("No session to update.");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSignedSession(user, requireSecret()), { ...cookieOptions, maxAge: SESSION_TTL_SECONDS });
}

/** Sign out: the session is revoked on the server, not just forgotten by this browser. */
export async function endSession(reason = "logout") {
  const cookieStore = await cookies();
  const secret = sessionSecret();
  const user = secret ? decodeSignedSession(cookieStore.get(COOKIE_NAME)?.value, secret) : null;
  if (user?.sid) await createSecurityService(getRepositories()).revoke(user.externalId, user.sid, reason, await currentRequestMeta()).catch(() => undefined);
  cookieStore.delete(COOKIE_NAME);
}

/** @deprecated Use endSession, which also revokes the session on the server. */
export const clearSessionCookie = endSession;

/** After a correct password on an account with two-step sign-in: remember who is mid-sign-in, for five minutes. */
export async function setMfaChallenge(user: AppUser) {
  const cookieStore = await cookies();
  cookieStore.set(MFA_COOKIE_NAME, encodeSignedSession({ externalId: user.externalId, email: user.email, name: user.name }, `${requireSecret()}:mfa`, Date.now() - (SESSION_TTL_SECONDS - MFA_CHALLENGE_SECONDS) * 1000), { ...cookieOptions, maxAge: MFA_CHALLENGE_SECONDS });
}

export async function readMfaChallenge(): Promise<AppUser | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const cookieStore = await cookies();
  return decodeSignedSession(cookieStore.get(MFA_COOKIE_NAME)?.value, `${secret}:mfa`);
}

/** Start an OAuth login: remember a random state (and where to return) in a short-lived cookie. */
export async function beginOAuthLogin(returnTo: string): Promise<string> {
  const state = crypto.randomBytes(24).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, JSON.stringify({ state, returnTo }), { ...cookieOptions, maxAge: 600 });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.AUTH0_CLIENT_ID ?? "",
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    scope: "openid profile email",
    state,
    prompt: "login"
  });
  if (env.AUTH0_AUDIENCE) params.set("audience", env.AUTH0_AUDIENCE);
  return `https://${env.AUTH0_DOMAIN}/authorize?${params.toString()}`;
}

/** Verify the state returned by the provider matches the one we issued; consumes it either way. */
export async function consumeOAuthState(returnedState: string | null): Promise<{ returnTo: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STATE_COOKIE_NAME)?.value;
  cookieStore.delete(STATE_COOKIE_NAME);
  if (!raw || !returnedState) return null;
  try {
    const stored = JSON.parse(raw) as { state?: string; returnTo?: string };
    if (typeof stored.state !== "string") return null;
    const a = Buffer.from(stored.state);
    const b = Buffer.from(returnedState);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { returnTo: typeof stored.returnTo === "string" ? stored.returnTo : "/dashboard" };
  } catch {
    return null;
  }
}

class MockAuthService implements AuthService {
  async getCurrentUser() {
    return MOCK_USER;
  }

  async requireUser() {
    return MOCK_USER;
  }

  getLogoutUrl() {
    return "/";
  }
}

class SessionAuthService implements AuthService {
  constructor(private readonly provider: "password" | "auth0") {}

  /** The cookie must be signed by us and name a session the server still holds as live. */
  async getCurrentUser() {
    const secret = sessionSecret();
    if (!secret) return null;
    const cookieStore = await cookies();
    const user = decodeSignedSession(cookieStore.get(COOKIE_NAME)?.value, secret);
    if (!user?.sid) return null;
    const session = await createSecurityService(getRepositories()).validate(user.sid, user.externalId);
    return session ? { ...user, mfa: session.mfa } : null;
  }

  async requireUser() {
    const user = await this.getCurrentUser();
    if (!user) redirect("/login");
    return user;
  }

  getLogoutUrl() {
    if (this.provider === "password") return "/";
    const params = new URLSearchParams({
      client_id: env.AUTH0_CLIENT_ID ?? "",
      returnTo: `${env.NEXT_PUBLIC_APP_URL}/`
    });
    return `https://${env.AUTH0_DOMAIN}/v2/logout?${params.toString()}`;
  }
}

class UnconfiguredAuthService implements AuthService {
  async getCurrentUser() {
    return null;
  }

  async requireUser(): Promise<AppUser> {
    redirect("/login?error=auth_not_configured");
  }

  getLogoutUrl() {
    return "/";
  }
}

export function getAuthService(): AuthService {
  const mode = resolveAuthMode();
  if (mode === "mock") return new MockAuthService();
  if (mode === "auth0" || mode === "password") return new SessionAuthService(mode);
  return new UnconfiguredAuthService();
}

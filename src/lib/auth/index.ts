import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env, runtimeFlags } from "@/lib/env";
import { decodeSignedSession, encodeSignedSession, SESSION_TTL_SECONDS, type SessionUser } from "@/lib/auth/session";

export type AppUser = SessionUser;

export interface AuthService {
  getCurrentUser(): Promise<AppUser | null>;
  requireUser(): Promise<AppUser>;
  getLogoutUrl(): string;
}

const COOKIE_NAME = "pipes_session";
const STATE_COOKIE_NAME = "pipes_oauth_state";
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

export async function setSessionCookie(user: AppUser) {
  const secret = sessionSecret();
  if (!secret) throw new Error("PIPES_SESSION_SECRET (32+ characters) is required to create sessions in production.");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSignedSession(user, secret), { ...cookieOptions, maxAge: SESSION_TTL_SECONDS });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
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

  async getCurrentUser() {
    const secret = sessionSecret();
    if (!secret) return null;
    const cookieStore = await cookies();
    return decodeSignedSession(cookieStore.get(COOKIE_NAME)?.value, secret);
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

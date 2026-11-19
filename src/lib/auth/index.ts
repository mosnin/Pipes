import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requestMeta, type RequestMeta } from "@/domain/auth/security";
import { authSecret } from "@/lib/auth/secret";

// Better Auth is loaded only when a real sign-in mode needs it, so demo mode never compiles or runs it.
const loadAuth = async () => (await import("@/lib/auth/server")).getAuth();
import { runtimeFlags } from "@/lib/env";

/** Who is signed in, as the rest of Pipes sees them. */
export type AppUser = {
  externalId: string;
  email: string;
  name: string;
  /** The Better Auth session id. Absent only in demo mode. */
  sid?: string;
  /** Whether this session passed a second factor. */
  mfa?: boolean;
  /** When the session started and was last used, for the workspace's session rules. */
  sessionCreatedAt?: string;
  sessionUpdatedAt?: string;
  /** The session token, to end it on the server when a workspace rule says so. */
  sessionToken?: string;
};

export interface AuthService {
  getCurrentUser(): Promise<AppUser | null>;
  requireUser(): Promise<AppUser>;
  getLogoutUrl(): string;
}

export const MOCK_USER: AppUser = {
  externalId: "mock|usr_1",
  email: "owner@pipes.local",
  name: "Alex Rivera"
};

/**
 * How requests are authenticated (docs/security.md).
 * - mock: everyone is the demo owner. Allowed in development, or in production only when
 *   PIPES_USE_MOCKS=true is set explicitly (a deliberate demo deployment, never a default).
 * - password: Better Auth with email and password (and two-step sign-in).
 * - auth0: Better Auth signing in through Auth0 (OIDC).
 * - unconfigured: real mode was asked for without a secret. Fail closed: nobody is signed in.
 */
export type AuthMode = "mock" | "password" | "auth0" | "unconfigured";

export function resolveAuthMode(): AuthMode {
  if (runtimeFlags.useMocks) {
    const explicitlyEnabled = process.env.PIPES_USE_MOCKS === "true";
    return process.env.NODE_ENV !== "production" || explicitlyEnabled ? "mock" : "unconfigured";
  }
  if (!authSecret()) return "unconfigured";
  return runtimeFlags.hasAuth0 ? "auth0" : "password";
}

/** The caller's IP and user agent, for the auth journal. */
export async function currentRequestMeta(): Promise<RequestMeta> {
  return requestMeta(await headers());
}

/** One session lookup per request, however many components ask. */
const currentSession = cache(async (): Promise<AppUser | null> => {
  const auth = await loadAuth();
  const found = await auth.api.getSession({ headers: await headers() });
  if (!found) return null;
  const user = found.user as typeof found.user & { externalId?: string | null };
  const session = found.session as typeof found.session & { mfa?: boolean | null };
  return {
    externalId: user.externalId ?? `ba|${user.id}`,
    email: user.email,
    name: user.name || user.email,
    sid: session.id,
    mfa: Boolean(session.mfa),
    sessionCreatedAt: new Date(session.createdAt).toISOString(),
    sessionUpdatedAt: new Date(session.updatedAt).toISOString(),
    sessionToken: session.token
  };
});

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

class BetterAuthService implements AuthService {
  async getCurrentUser() {
    return currentSession();
  }

  async requireUser() {
    const user = await this.getCurrentUser();
    if (!user) redirect("/login");
    return user;
  }

  getLogoutUrl() {
    return "/";
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
  if (mode === "password" || mode === "auth0") return new BetterAuthService();
  return new UnconfiguredAuthService();
}

/** End a session on the server, for workspace rules that sign people out. */
export async function revokeSessionToken(token: string): Promise<void> {
  const ctx = await (await loadAuth()).$context;
  await ctx.internalAdapter.deleteSession(token);
}

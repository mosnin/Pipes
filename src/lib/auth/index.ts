import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { runtimeFlags, env } from "@/lib/env";

export type AppUser = {
  externalId: string;
  email: string;
  name: string;
};

export interface AuthService {
  getCurrentUser(): Promise<AppUser | null>;
  requireUser(): Promise<AppUser>;
  getLoginUrl(returnTo?: string): string;
  getLogoutUrl(): string;
}

const COOKIE_NAME = "pipes_session";

const mockUser: AppUser = {
  externalId: "mock|usr_1",
  email: "owner@pipes.local",
  name: "Alex Rivera"
};

function encodeSession(user: AppUser) {
  return Buffer.from(JSON.stringify(user)).toString("base64url");
}

function decodeSession(value?: string): AppUser | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as AppUser;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: AppUser) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession(user), { httpOnly: true, secure: false, sameSite: "lax", path: "/" });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

class MockAuthService implements AuthService {
  async getCurrentUser() {
    return mockUser;
  }

  async requireUser() {
    return mockUser;
  }

  getLoginUrl(returnTo = "/dashboard") {
    return `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  getLogoutUrl() {
    return "/api/auth/logout";
  }
}

class Auth0Service implements AuthService {
  async getCurrentUser() {
    const cookieStore = await cookies();
    return decodeSession(cookieStore.get(COOKIE_NAME)?.value);
  }

  async requireUser() {
    const user = await this.getCurrentUser();
    if (!user) redirect("/login");
    return user;
  }

  getLoginUrl(returnTo = "/dashboard") {
    const state = crypto.randomBytes(12).toString("hex");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.AUTH0_CLIENT_ID ?? "",
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      scope: "openid profile email",
      state,
      audience: env.AUTH0_AUDIENCE ?? "",
      prompt: "login"
    });
    return `https://${env.AUTH0_DOMAIN}/authorize?${params.toString()}&returnTo=${encodeURIComponent(returnTo)}`;
  }

  getLogoutUrl() {
    const params = new URLSearchParams({
      client_id: env.AUTH0_CLIENT_ID ?? "",
      returnTo: `${env.NEXT_PUBLIC_APP_URL}/`
    });
    return `https://${env.AUTH0_DOMAIN}/v2/logout?${params.toString()}`;
  }
}

export function getAuthService(): AuthService {
  if (runtimeFlags.useMocks || !runtimeFlags.hasAuth0) return new MockAuthService();
  return new Auth0Service();
}

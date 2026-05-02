import { runtimeFlags } from "@/lib/env";

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

const mockUser: AppUser = {
  externalId: "mock|usr_1",
  email: "owner@pipes.local",
  name: "Alex Rivera"
};

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

class ClerkService implements AuthService {
  async getCurrentUser(): Promise<AppUser | null> {
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    if (!clerkUser) return null;
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      "";
    return {
      externalId: `clerk|${clerkUser.id}`,
      email,
      name: clerkUser.fullName ?? clerkUser.username ?? "Pipes User"
    };
  }

  async requireUser(): Promise<AppUser> {
    const { auth } = await import("@clerk/nextjs/server");
    await auth.protect();
    const user = await this.getCurrentUser();
    if (!user) {
      // protect() should have already redirected; this is a defensive fallback.
      throw new Error("Authentication required");
    }
    return user;
  }

  getLoginUrl(returnTo = "/dashboard") {
    return `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
  }

  getLogoutUrl() {
    return "/api/auth/logout";
  }
}

export function getAuthService(): AuthService {
  if (runtimeFlags.useMocks || !runtimeFlags.hasClerk) return new MockAuthService();
  return new ClerkService();
}

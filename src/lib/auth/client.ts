"use client";

import { useUser as useClerkUser } from "@clerk/nextjs";
import { clientRuntimeFlags } from "@/lib/env/client";

type OptionalUser = {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: { firstName?: string | null } | null;
};

/**
 * Mock-safe replacement for Clerk's useUser(). In mock mode ClerkProvider is
 * not mounted (no remote clerk-js script), so calling Clerk hooks would throw.
 * clientRuntimeFlags.useMocks is constant for the lifetime of the bundle, so
 * the conditional hook call is stable across renders.
 */
export function useOptionalUser(): OptionalUser {
  if (clientRuntimeFlags.useMocks) {
    return { isSignedIn: true, isLoaded: true, user: null };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isSignedIn, isLoaded, user } = useClerkUser();
  return { isSignedIn: Boolean(isSignedIn), isLoaded, user: user ?? null };
}

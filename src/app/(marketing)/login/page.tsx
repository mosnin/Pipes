import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/marketing/auth-frame";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { PasswordLoginForm, ProviderSignInButton } from "@/components/marketing/password-forms";
import { resolveAuthMode } from "@/lib/auth";
import { safeReturnTo } from "@/lib/auth/session";

/* ==========================================================================
   GATE, /login. Shell suppressed, as Company OS's /signin is.

   Pipes signs in through its identity provider, so this page holds one
   action and nothing else. When a sign-in attempt comes back with
   `?error=`, the reason is printed above it.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Pipes workspace.",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth_not_configured: "Sign-in isn't configured on this deployment yet.",
  invalid_login_state: "That sign-in attempt expired or didn't match. Please try again.",
  token_exchange_failed: "We couldn't complete sign-in with the identity provider. Please try again.",
  profile_fetch_failed: "We couldn't load your profile from the identity provider. Please try again.",
  profile_incomplete: "Your identity provider didn't share an email address, which Pipes needs to sign you in.",
  session_idle: "You were signed out after a period without use, as your workspace asks. Sign in again.",
  session_expired: "Sessions last 7 days at most. Sign in again."
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string; reset?: string }> }) {
  const { error, returnTo, reset } = await searchParams;
  const passwordMode = resolveAuthMode() === "password";
  const message = error ? ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again." : undefined;
  return (
    <AuthFrame
      title="Log in"
      subtitle="Continue to your Pipes workspace."
      footer={
        <>
          No account?{" "}
          <Link href="/signup?source=login" className="t-link focus-ring-canvas rounded-2 focus-visible:outline-none">
            Create one
          </Link>
        </>
      }
    >
      {reset === "done" ? (
        <div className="mb-4" aria-live="polite">
          <Banner role="positive" title="Your password is changed">
            Every session was signed out. Log in with your new password.
          </Banner>
        </div>
      ) : null}
      {passwordMode ? (
        <PasswordLoginForm returnTo={safeReturnTo(returnTo)} initialError={message} />
      ) : (
        <div className="flex flex-col gap-4">
          {message ? (
            <div role="alert">
              <Banner role="critical" title="Sign-in didn't finish">
                {message}
              </Banner>
            </div>
          ) : null}
          <ProviderSignInButton callbackURL={safeReturnTo(returnTo)} />
        </div>
      )}
    </AuthFrame>
  );
}

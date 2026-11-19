"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { authCall, type AuthResult } from "@/lib/auth/client";

type Outcome = { ok: true; redirectTo: string } | { ok: false; message: string };

/** Runs one Better Auth call per submit and moves on, or shows the reason it did not work. */
function useForm(action: (fields: Record<string, string>) => Promise<Outcome>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (event: FormEvent<HTMLFormElement>, fields: Record<string, string>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await action(fields);
    if (result.ok) {
      router.push(result.redirectTo);
      router.refresh();
      return;
    }
    setError(result.message);
    setBusy(false);
  };
  return { busy, error, onSubmit };
}

const toOutcome = (r: AuthResult, redirectTo: string): Outcome => (r.ok ? { ok: true, redirectTo } : { ok: false, message: r.message });

/** Sign in through the deployment's identity provider (Auth0), with Better Auth handling state and PKCE. */
export function ProviderSignInButton({ callbackURL, label = "Continue" }: { callbackURL: string; label?: string }): ReactNode {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <div role="alert">
          <Banner role="critical" title="Sign-in didn't start">
            {error}
          </Banner>
        </div>
      ) : null}
      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await authCall<{ url?: string }>("/sign-in/oauth2", { providerId: "auth0", callbackURL });
          if (r.ok && r.data.url) window.location.href = r.data.url;
          else {
            setError(r.ok ? "The identity provider did not answer. Try again." : r.message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening sign-in" : label}
      </Button>
    </div>
  );
}

export function PasswordLoginForm({ returnTo, initialError }: { returnTo: string; initialError?: string }): ReactNode {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, onSubmit } = useForm(async (f) => {
    const r = await authCall<{ twoFactorRedirect?: boolean }>("/sign-in/email", { email: f.email, password: f.password, rememberMe: true });
    if (r.ok && r.data.twoFactorRedirect) return { ok: true, redirectTo: `/login/two-step?returnTo=${encodeURIComponent(returnTo)}` };
    return toOutcome(r, returnTo);
  });
  const message = error ?? initialError;
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => onSubmit(e, { email, password, returnTo })}>
      {message ? (
        <div role="alert">
          <Banner role="critical" title="Sign-in didn't finish">
            {message}
          </Banner>
        </div>
      ) : null}
      <Field label="Email" htmlFor="login-email">
        <Input id="login-email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Link href="/forgot-password" className="t-link t-caption focus-ring-canvas -mt-1 self-start rounded-2 focus-visible:outline-none">
        Forgot password?
      </Link>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? "Logging in" : "Log in"}
      </Button>
    </form>
  );
}

export function PasswordSignupForm({ source }: { source: string }): ReactNode {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, onSubmit } = useForm(async (f) => toOutcome(await authCall("/sign-up/email", { name: f.name, email: f.email, password: f.password }), "/onboarding"));
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        void fetch("/api/marketing/signal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "signup_started", metadata: { source } }) }).catch(() => undefined);
        return onSubmit(e, { name, email, password, returnTo: "/onboarding" });
      }}
    >
      {error ? (
        <div role="alert">
          <Banner role="critical" title="Your account wasn't created">
            {error}
          </Banner>
        </div>
      ) : null}
      <Field label="Your name" htmlFor="signup-name">
        <Input id="signup-name" autoComplete="name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Work email" htmlFor="signup-email">
        <Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password" htmlFor="signup-password" hint="At least 10 characters, and not one that has appeared in a leak.">
        <Input id="signup-password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? "Creating your workspace" : "Create workspace"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm(): ReactNode {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  if (sentTo) {
    return (
      <div className="flex flex-col gap-4" aria-live="polite">
        <Banner role="positive" title="Check your email">
          If {sentTo} has a Pipes account, a link to set a new password is on its way. It works once and expires after an hour.
        </Banner>
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        // The answer is the same whatever happens, so a failed request reads the same too.
        await authCall("/request-password-reset", { email, redirectTo: "/reset-password" });
        setBusy(false);
        setSentTo(email.trim());
      }}
    >
      <Field label="Email" htmlFor="forgot-email">
        <Input id="forgot-email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? "Sending" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }): ReactNode {
  const [password, setPassword] = useState("");
  // A reset signs out every session, so the person signs in again with the new password (and their second step).
  const { busy, error, onSubmit } = useForm(async (f) => toOutcome(await authCall("/reset-password", { token: f.token, newPassword: f.password }), "/login?reset=done"));
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => onSubmit(e, { token, password })}>
      {error ? (
        <div role="alert">
          <Banner role="critical" title="Your password wasn't changed">
            {error}
          </Banner>
        </div>
      ) : null}
      <Field label="New password" htmlFor="reset-password" hint="At least 10 characters, and not one that has appeared in a leak.">
        <Input id="reset-password" type="password" autoComplete="new-password" required minLength={10} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? "Saving" : "Set new password"}
      </Button>
    </form>
  );
}

/** The second step of sign-in: a six-digit code from the app, or a recovery code. */
export function TwoStepForm({ returnTo }: { returnTo: string }): ReactNode {
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const { busy, error, onSubmit } = useForm(async (f) => toOutcome(await authCall(recovery ? "/two-factor/verify-backup-code" : "/two-factor/verify-totp", { code: f.code.replace(recovery ? /\s+/g : /\D+/g, "") }), returnTo));
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => onSubmit(e, { code })}>
      {error ? (
        <div role="alert">
          <Banner role="critical" title="That code didn't work">
            {error}
          </Banner>
        </div>
      ) : null}
      {recovery ? (
        <Field label="Recovery code" htmlFor="two-step-code" hint="One of the codes you saved when you set up two-step sign-in. Each works once.">
          <Input id="two-step-code" autoComplete="off" required autoFocus value={code} onChange={(e) => setCode(e.target.value)} className="t-mono-hash" />
        </Field>
      ) : (
        <Field label="Code from your authenticator app" htmlFor="two-step-code">
          <Input id="two-step-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} className="t-mono-hash tabular-nums" />
        </Field>
      )}
      <button
        type="button"
        className="t-link t-caption focus-ring-canvas -mt-1 self-start rounded-2 focus-visible:outline-none"
        onClick={() => {
          setRecovery(!recovery);
          setCode("");
        }}
      >
        {recovery ? "Use a code from the app instead" : "Lost your phone? Use a recovery code"}
      </button>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? "Checking" : "Continue"}
      </Button>
    </form>
  );
}

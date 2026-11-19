"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

async function submit(url: string, body: Record<string, string>) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return (await res.json().catch(() => ({ ok: false, message: "Something went wrong. Try again." }))) as { ok: boolean; message?: string; redirectTo?: string };
}

function useForm(url: string, fallbackRedirect: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (event: FormEvent<HTMLFormElement>, fields: Record<string, string>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await submit(url, fields);
    if (result.ok) {
      router.push(result.redirectTo ?? fallbackRedirect);
      router.refresh();
      return;
    }
    setError(result.message ?? "Something went wrong. Try again.");
    setBusy(false);
  };
  return { busy, error, onSubmit };
}

export function PasswordLoginForm({ returnTo, initialError }: { returnTo: string; initialError?: string }): ReactNode {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, onSubmit } = useForm("/api/auth/login", returnTo);
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
  const { busy, error, onSubmit } = useForm("/api/auth/signup", "/onboarding");
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
        await submit("/api/auth/forgot", { email }).catch(() => undefined);
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
  const { busy, error, onSubmit } = useForm("/api/auth/reset", "/dashboard");
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
        {busy ? "Saving" : "Set password and log in"}
      </Button>
    </form>
  );
}

/** The second step of sign-in: a six-digit code from the app, or a recovery code. */
export function TwoStepForm({ returnTo }: { returnTo: string }): ReactNode {
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const { busy, error, onSubmit } = useForm("/api/auth/mfa", returnTo);
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => onSubmit(e, { code, returnTo })}>
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

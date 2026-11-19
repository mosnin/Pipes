"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { RelativeTime } from "@/components/ledger/relative-time";
import { StatusPill } from "@/components/ledger/status";
import { SettingsSection } from "@/components/settings/SettingsShell";
import { RecordTable } from "@/components/settings/record-table";
import { apiErrorMessage } from "@/components/shell/api-error";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

export type SecurityState = {
  mode: string;
  sessions: Array<{ id: string; createdAt: string; lastSeenAt: string; ip?: string; userAgent?: string; mfa: boolean; current: boolean }>;
  events: Array<{ id: string; at: string; type: string; ip?: string; userAgent?: string; detail?: Record<string, unknown> }>;
  mfa: { available: boolean; enabled: boolean; recoveryLeft: number; required: boolean };
};

export function useAccountSecurity() {
  const [state, setState] = useState<SecurityState | null>(null);
  const load = useCallback(async () => {
    const json = await fetch("/api/account/security", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);
    if (json?.ok) setState(json.data);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { state, load };
}

async function post(url: string, body: unknown, method = "POST") {
  try {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(body) });
    return (await res.json().catch(() => null)) as { ok: boolean; data?: any; error?: string; message?: string } | null;
  } catch {
    return null;
  }
}

/** A browser and OS from a user agent string, in words. Good enough to recognise your own devices. */
export function deviceName(ua?: string): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /node|undici|curl/i.test(ua) ? "A script" : "A browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

/**
 * Turn on two-step sign-in: add the key to an authenticator app, confirm
 * with a code, then save the recovery codes, which are shown once.
 */
export function TwoStepSetup({ onDone }: { onDone: () => void }): ReactNode {
  const [secret, setSecret] = useState<{ secret: string; url: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const begin = async () => {
    setBusy(true);
    setError(null);
    const json = await post("/api/account/mfa", { action: "begin" });
    setBusy(false);
    if (json?.ok) setSecret(json.data);
    else setError(apiErrorMessage(json, "Setup did not start. Try again."));
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const json = await post("/api/account/mfa", { action: "confirm", code });
    setBusy(false);
    if (json?.ok) setCodes(json.data.recoveryCodes);
    else setError(apiErrorMessage(json, "That code did not work."));
  };

  const download = () => {
    const blob = new Blob([`Pipes recovery codes\nEach code works once.\n\n${codes!.join("\n")}\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pipes-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (codes) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <Banner role="positive" title="Two-step sign-in is on">
            Save these recovery codes somewhere safe, such as a password manager. Each one signs you in once if you lose your phone. They are not shown again.
          </Banner>
          <ol className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-muted px-4 py-3 sm:grid-cols-5">
            {codes.map((c) => (
              <li key={c} className="t-mono-hash text-ink">
                {c}
              </li>
            ))}
          </ol>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => void navigator.clipboard?.writeText(codes.join("\n"))}>
            Copy
          </Button>
          <Button variant="secondary" size="sm" onClick={download}>
            Download
          </Button>
          <Button variant="primary" size="sm" onClick={onDone}>
            I saved them
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!secret) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          {error ? <Banner role="critical" title="Setup did not start">{error}</Banner> : null}
          <p className="t-body text-ink-2">Two-step sign-in asks for a code from an app on your phone after your password, so a stolen password is not enough to get in. Any authenticator app works, such as 1Password, Google Authenticator or Authy.</p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="primary" size="sm" onClick={() => void begin()} loading={busy} disabled={busy}>
            Set up two-step sign-in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={confirm}>
        <CardContent className="flex flex-col gap-4">
          {error ? <Banner role="critical" title="That code did not work">{error}</Banner> : null}
          <div className="flex flex-col gap-1.5">
            <span className="t-caption-medium text-ink">1. Add Pipes to your authenticator app</span>
            <span className="t-body text-ink-2">
              On your phone,{" "}
              <a href={secret.url} className="t-link">
                open this link
              </a>{" "}
              to add it, or type this key into the app:
            </span>
            <code className="t-mono-hash self-start break-all rounded-lg bg-muted px-3 py-2 text-ink">{secret.secret.match(/.{1,4}/g)?.join(" ")}</code>
          </div>
          <Field label="2. Enter the six-digit code it shows" htmlFor="setup-code">
            <Input id="setup-code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required value={code} onChange={(e) => setCode(e.target.value)} className="t-mono-hash w-[160px] tabular-nums" />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" variant="primary" size="sm" loading={busy} disabled={busy || code.replace(/\s/g, "").length < 6}>
            Turn on
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function TwoStepOff({ onDone }: { onDone: () => void }): ReactNode {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const json = await post("/api/account/mfa", { action: "disable", password, code });
    setBusy(false);
    if (!json?.ok) return toast(apiErrorMessage(json, "Two-step sign-in is still on."), { tone: "error" });
    toast("Two-step sign-in is off.");
    onDone();
  };
  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Turn off
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
      <Field label="Password" htmlFor="off-password" className="sm:flex-1">
        <Input id="off-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Code from your app" htmlFor="off-code" className="sm:w-[160px]">
        <Input id="off-code" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} className="t-mono-hash" />
      </Field>
      <Button type="submit" variant="destructive" size="md" loading={busy} disabled={busy}>
        Turn off
      </Button>
    </form>
  );
}

const EVENT_LABEL: Record<string, string> = {
  signup: "Account created",
  "login.succeeded": "Signed in",
  "login.failed": "Wrong password",
  "login.locked": "Account locked after failed attempts",
  "login.blocked_ip": "Too many attempts from one network",
  "mfa.challenged": "Asked for a two-step code",
  "mfa.failed": "Wrong two-step code",
  "mfa.enabled": "Two-step sign-in turned on",
  "mfa.disabled": "Two-step sign-in turned off",
  "mfa.recovery_used": "Signed in with a recovery code",
  "session.revoked": "Signed out a session",
  "session.revoked_all": "Signed out other sessions",
  "session.expired": "Session ended after inactivity",
  logout: "Signed out",
  "password.changed": "Password changed",
  "password.reset_requested": "Password reset requested",
  "password.reset": "Password reset",
  "policy.changed": "Workspace sign-in policy changed"
};

const WARN = new Set(["login.failed", "login.locked", "login.blocked_ip", "mfa.failed", "mfa.disabled", "mfa.recovery_used"]);

/** Two-step sign-in, live sessions and recent activity, for the Account page. */
export function AccountSecuritySections(): ReactNode {
  const { state, load } = useAccountSecurity();
  const toast = useToast();
  const [setup, setSetup] = useState(false);

  const signOut = async (id?: string) => {
    const json = await post(`/api/account/security?${id ? `id=${encodeURIComponent(id)}` : "scope=others"}`, null, "DELETE");
    if (!json?.ok) return toast(apiErrorMessage(json, "That session is still signed in."), { tone: "error" });
    toast(id ? "Signed out." : `Signed out ${json.data.signedOut} other ${json.data.signedOut === 1 ? "session" : "sessions"}.`);
    void load();
  };

  return (
    <>
      {state?.mfa.available ? (
        <SettingsSection title="Two-step sign-in" description="A code from your phone after your password.">
          {state.mfa.enabled ? (
            <Card>
              <CardFooter className="flex-wrap border-t-0">
                <span className="flex flex-wrap items-center gap-2">
                  <StatusPill role="positive">On</StatusPill>
                  <span className="t-body text-ink-2 tabular">
                    {state.mfa.recoveryLeft} of 10 recovery codes left{state.mfa.required ? ". Your workspace requires it." : "."}
                  </span>
                </span>
                {state.mfa.required ? null : <TwoStepOff onDone={() => void load()} />}
              </CardFooter>
            </Card>
          ) : setup ? (
            <TwoStepSetup
              onDone={() => {
                setSetup(false);
                void load();
              }}
            />
          ) : (
            <Card>
              <CardFooter className="flex-wrap border-t-0">
                <span className="flex flex-wrap items-center gap-2">
                  <StatusPill role={state.mfa.required ? "critical" : "neutral"}>Off</StatusPill>
                  <span className="t-body text-ink-2">{state.mfa.required ? "Your workspace requires two-step sign-in." : "Recommended for every account."}</span>
                </span>
                <Button variant="primary" size="sm" onClick={() => setSetup(true)}>
                  Set up
                </Button>
              </CardFooter>
            </Card>
          )}
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Where you are signed in"
        description="Each sign-in is a session that ends after a while without use. Sign out any you do not recognise, then change your password."
        action={
          state && state.sessions.length > 1 ? (
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              Sign out other sessions
            </Button>
          ) : undefined
        }
      >
        {state?.mode === "mock" ? (
          <Card padded>
            <p className="t-body text-ink-3">This is a demo deployment, so there are no real sessions.</p>
          </Card>
        ) : (
          <RecordTable
            loading={!state}
            noun="session"
            columns={[{ label: "Device" }, { label: "Last active", className: "w-[120px]" }, { label: "Actions", hidden: true, className: "w-[100px]" }]}
            rows={(state?.sessions ?? []).map((s) => ({
              key: s.id,
              cells: [
                <span key="d" className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2 text-ink">
                    {deviceName(s.userAgent)}
                    {s.current ? <StatusPill role="info">This device</StatusPill> : null}
                  </span>
                  <span className="t-caption text-ink-3">
                    {s.ip ?? "Unknown network"} · signed in <RelativeTime at={new Date(s.createdAt).getTime()} />
                    {s.mfa ? " with two-step" : ""}
                  </span>
                </span>,
                <RelativeTime key="l" at={new Date(s.lastSeenAt).getTime()} />,
                s.current ? (
                  <Button key="x" asChild variant="ghost" size="sm">
                    <a href="/api/auth/logout">Sign out</a>
                  </Button>
                ) : (
                  <Button key="x" variant="ghost" size="sm" onClick={() => void signOut(s.id)}>
                    Sign out
                  </Button>
                )
              ]
            }))}
            empty={null}
            footer={false}
          />
        )}
      </SettingsSection>

      <SettingsSection title="Recent security activity" description="Sign-ins, failed attempts and changes to how you sign in.">
        <RecordTable
          loading={!state}
          noun="event"
          columns={[{ label: "What happened" }, { label: "When", className: "w-[120px]" }]}
          rows={(state?.events ?? []).map((e) => ({
            key: e.id,
            cells: [
              <span key="e" className="flex min-w-0 flex-col">
                <span className={WARN.has(e.type) ? "text-critical-text" : "text-ink"}>{EVENT_LABEL[e.type] ?? e.type}</span>
                <span className="t-caption text-ink-3">{[e.ip, e.userAgent ? deviceName(e.userAgent) : null].filter(Boolean).join(" · ") || "No device recorded"}</span>
              </span>,
              <RelativeTime key="t" at={new Date(e.at).getTime()} />
            ]
          }))}
          empty={<p className="t-body px-4 py-6 text-ink-3">No security activity yet.</p>}
        />
      </SettingsSection>
    </>
  );
}

export function SecurityLoading(): ReactNode {
  return <Skeleton className="h-[120px] w-full rounded-[14px]" />;
}

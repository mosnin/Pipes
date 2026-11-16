"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList } from "@/components/settings/fact-list";
import { apiErrorMessage } from "@/components/shell/api-error";

type Account = { name: string; email: string; role: string; plan: string; authMode: string; hasPassword: boolean };

async function send(url: string, method: "PUT" | "POST", body: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    return json?.ok ? { ok: true, message: "" } : { ok: false, message: apiErrorMessage(json, "That did not save. Try again.") };
  } catch {
    return { ok: false, message: "Pipes could not be reached. Check your connection and try again." };
  }
}

/** Your own account: the name others see, the email you sign in with, your password, and the way out. */
export function AccountView(): ReactNode {
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => (json?.ok ? setAccount(json.data as Account) : setLoadError(apiErrorMessage(json, "Your account could not be loaded."))))
      .catch(() => setLoadError("Your account could not be loaded."));
  }, []);

  return (
    <SettingsShell title="Account" measure="prose" description="Your name, the email you sign in with, and your password.">
      {loadError ? (
        <Banner role="critical" title="Your account could not be loaded">
          {loadError}
        </Banner>
      ) : null}

      <SettingsSection title="Profile">
        {account ? <ProfileCard account={account} onRenamed={(name) => setAccount({ ...account, name })} /> : <LoadingCard />}
      </SettingsSection>

      {account?.hasPassword ? (
        <SettingsSection title="Password">
          <PasswordCard />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Session">
        <Card>
          <CardFooter className="border-t-0">
            <span className="t-body text-ink-2">Sign out of Pipes on this device.</span>
            <Button asChild variant="secondary" size="sm">
              <a href="/api/auth/logout">Sign out</a>
            </Button>
          </CardFooter>
        </Card>
      </SettingsSection>
    </SettingsShell>
  );
}

function LoadingCard(): ReactNode {
  return (
    <Card>
      <div className="flex flex-col gap-5 p-6">
        <Skeleton className="h-[14px] w-[220px]" />
        <Skeleton className="h-[32px] w-full" />
        <Skeleton className="h-[14px] w-[260px]" />
      </div>
    </Card>
  );
}

function ProfileCard({ account, onRenamed }: { account: Account; onRenamed: (name: string) => void }): ReactNode {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(account.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();
  const changed = trimmed !== account.name;

  return (
    <Card>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!trimmed || !changed || busy) return;
          setBusy(true);
          setError(null);
          const result = await send("/api/account", "PUT", { name: trimmed });
          setBusy(false);
          if (!result.ok) return setError(result.message);
          onRenamed(trimmed);
          toast("Name saved");
          router.refresh();
        }}
      >
        <div className="flex flex-col gap-6 p-6">
          <Field label="Name" htmlFor={`${id}-name`} error={error ?? undefined} hint="Shown to your teammates and on the work you sign.">
            <Input
              id={`${id}-name`}
              autoComplete="name"
              value={name}
              invalid={Boolean(error)}
              aria-describedby={`${id}-name-message`}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>
        <FactList className="border-t border-hairline" facts={[{ label: "Email", value: account.email }]} />
        <CardFooter inset>
          <span className="t-caption text-ink-3">Your email comes from how you sign in and cannot be changed here.</span>
          <Button type="submit" variant="primary" size="sm" disabled={!trimmed || !changed} loading={busy}>
            Save name
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordCard(): ReactNode {
  const id = useId();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!current || !next || busy) return;
          setBusy(true);
          setError(null);
          const result = await send("/api/account/password", "POST", { currentPassword: current, newPassword: next });
          setBusy(false);
          if (!result.ok) return setError(result.message);
          setCurrent("");
          setNext("");
          toast("Password changed");
        }}
      >
        <div className="flex flex-col gap-6 p-6">
          {error ? (
            <div role="alert">
              <Banner role="critical" title="Your password did not change">
                {error}
              </Banner>
            </div>
          ) : null}
          <Field label="Current password" htmlFor={`${id}-current`}>
            <Input id={`${id}-current`} type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New password" htmlFor={`${id}-next`} hint="At least 10 characters.">
            <Input id={`${id}-next`} type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
        </div>
        <CardFooter inset>
          <span />
          <Button type="submit" variant="primary" size="sm" disabled={!current || !next} loading={busy}>
            Change password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

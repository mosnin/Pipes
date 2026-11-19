"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { StatusPill } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { RecordTable } from "@/components/settings/record-table";
import { apiErrorMessage } from "@/components/shell/api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Check, Minus } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import type { SecurityPolicy } from "@/domain/auth/security";

type Data = {
  policy: SecurityPolicy;
  canChange: boolean;
  myRole: string;
  roles: Array<{ role: string; permissions: string[] }>;
  permissions: Array<{ key: string; min: string; label: string }>;
};

const IDLE_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "60", label: "1 hour" },
  { value: "480", label: "8 hours" },
  { value: "1440", label: "1 day" },
  { value: "10080", label: "7 days" }
];

/** Settings, Security: the workspace's sign-in policy, and what each role may do. */
export function WorkspaceSecurityView(): ReactNode {
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<{ requireMfa: "on" | "off"; idle: string; domains: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/settings/security", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!json?.ok) return;
        setData(json.data);
        const p = json.data.policy as SecurityPolicy;
        setForm({ requireMfa: p.requireMfa ? "on" : "off", idle: String(p.idleTimeoutMinutes), domains: p.allowedDomains.join(", ") });
      })
      .catch(() => undefined);
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    const body = { requireMfa: form.requireMfa === "on", idleTimeoutMinutes: Number(form.idle), allowedDomains: form.domains.split(/[\s,]+/).filter(Boolean) };
    const json = await fetch("/api/settings/security", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => r.json())
      .catch(() => null);
    setSaving(false);
    if (!json?.ok) return toast(apiErrorMessage(json, "The policy did not save."), { tone: "error" });
    setData((d) => (d ? { ...d, policy: json.data.policy } : d));
    toast("Policy saved. It applies from each member's next request.");
  };

  const idleOptions = form && !IDLE_OPTIONS.some((o) => o.value === form.idle) ? [...IDLE_OPTIONS, { value: form.idle, label: `${form.idle} minutes` }] : IDLE_OPTIONS;
  const roles = data?.roles.map((r) => r.role) ?? [];

  return (
    <SettingsShell
      title="Security"
      description="How people sign in to this workspace, and what each role is allowed to do. Rules here apply to every request, on every page, the API and MCP."
      meta={data ? <StatusPill role={data.policy.requireMfa ? "positive" : "neutral"}>{data.policy.requireMfa ? "Two-step required" : "Two-step optional"}</StatusPill> : undefined}
    >
      <SettingsSection title="Sign-in policy" description={data && !data.canChange ? "Only Admins and the Owner can change these." : undefined}>
        {data && form ? (
          <Card>
            <form onSubmit={save}>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <span className="t-caption-medium text-ink">Two-step sign-in</span>
                  <Segmented<"on" | "off">
                    label="Two-step sign-in"
                    value={form.requireMfa}
                    onValueChange={(v) => setForm({ ...form, requireMfa: v })}
                    disabled={!data.canChange}
                    options={[
                      { value: "off", label: "Optional" },
                      { value: "on", label: "Required" }
                    ]}
                    className="self-start"
                  />
                  <span className="t-caption text-ink-3">When required, anyone signing in with a password must set it up before they can do anything else. Accounts that use your identity provider follow its two-step rules.</span>
                </div>
                <Field label="Sign members out after this long without use" htmlFor="sec-idle" hint="New sign-ins get the new length; existing sessions keep theirs. No session lasts more than 7 days.">
                  <Select id="sec-idle" size="sm" value={form.idle} onValueChange={(v) => setForm({ ...form, idle: v })} options={idleOptions} disabled={!data.canChange} className="w-[200px]" />
                </Field>
                <Field label="Allowed email domains" htmlFor="sec-domains" hint="Leave empty to allow any email. When set, only these domains (and their subdomains) can be invited, join, or stay signed in. Your own domain must be in the list.">
                  <Input id="sec-domains" value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} disabled={!data.canChange} placeholder="acme.com, acme.co.uk" />
                </Field>
              </CardContent>
              {data.canChange ? (
                <CardFooter className="justify-end">
                  <Button type="submit" variant="primary" size="sm" loading={saving} disabled={saving}>
                    Save policy
                  </Button>
                </CardFooter>
              ) : null}
            </form>
          </Card>
        ) : (
          <Skeleton className="h-[280px] w-full rounded-[14px]" />
        )}
      </SettingsSection>

      <SettingsSection title="Roles" description={data ? `Each role can do everything the roles to its left can. Your role is ${data.myRole}.` : undefined}>
        <RecordTable
          loading={!data}
          noun="permission"
          columns={[{ label: "Permission" }, ...roles.map((role) => ({ label: role, className: "w-[86px] text-center" }))]}
          rows={(data?.permissions ?? []).map((p) => ({
            key: p.key,
            cells: [
              <span key="p" className="flex min-w-0 flex-col">
                <span className="text-ink">{p.label}</span>
                <span className="t-mono-hash text-ink-3">{p.key}</span>
              </span>,
              ...(data?.roles ?? []).map((r) =>
                r.permissions.includes(p.key) ? (
                  <span key={r.role} className="flex justify-center">
                    <Check aria-label={`${r.role} can`} className="size-4 text-positive-text" />
                  </span>
                ) : (
                  <span key={r.role} className="flex justify-center">
                    <Minus aria-label={`${r.role} cannot`} className="size-4 text-ink-4" />
                  </span>
                )
              )
            ]
          }))}
          empty={null}
          footer={false}
        />
      </SettingsSection>
    </SettingsShell>
  );
}

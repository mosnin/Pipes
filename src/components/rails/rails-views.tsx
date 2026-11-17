"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { KillSwitchCard } from "@/components/rails/kill-switch";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { apiErrorMessage } from "@/components/shell/api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { MorphArrow } from "@/components/micro/morph-arrow";
import type { KillSwitch, RailSettings, WorkflowRails } from "@/domain/rails/types";

type RailsState = { switches: KillSwitch[]; settings: RailSettings; canChange: boolean };

function useRails() {
  const [state, setState] = useState<RailsState | null>(null);
  const load = useCallback(async () => {
    const json = await fetch("/api/rails", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (json?.ok) setState(json.data);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { state, load };
}

/** A number field that keeps what you type and reports a clean number or nothing. */
function NumberField({ id, label, hint, value, onChange, unit, max }: { id: string; label: string; hint?: string; value: string; onChange: (text: string) => void; unit?: string; max?: number }): ReactNode {
  const n = Number(value);
  const invalid = value.trim() !== "" && (!Number.isFinite(n) || n <= 0 || (max !== undefined && n > max));
  return (
    <Field label={unit ? `${label} (${unit})` : label} htmlFor={id} hint={hint} error={invalid ? `Use a number above 0${max ? ` and up to ${max}` : ""}.` : undefined}>
      <Input id={id} inputMode="decimal" value={value} invalid={invalid} aria-describedby={`${id}-message`} onChange={(e) => onChange(e.target.value)} placeholder="No limit" className="tabular-nums" />
    </Field>
  );
}

const num = (text: string) => {
  const n = Number(text);
  return text.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Settings, Execution rails: the workspace stop button, per-token limits, and which workflows are stopped. */
export function WorkspaceRailsView(): ReactNode {
  const { state, load } = useRails();
  const toast = useToast();
  const [limits, setLimits] = useState<{ perMinute: string; writesPerMinute: string; startsPerHour: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state && !limits) {
      const l = state.settings.tokenLimits;
      setLimits({ perMinute: String(l.perMinute), writesPerMinute: String(l.writesPerMinute), startsPerHour: String(l.startsPerHour) });
    }
  }, [state, limits]);

  const saveLimits = async () => {
    if (!limits) return;
    setSaving(true);
    const json = await fetch("/api/rails", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenLimits: { perMinute: num(limits.perMinute), writesPerMinute: num(limits.writesPerMinute), startsPerHour: num(limits.startsPerHour) } })
    })
      .then((r) => r.json())
      .catch(() => null);
    setSaving(false);
    if (!json?.ok) toast(apiErrorMessage(json, "The limits did not save."), { tone: "error" });
    else {
      toast("Token limits saved");
      const l = json.data.settings.tokenLimits;
      setLimits({ perMinute: String(l.perMinute), writesPerMinute: String(l.writesPerMinute), startsPerHour: String(l.startsPerHour) });
      void load();
    }
  };

  const workspaceSwitch = state?.switches.find((s) => s.scope === "workspace");
  const stopped = state?.switches.filter((s) => s.scope === "workflow" && s.mode !== "off") ?? [];

  return (
    <SettingsShell
      title="Execution rails"
      description="The limits every agent run passes through, and the switch that stops them. Each workflow can add its own budgets on its Rails page."
      measure="prose"
    >
      <SettingsSection title="Stop runs">
        {state ? <KillSwitchCard scope="workspace" current={workspaceSwitch} canChange={state.canChange} onChanged={load} /> : <Skeleton className="h-[120px] w-full rounded-[14px]" />}
      </SettingsSection>

      <SettingsSection title="Limits for every agent token" description="Applied to each API token and OAuth client on its own, so one busy or leaked token cannot use up the workspace.">
        <Card>
          <CardContent>
            {limits ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField id="limit-calls" label="Calls a minute" value={limits.perMinute} max={240} onChange={(v) => setLimits({ ...limits, perMinute: v })} />
                <NumberField id="limit-writes" label="Run changes a minute" value={limits.writesPerMinute} max={240} onChange={(v) => setLimits({ ...limits, writesPerMinute: v })} />
                <NumberField id="limit-starts" label="Runs started an hour" value={limits.startsPerHour} onChange={(v) => setLimits({ ...limits, startsPerHour: v })} />
              </div>
            ) : (
              <Skeleton className="h-[60px] w-full" />
            )}
          </CardContent>
          {state?.canChange ? (
            <CardFooter inset>
              <span className="t-caption text-ink-3">Calls a minute can be at most 240.</span>
              <Button variant="primary" size="sm" onClick={saveLimits} loading={saving}>
                Save limits
              </Button>
            </CardFooter>
          ) : null}
        </Card>
      </SettingsSection>

      <SettingsSection title="Stopped workflows">
        <Card>
          {stopped.length === 0 ? (
            <CardContent>
              <p className="t-body text-ink-2">No workflow is paused or halted on its own.</p>
            </CardContent>
          ) : (
            <ul>
              {stopped.map((s) => (
                <li key={s.targetId} className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3 first:border-t-0">
                  <span className="min-w-0">
                    <span className="t-body-medium block text-ink">{s.mode === "halt" ? "Halted" : "Paused"}</span>
                    <span className="t-caption block truncate text-ink-3">{s.reason ?? "No reason given"}</span>
                  </span>
                  <Button asChild variant="secondary" size="xs">
                    <Link href={`/systems/${s.targetId}/rails`} className="group/arrow">
                      Open
                      <MorphArrow className="-mr-0.5" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </SettingsSection>
    </SettingsShell>
  );
}

const MINUTE = 60_000;

/** A workflow's Rails page: its own stop button, and the budgets and concurrency every run of it gets. */
export function WorkflowRailsView({ systemId }: { systemId: string }): ReactNode {
  const { state, load } = useRails();
  const toast = useToast();
  const [form, setForm] = useState<{ maxSteps: string; maxMinutes: string; maxDollars: string; maxActive: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/systems/${systemId}/design`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        const rails = (json?.data?.rails ?? {}) as WorkflowRails;
        setForm({
          maxSteps: rails.budgets?.maxSteps ? String(rails.budgets.maxSteps) : "",
          maxMinutes: rails.budgets?.maxDurationMs ? String(Math.round(rails.budgets.maxDurationMs / MINUTE)) : "",
          maxDollars: rails.budgets?.maxCostMicros ? String(rails.budgets.maxCostMicros / 1_000_000) : "",
          maxActive: rails.concurrency?.maxActiveRuns ? String(rails.concurrency.maxActiveRuns) : ""
        });
      })
      .catch(() => setForm({ maxSteps: "", maxMinutes: "", maxDollars: "", maxActive: "" }));
  }, [systemId]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const minutes = num(form.maxMinutes);
    const dollars = num(form.maxDollars);
    const rails: WorkflowRails = {
      budgets: { maxSteps: num(form.maxSteps), maxDurationMs: minutes ? Math.round(minutes * MINUTE) : undefined, maxCostMicros: dollars ? Math.round(dollars * 1_000_000) : undefined },
      concurrency: { maxActiveRuns: num(form.maxActive) }
    };
    const json = await fetch(`/api/systems/${systemId}/design`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ rails }) })
      .then((r) => r.json())
      .catch(() => null);
    setSaving(false);
    toast(json?.ok ? "Rails saved. New runs get them." : apiErrorMessage(json, "The rails did not save."), json?.ok ? undefined : { tone: "error" });
  };

  return (
    <SettingsShell title="Rails" description="Limits every run of this workflow gets when it starts. Runs already in flight keep the rails they started with." measure="prose">
      <SettingsSection title="Stop runs">
        {state ? (
          <KillSwitchCard scope="workflow" systemId={systemId} current={state.switches.find((s) => s.scope === "workflow" && s.targetId === systemId)} canChange={state.canChange} onChanged={load} />
        ) : (
          <Skeleton className="h-[120px] w-full rounded-[14px]" />
        )}
      </SettingsSection>

      <SettingsSection title="Budgets per run" description="When a run reaches its step or time budget, it ends as failed with the reason. A completion that would go over the cost budget is refused.">
        <Card>
          <CardContent>
            {form ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField id="rails-steps" label="Most steps" hint="Counts loops and send-backs." value={form.maxSteps} onChange={(v) => setForm({ ...form, maxSteps: v })} />
                <NumberField id="rails-minutes" label="Deadline" unit="minutes" hint="Waiting for a person counts." value={form.maxMinutes} onChange={(v) => setForm({ ...form, maxMinutes: v })} />
                <NumberField id="rails-cost" label="Most spend" unit="dollars" hint="As agents report it on each step." value={form.maxDollars} onChange={(v) => setForm({ ...form, maxDollars: v })} />
                <NumberField id="rails-active" label="Active runs at once" hint="New starts over this are refused." value={form.maxActive} onChange={(v) => setForm({ ...form, maxActive: v })} />
              </div>
            ) : (
              <Skeleton className="h-[120px] w-full" />
            )}
          </CardContent>
          <CardFooter inset>
            <span className="t-caption text-ink-3">Step limits live on each step in the editor.</span>
            <Button variant="primary" size="sm" onClick={save} loading={saving} disabled={!form}>
              Save rails
            </Button>
          </CardFooter>
        </Card>
      </SettingsSection>
    </SettingsShell>
  );
}

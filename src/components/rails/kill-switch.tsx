"use client";

import { useState, type ReactNode } from "react";
import { HoldConfirm } from "@/components/micro/hold-confirm";
import { StatusPill } from "@/components/ledger/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { apiErrorMessage } from "@/components/shell/api-error";
import { useToast } from "@/components/ui/toast";
import type { KillSwitch, KillSwitchMode } from "@/domain/rails/types";

const MODE_LABEL: Record<KillSwitchMode, string> = { off: "Runs on", pause: "Paused", halt: "Halted" };
const MODE_HELP: Record<KillSwitchMode, string> = {
  off: "Agents can start runs and complete steps as normal.",
  pause: "New runs are refused and no step can be completed. Runs in flight wait where they are. Approvals and cancels still work.",
  halt: "Everything a pause does, and every active run here is canceled now."
};

/**
 * The stop button. Pause and halt are owner and admin actions; halt cancels
 * runs, so it is hold to confirm. See docs/kill_switch.md.
 */
export function KillSwitchCard({
  scope,
  systemId,
  current,
  canChange,
  onChanged
}: {
  scope: "workspace" | "workflow";
  systemId?: string;
  current?: KillSwitch;
  canChange: boolean;
  onChanged: () => void;
}): ReactNode {
  const toast = useToast();
  const mode = current?.mode ?? "off";
  const [next, setNext] = useState<KillSwitchMode>(mode);
  const [reason, setReason] = useState(current?.reason ?? "");
  const [saving, setSaving] = useState(false);
  const where = scope === "workspace" ? "this workspace" : "this workflow";

  const apply = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/rails", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scope, systemId, mode: next, reason: reason.trim() || undefined }) });
      const json = await res.json().catch(() => null);
      if (!json?.ok) toast(apiErrorMessage(json, "The switch did not change."), { tone: "error" });
      else {
        const canceled = json.data.canceled as number;
        toast(next === "off" ? "Runs are back on" : next === "pause" ? "Runs paused" : `Runs halted${canceled ? `, ${canceled} canceled` : ""}`);
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="t-body-strong text-ink">Runs in {where}</p>
            <p className="t-caption text-ink-3">{MODE_HELP[mode]}</p>
          </div>
          <StatusPill role={mode === "off" ? "positive" : mode === "pause" ? "caution" : "critical"}>{MODE_LABEL[mode]}</StatusPill>
        </div>
        {current && mode !== "off" && current.reason ? <p className="t-caption text-ink-2">Reason: {current.reason}</p> : null}
        {canChange ? (
          <>
            <Segmented<KillSwitchMode>
              label={`Runs in ${where}`}
              size="sm"
              value={next}
              onValueChange={setNext}
              options={[
                { value: "off", label: "On" },
                { value: "pause", label: "Pause" },
                { value: "halt", label: "Halt" }
              ]}
            />
            {next !== mode ? <p className="t-caption text-ink-3">{MODE_HELP[next]}</p> : null}
            {next !== "off" ? (
              <Field label="Reason" htmlFor={`switch-reason-${scope}`} hint="Agents see this with every refusal.">
                <Input id={`switch-reason-${scope}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Refunds are paying twice" />
              </Field>
            ) : null}
          </>
        ) : (
          <p className="t-caption text-ink-3">Only owners and admins can pause or halt runs.</p>
        )}
      </CardContent>
      {canChange && next !== mode ? (
        <CardFooter inset>
          <span className="t-caption text-ink-3">{next === "halt" ? "Halting cancels every active run here." : "Takes effect on the next call."}</span>
          {next === "halt" ? (
            <HoldConfirm label="Halt runs" confirmedLabel="Halted" question={`Halt runs in ${where}? Every active run here is canceled now, and new runs are refused until you turn runs back on.`} onConfirm={apply} />
          ) : (
            <Button variant="primary" size="sm" onClick={apply} loading={saving}>
              {next === "off" ? "Turn runs back on" : "Pause runs"}
            </Button>
          )}
        </CardFooter>
      ) : null}
    </Card>
  );
}

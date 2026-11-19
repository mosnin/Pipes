"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { StatusPill } from "@/components/ledger/status";
import { RelativeTime } from "@/components/ledger/relative-time";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList } from "@/components/settings/fact-list";
import { RecordTable } from "@/components/settings/record-table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { DecisionReceipt } from "@/domain/decisions/types";

type Calibration = {
  mode: "off" | "shadow" | "live";
  total: number;
  costMicros: number;
  bands: Array<{ band: string; decisions: number; labelled: number; agreement: number | null }>;
  byKind: Array<{ kind: string; decisions: number; automated: number; suggested: number; toPeople: number; fallbacks: number }>;
};

type Data = {
  mode: "off" | "shadow" | "live";
  provider: "openrouter" | "mock" | "none";
  fastModels: string[];
  deliberateModels: string[];
  receipts: Array<Omit<DecisionReceipt, "state">>;
  calibration: Calibration;
};

const MODE: Record<Data["mode"], { role: "positive" | "caution" | "neutral"; label: string; help: string }> = {
  live: { role: "positive", label: "Live", help: "Pipes acts where a step allows it and the policy is sure; otherwise it suggests or asks a person." },
  shadow: { role: "caution", label: "Shadow", help: "Pipes asks and records every decision and shows suggestions, but never acts on its own. Use this until the numbers below are good enough." },
  off: { role: "neutral", label: "Off", help: "No decision model is called. Set OPENROUTER_API_KEY to turn decisions on." }
};

const KIND: Record<string, string> = { route: "Routes", outcome_map: "Outcome matching", done_when: "Finish line checks", approval_triage: "Approval suggestions" };
const ACTION: Record<string, { role: "positive" | "info" | "caution" | "neutral"; label: string }> = {
  auto: { role: "positive", label: "Acted" },
  suggest: { role: "info", label: "Suggested" },
  human: { role: "caution", label: "To a person" },
  fallback: { role: "neutral", label: "No answer" }
};

const dollars = (micros: number) => "$" + (micros / 1_000_000).toFixed(4);

/** Settings, Decisions: what decision models are doing in this workspace, and how often they are right. */
export function DecisionsView(): ReactNode {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    void fetch("/api/decisions", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => json?.ok && setData(json.data))
      .catch(() => undefined);
  }, []);

  const mode = data ? MODE[data.mode] : null;
  return (
    <SettingsShell
      title="Decisions"
      description="Pipes can judge parts of a run with decision models: which route a step should take, what an agent's outcome meant, whether a step met its finish line, and what to do with an approval. The model makes judgments; rules in code decide what happens."
      meta={mode ? <StatusPill role={mode.role}>{mode.label}</StatusPill> : undefined}
    >
      <SettingsSection title="How it is set up">
        <Card>
          {data && mode ? (
            <FactList
              facts={[
                { label: "Mode", value: mode.help },
                { label: "Provider", value: data.provider === "openrouter" ? "OpenRouter" : data.provider === "mock" ? "A built-in stand-in (mock mode)" : "None" },
                { label: "Fast model", value: <span className="t-mono-hash">{data.fastModels.join(", ")}</span> },
                { label: "Second opinion", value: data.deliberateModels.length ? <span className="t-mono-hash">{data.deliberateModels.join(", ")}</span> : <span className="text-ink-3">Not set</span> },
                { label: "Spend so far", value: <span className="tabular">{dollars(data.calibration.costMicros)}</span> }
              ]}
            />
          ) : (
            <Skeleton className="m-4 h-[120px]" />
          )}
        </Card>
      </SettingsSection>

      <SettingsSection title="How often Pipes is right" description="Each decision is compared with what the person or agent then actually did. Raise a step's trust only when its band agrees almost every time.">
        <RecordTable
          loading={!data}
          noun="band"
          columns={[{ label: "How sure Pipes was" }, { label: "Decisions", numeric: true, className: "w-[110px]" }, { label: "Checked", numeric: true, className: "w-[110px]" }, { label: "Agreed", numeric: true, className: "w-[110px]" }]}
          rows={(data?.calibration.bands ?? []).map((b) => ({
            key: b.band,
            cells: [b.band, String(b.decisions), String(b.labelled), b.agreement === null ? <span key="n" className="text-ink-3">Not yet</span> : `${Math.round(b.agreement * 100)}%`]
          }))}
          empty={null}
          footer={false}
        />
      </SettingsSection>

      <SettingsSection title="What it was asked">
        <RecordTable
          loading={!data}
          noun="kind"
          columns={[{ label: "Kind" }, { label: "Total", numeric: true }, { label: "Acted", numeric: true }, { label: "Suggested", numeric: true }, { label: "To a person", numeric: true }]}
          rows={(data?.calibration.byKind ?? []).map((k) => ({ key: k.kind, cells: [KIND[k.kind] ?? k.kind, String(k.decisions), String(k.automated), String(k.suggested), String(k.toPeople)] }))}
          empty={null}
          footer={false}
        />
      </SettingsSection>

      <SettingsSection title="Recent decisions">
        <RecordTable
          loading={!data}
          noun="decision"
          columns={[{ label: "Kind", className: "w-[150px]" }, { label: "What Pipes concluded" }, { label: "Result", className: "w-[120px]" }, { label: "When", className: "w-[120px]" }]}
          rows={(data?.receipts ?? []).slice(0, 40).map((r) => ({
            key: r.id,
            cells: [
              KIND[r.kind] ?? r.kind,
              <span key="c" className="flex min-w-0 flex-col">
                <span className="truncate text-ink">
                  {r.choice ? r.options.find((o) => o.id === r.choice)?.label ?? r.choice : r.probability !== undefined ? `${Math.round(r.probability * 100)}% likely met` : "No answer"}
                  {r.confidence !== undefined ? <span className="tabular text-ink-3">{` · ${Math.round(r.confidence * 100)}% sure`}</span> : null}
                </span>
                <span className="t-caption truncate text-ink-3">
                  {r.reason}
                  {r.label ? (r.label.agreed ? " Then confirmed." : " Then overruled.") : ""}
                  {r.runId ? (
                    <>
                      {" "}
                      <Link href={`/runs/${r.runId}`} className="t-link">
                        Open run
                      </Link>
                    </>
                  ) : null}
                </span>
              </span>,
              <StatusPill key="a" role={ACTION[r.action]?.role ?? "neutral"}>{ACTION[r.action]?.label ?? r.action}</StatusPill>,
              <RelativeTime key="t" at={new Date(r.at).getTime()} />
            ]
          }))}
          empty={<EmptyState art="activity" title="No decisions yet" body="Turn on decisions on a Decision step, or a finish line check on any step, in the editor. Every judgment appears here." className="py-8" />}
        />
      </SettingsSection>
    </SettingsShell>
  );
}

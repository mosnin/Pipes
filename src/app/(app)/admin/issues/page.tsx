"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Toolbar } from "@/components/ui/page-header";
import { CellStack } from "@/components/data/table";
import { RelativeTime } from "@/components/ledger/relative-time";
import { StatusPill, type SignalRole } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { RecordTable } from "@/components/settings/record-table";
import { sentenceCase } from "@/components/settings/fact-list";
import { OperatorGate } from "@/components/admin/operator-gate";
import { apiErrorMessage } from "@/components/shell/api-error";

const CATEGORY_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "ux", label: "UX" },
  { value: "feature_request", label: "Feature request" },
  { value: "reliability", label: "Reliability" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" }
];

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "closed", label: "Closed" }
];

const SEVERITY_ROLE: Record<string, SignalRole> = { high: "critical", medium: "caution", low: "neutral" };

const categoryLabel = (value: string) => CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value;

export default function AdminIssuesPage() {
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (status !== "all") q.set("status", status);
    if (category !== "all") q.set("category", category);
    const res = await fetch(`/api/admin/issues?${q.toString()}`);
    const body = await res.json();
    if (!body.ok) {
      setError(apiErrorMessage(body, "Issue triage could not be loaded."));
      return;
    }
    setError("");
    setData(body.data);
  }, [status, category]);

  useEffect(() => { void load(); }, [load]);

  const filtered = status !== "all" || category !== "all";

  return (
    <SettingsShell
      title="Issue triage"
      description="Feedback from the beta, newest first. Move each item from new to reviewing to closed."
      meta={data ? <span className="t-caption tabular text-ink-3">{data.items.length} {data.items.length === 1 ? "item" : "items"} · {data.openCount} open</span> : null}
    >
      <Toolbar>
        <div className="w-[160px]">
          <Select aria-label="Filter by status" size="sm" value={status} onValueChange={setStatus} options={[{ value: "all", label: "All statuses" }, ...STATUS_OPTIONS]} />
        </div>
        <div className="w-[180px]">
          <Select aria-label="Filter by category" size="sm" value={category} onValueChange={setCategory} options={[{ value: "all", label: "All categories" }, ...CATEGORY_OPTIONS]} />
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </Toolbar>

      {error ? <OperatorGate error={error} /> : null}

      {!data ? null : (
        <>
          <SettingsSection title="Feedback">
            <RecordTable
              noun="item"
              columns={[
                { label: "Time", className: "w-[120px]" },
                { label: "Summary" },
                { label: "Category", className: "w-[140px]" },
                { label: "Severity", className: "w-[104px]" },
                { label: "Page" },
                { label: "Status", className: "w-[144px]" }
              ]}
              rows={data.items.map((item: any) => ({
                key: item.id,
                cells: [
                  <RelativeTime key="t" at={Date.parse(item.createdAt)} />,
                  <CellStack key="s" title={item.summary} meta={item.id} />,
                  <span key="c" className="text-ink-2">{categoryLabel(item.category)}</span>,
                  <StatusPill key="v" role={SEVERITY_ROLE[item.severity] ?? "neutral"}>{sentenceCase(item.severity)}</StatusPill>,
                  item.page ? <span key="p" className="t-mono-hash text-ink-2">{item.page}</span> : null,
                  <Select
                    key="st"
                    aria-label={`Status for ${item.summary}`}
                    size="sm"
                    variant="quiet"
                    value={item.status}
                    onValueChange={async (next) => { await fetch("/api/admin/issues", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, status: next }) }); void load(); }}
                    options={STATUS_OPTIONS}
                  />
                ]
              }))}
              empty={
                <EmptyState
                  variant={filtered ? "filtered" : "never"}
                  title={filtered ? "No feedback matches these filters" : "No feedback yet"}
                  body={filtered ? "Widen the status or category filter." : "Feedback people send from Settings lands here for triage."}
                  className="py-9"
                />
              }
            />
          </SettingsSection>

          <SettingsSection title="Failure rollup">
            <RecordTable
              noun="group"
              footer={false}
              columns={[{ label: "Group" }, { label: "Count", numeric: true, className: "w-[120px]" }]}
              rows={data.failureGroups.map((group: any) => ({ key: group.key, cells: [group.label, String(group.count)] }))}
              empty={<EmptyState title="No failure groups" className="py-9" />}
            />
          </SettingsSection>
        </>
      )}
    </SettingsShell>
  );
}

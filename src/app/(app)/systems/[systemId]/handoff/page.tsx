"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardToolbar } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { CellStack } from "@/components/data/table";
import { StatusPill, type SignalRole } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { RecordTable } from "@/components/settings/record-table";
import { sentenceCase } from "@/components/settings/fact-list";
import { apiErrorMessage } from "@/components/shell/api-error";
import { useToast } from "@/components/ui/toast";

const TARGETS = [
  { value: "human_engineer", label: "Human engineer" },
  { value: "codex", label: "Codex" },
  { value: "claude_code", label: "Claude Code" },
  { value: "general_llm_builder", label: "General LLM builder" }
];

const STATUS_ROLE: Record<string, SignalRole> = {
  approved: "positive",
  exported: "positive",
  ready: "positive",
  draft: "caution",
  generated: "caution",
  pending_review: "caution",
  in_review: "info",
  revision_requested: "critical",
  rejected: "critical"
};

const targetLabel = (value: string) => TARGETS.find((t) => t.value === value)?.label ?? value;
const statusPill = (status: string) => <StatusPill role={STATUS_ROLE[status] ?? "neutral"}>{sentenceCase(status)}</StatusPill>;

export default function SystemHandoffPage({ params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = use(params);
  const [target, setTarget] = useState("human_engineer");
  const [packages, setPackages] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [sandboxArtifacts, setSandboxArtifacts] = useState<any[]>([]);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch(`/api/handoff/systems/${systemId}/packages`);
    const data = await res.json();
    setPackages(data.data ?? []);
    setLoaded(true);
  }, [systemId]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    const res = await fetch(`/api/handoff/systems/${systemId}/packages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!data?.ok) toast(apiErrorMessage(data, "The package could not be generated."));
    await load();
  };

  const open = async (id: string) => {
    const detail = await fetch(`/api/handoff/packages/${id}`).then((r) => r.json());
    setSelected(detail.data);
    const runId = detail.data?.package?.sourceRunId;
    if (runId) {
      const arts = await fetch(`/api/agent/runs/${runId}/sandbox/artifacts`).then((r) => r.json());
      setSandboxArtifacts(arts.data ?? []);
    } else setSandboxArtifacts([]);
  };

  const review = async (body: Record<string, string>) => {
    const res = await fetch(`/api/handoff/packages/${selected.package.id}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const result = await res?.json().catch(() => null);
    if (!result?.ok) toast(apiErrorMessage(result, "The review did not save."));
    const updated = await fetch(`/api/handoff/packages/${selected.package.id}`).then((r) => r.json());
    setSelected(updated.data);
    await load();
  };

  return (
    <SettingsShell
      title="Handoff"
      description="Build-ready packages generated from the accepted design of this workflow, for whoever implements it."
      actions={
        <>
          <div className="w-[200px]">
            <Select aria-label="Handoff target" size="sm" value={target} onValueChange={setTarget} options={TARGETS} />
          </div>
          <Button variant="primary" size="sm" onClick={() => void generate()}>
            Generate package
          </Button>
        </>
      }
    >
      <SettingsSection title="Packages">
        <RecordTable
          loading={!loaded}
          noun="package"
          columns={[
            { label: "Title" },
            { label: "Target", className: "w-[180px]" },
            { label: "Status", className: "w-[160px]" },
            { label: "Version", numeric: true, className: "w-[88px]" },
            { label: "Actions", hidden: true, className: "w-[88px]" }
          ]}
          rows={packages.map((p) => ({
            key: p.id,
            cells: [
              <CellStack key="t" title={p.title} meta={p.id} />,
              <span key="g" className="text-ink-2">{targetLabel(p.target)}</span>,
              statusPill(p.status),
              String(p.version),
              <Button key="o" variant={selected?.package?.id === p.id ? "secondary" : "ghost"} size="sm" aria-label={`Open ${p.title}`} onClick={() => void open(p.id)}>
                Open
              </Button>
            ]
          }))}
          empty={<EmptyState title="No handoff packages" body="Generate a package once the workflow design is accepted." className="py-9" />}
        />
      </SettingsSection>

      {selected ? (
        <SettingsSection title={selected.package.title} action={statusPill(selected.package.status)}>
          <div className="flex flex-col gap-7">
            <RecordTable
              noun="artifact"
              columns={[{ label: "Artifact" }, { label: "Type", className: "w-[200px]" }, { label: "Target", className: "w-[180px]" }]}
              rows={(selected.artifacts ?? []).map((a: any, index: number) => ({
                key: a.id ?? `${a.title}-${index}`,
                cells: [a.title, <span key="y" className="t-mono-hash text-ink-2">{a.type}</span>, <span key="g" className="text-ink-2">{targetLabel(a.target)}</span>]
              }))}
              empty={<EmptyState title="No artifacts in this package" className="py-9" />}
            />

            {sandboxArtifacts.length > 0 ? (
              <RecordTable
                noun="sandbox artifact"
                columns={[{ label: "Sandbox artifact" }, { label: "Type", className: "w-[200px]" }, { label: "Status", className: "w-[140px]" }, { label: "Trust", className: "w-[120px]" }]}
                rows={sandboxArtifacts.map((a: any) => ({
                  key: a.artifactId,
                  cells: [
                    <span key="i" className="t-mono-hash">{a.artifactId}</span>,
                    <span key="y" className="t-mono-hash text-ink-2">{a.type}</span>,
                    statusPill(a.status),
                    <span key="n" className="text-ink-2">{a.normalized ? "Normalized" : "Raw"}</span>
                  ]
                }))}
                empty={null}
              />
            ) : null}

            <Card>
              <CardToolbar title="Review" description="Approve the package, send it back for stricter rollout steps, or export it as a Markdown bundle." />
              <CardFooter className="mt-6 flex-wrap justify-end">
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => { const exported = await fetch(`/api/handoff/packages/${selected.package.id}/export`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ format: "markdown_bundle" }) }).then((r) => r.json()).catch(() => null); if (exported?.ok) alert(`Export digest: ${exported.data.record.digest}`); else toast(apiErrorMessage(exported, "The export did not finish.")); }}
                  >
                    Export Markdown
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void review({ decision: "revision_requested", note: "Need stricter rollout steps" })}>
                    Request revision
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => void review({ decision: "approved" })}>
                    Approve
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </SettingsSection>
      ) : null}
    </SettingsShell>
  );
}

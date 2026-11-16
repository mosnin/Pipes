"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type SignalRole } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { RecordTable } from "@/components/settings/record-table";
import { sentenceCase } from "@/components/settings/fact-list";

const STATUS_ROLE: Record<string, SignalRole> = {
  active: "positive",
  published: "positive",
  candidate: "info",
  draft: "caution",
  retired: "neutral",
  archived: "neutral"
};


export default function OperationsSettingsPage() {
  const [presets, setPresets] = useState<any[]>([]);
  const [versions, setVersions] = useState<{ promptVersions: any[]; strategyVersions: any[] }>({ promptVersions: [], strategyVersions: [] });
  const [skills, setSkills] = useState<any[]>([]);
  const [loaded, setLoaded] = useState({ presets: false, versions: false, skills: false });

  useEffect(() => {
    fetch("/api/agent/presets").then((r) => r.json()).then((d) => { setPresets(d.data ?? []); setLoaded((l) => ({ ...l, presets: true })); });
    fetch("/api/agent/versions").then((r) => r.json()).then((d) => { setVersions(d.data ?? { promptVersions: [], strategyVersions: [] }); setLoaded((l) => ({ ...l, versions: true })); });
    fetch("/api/agent/skills").then((r) => r.json()).then((d) => { setSkills(d.data ?? []); setLoaded((l) => ({ ...l, skills: true })); });
  }, []);

  const status = (value: string) => <StatusPill role={STATUS_ROLE[value] ?? "neutral"}>{sentenceCase(value)}</StatusPill>;

  return (
    <SettingsShell title="Assistant settings" description="How the editor's AI assistant plans and proposes edits: its presets, prompt and strategy versions, and skill bindings. Agents that run workflows over MCP are not affected.">
      <SettingsSection title="Builder presets">
        <RecordTable
          loading={!loaded.presets}
          noun="preset"
          columns={[{ label: "Name" }, { label: "Batching" }, { label: "Review" }]}
          rows={presets.map((p) => ({
            key: p.id ?? p.name,
            cells: [<span key="n" className="t-body-strong">{p.name}</span>, <span key="b" className="text-ink-2">{sentenceCase(p.batchingPosture)}</span>, <span key="r" className="text-ink-2">{sentenceCase(p.reviewHint)}</span>]
          }))}
          empty={<EmptyState title="No builder presets" body="Presets set how large a batch an agent proposes and how closely it is reviewed." className="py-9" />}
        />
      </SettingsSection>

      <SettingsSection title="Prompt and strategy versions">
        <RecordTable
          loading={!loaded.versions}
          noun="version"
          columns={[{ label: "Type", className: "w-[120px]" }, { label: "Id" }, { label: "Status", className: "w-[128px]" }]}
          rows={[
            ...versions.promptVersions.map((p) => ({ key: `prompt-${p.id}`, cells: ["Prompt", <span key="i" className="t-mono-hash">{p.id}</span>, status(p.status)] })),
            ...versions.strategyVersions.map((s) => ({ key: `strategy-${s.id}`, cells: ["Strategy", <span key="i" className="t-mono-hash">{s.id}</span>, status(s.status)] }))
          ]}
          empty={<EmptyState title="No versions recorded" body="Prompt and strategy versions appear here once an agent run is tuned." className="py-9" />}
        />
      </SettingsSection>

      <SettingsSection title="Skill bindings">
        <RecordTable
          loading={!loaded.skills}
          noun="binding"
          columns={[{ label: "Skill" }, { label: "Version", numeric: true, className: "w-[96px]" }, { label: "Status", className: "w-[128px]" }]}
          rows={skills.map((s) => ({
            key: `${s.skillId}-${s.version}`,
            cells: [<span key="s" className="t-mono-hash">{s.skillId}</span>, String(s.version), status(s.status)]
          }))}
          empty={<EmptyState title="No skills bound" body="A skill binding pins the version of a skill agents in this workspace call." className="py-9" />}
        />
      </SettingsSection>
    </SettingsShell>
  );
}

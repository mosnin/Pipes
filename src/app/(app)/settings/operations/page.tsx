"use client";

import { useEffect, useState } from "react";
import { Card, Table } from "@/components/ui";
import { SettingsShell } from "@/components/settings/SettingsShell";

export default function OperationsSettingsPage() {
  const [presets, setPresets] = useState<any[]>([]);
  const [versions, setVersions] = useState<{ promptVersions: any[]; strategyVersions: any[] }>({ promptVersions: [], strategyVersions: [] });
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/agent/presets").then((r) => r.json()).then((d) => setPresets(d.data ?? []));
    fetch("/api/agent/versions").then((r) => r.json()).then((d) => setVersions(d.data ?? { promptVersions: [], strategyVersions: [] }));
    fetch("/api/agent/skills").then((r) => r.json()).then((d) => setSkills(d.data ?? []));
  }, []);

  return (
    <SettingsShell title="Agent operations & tuning" subtitle="Inspect preset, prompt, strategy, and skill tuning artifacts for this workspace.">
      <Card>
        <h3>Builder presets</h3>
        <Table headers={["Name", "Batching", "Review"]} rows={presets.map((p) => [p.name, p.batchingPosture, p.reviewHint])} />
      </Card>
      <Card>
        <h3>Prompt and strategy versions</h3>
        <Table headers={["Type", "Id", "Status"]} rows={[
          ...versions.promptVersions.map((p) => ["prompt", p.id, p.status]),
          ...versions.strategyVersions.map((s) => ["strategy", s.id, s.status])
        ]} />
      </Card>
      <Card>
        <h3>Skill version bindings</h3>
        <Table headers={["Skill", "Version", "Status"]} rows={skills.map((s) => [s.skillId, String(s.version), s.status])} />
      </Card>
    </SettingsShell>
  );
}

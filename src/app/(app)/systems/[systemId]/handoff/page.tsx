"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, EmptyState, Table } from "@/components/ui";

export default function SystemHandoffPage({ params }: { params: { systemId: string } }) {
  const [target, setTarget] = useState("human_engineer");
  const [packages, setPackages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [sandboxArtifacts, setSandboxArtifacts] = useState<any[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/handoff/systems/${params.systemId}/packages`);
    const data = await res.json();
    setPackages(data.data ?? []);
  }, [params.systemId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card>
        <h2>Implementation handoff</h2>
        <p>Generate build-ready handoff packages from accepted persisted system truth.</p>
        <div className="nav-inline">
          <select aria-label="Handoff target" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="human_engineer">Human engineer</option>
            <option value="codex">Codex</option>
            <option value="claude_code">Claude Code</option>
            <option value="general_llm_builder">General LLM builder</option>
          </select>
          <Button onClick={async () => {
            await fetch(`/api/handoff/systems/${params.systemId}/packages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target }) });
            await load();
          }}>Generate handoff package</Button>
        </div>
      </Card>

      <Card>
        {packages.length === 0 ? <EmptyState title="No handoff packages" description="Generate a package after your system design is accepted." /> : (
          <Table headers={["Title", "Target", "Status", "Version", "Action"]} rows={packages.map((p) => [p.title, p.target, p.status, String(p.version), "open"])} />
        )}
        <div style={{ display: "grid", gap: 8 }}>
          {packages.map((p) => (
            <Button key={p.id} onClick={async () => {
              const detail = await fetch(`/api/handoff/packages/${p.id}`).then((r) => r.json());
              setSelected(detail.data);
              const runId = detail.data?.package?.sourceRunId;
              if (runId) {
                const arts = await fetch(`/api/agent/runs/${runId}/sandbox/artifacts`).then((r) => r.json());
                setSandboxArtifacts(arts.data ?? []);
              } else setSandboxArtifacts([]);
            }}>Open {p.title}</Button>
          ))}
        </div>
      </Card>

      {selected ? (
        <Card>
          <h3>{selected.package.title}</h3>
          <p>Status: {selected.package.status}</p>
          <Table headers={["Artifact", "Type", "Target"]} rows={(selected.artifacts ?? []).map((a: any) => [a.title, a.type, a.target])} />

          {sandboxArtifacts.length > 0 ? <Table headers={["Sandbox artifact", "Type", "Status", "Trusted"]} rows={sandboxArtifacts.map((a: any) => [a.artifactId, a.type, a.status, a.normalized ? "normalized" : "raw"])} /> : null}
          <div className="nav-inline">
            <Button onClick={async () => { await fetch(`/api/handoff/packages/${selected.package.id}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "approved" }) }); const updated = await fetch(`/api/handoff/packages/${selected.package.id}`).then((r) => r.json()); setSelected(updated.data); await load(); }}>Approve</Button>
            <Button onClick={async () => { await fetch(`/api/handoff/packages/${selected.package.id}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "revision_requested", note: "Need stricter rollout steps" }) }); const updated = await fetch(`/api/handoff/packages/${selected.package.id}`).then((r) => r.json()); setSelected(updated.data); await load(); }}>Request revision</Button>
            <Button onClick={async () => { const exported = await fetch(`/api/handoff/packages/${selected.package.id}/export`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ format: "markdown_bundle" }) }).then((r) => r.json()); alert(`Export digest: ${exported.data.record.digest}`); }}>Export markdown</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

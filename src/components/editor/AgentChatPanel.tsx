"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Panel } from "@/components/ui";

type Session = { id: string; title: string };
type Run = { id: string; status: string };
type Event = { id: string; type: string; text?: string; status?: string; sequence: number; at: string };
type Proposal = { id: string; actionType: string; rationale: string; status: string; riskClass: string };
type Plan = { summary: string; status: string; confidence: number; steps: Array<{ id: string; title: string; toolNames: string[]; expectedActionTypes: string[] }> };
type ToolCall = { id: string; toolName: string; status: string; startedAt: string; completedAt?: string };
type Approval = { id: string; reason: string; status: string };
type StageRecord = { id: string; stage: string; status: string; summary?: string; at: string };
type RoleActivity = { id: string; role: string; stage: string; summary: string };
type PlanRevision = { id: string; version: number; summary: string; critique?: string; openQuestions: string[]; unresolvedRisks: string[] };
type ProposalBatch = { id: string; stage: string; summary: string; status: string; proposalIds: string[] };

export function AgentChatPanel({ systemId, systemName, systemDescription }: { systemId: string; systemName: string; systemDescription?: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [events, setEvents] = useState<Event[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [tools, setTools] = useState<ToolCall[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [stages, setStages] = useState<StageRecord[]>([]);
  const [roles, setRoles] = useState<RoleActivity[]>([]);
  const [revisions, setRevisions] = useState<PlanRevision[]>([]);
  const [batches, setBatches] = useState<ProposalBatch[]>([]);
  const [prompt, setPrompt] = useState("Plan and apply a safe reliability improvement, request approval for risky edits.");
  const [runStatus, setRunStatus] = useState("idle");
  const [activeRunId, setActiveRunId] = useState<string | undefined>();

  const assistantText = useMemo(() => events.filter((event) => event.type === "assistant_text_delta" || event.type === "assistant_text_completed").map((event) => event.text ?? "").join(""), [events]);

  const refreshSessions = useCallback(async () => {
    const res = await fetch(`/api/agent/sessions?systemId=${systemId}`, { cache: "no-store" });
    const body = await res.json();
    if (!body.ok) return;
    setSessions(body.data);
    if (!sessionId && body.data[0]) setSessionId(body.data[0].id);
  }, [sessionId, systemId]);

  const refreshRunArtifacts = async (runId?: string) => {
    if (!runId) return;
    const [pRes, aRes, tRes, planRes, stageRes, roleRes, revRes, batchRes] = await Promise.all([
      fetch(`/api/agent/proposals?runId=${runId}`, { cache: "no-store" }),
      fetch(`/api/agent/approvals?runId=${runId}`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/tools`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/plan`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/stages`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/roles`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/plan-revisions`, { cache: "no-store" }),
      fetch(`/api/agent/runs/${runId}/batches`, { cache: "no-store" })
    ]);
    const [pBody, aBody, tBody, planBody, stageBody, roleBody, revBody, batchBody] = await Promise.all([pRes.json(), aRes.json(), tRes.json(), planRes.json(), stageRes.json(), roleRes.json(), revRes.json(), batchRes.json()]);
    if (pBody.ok) setProposals(pBody.data);
    if (aBody.ok) setApprovals(aBody.data);
    if (tBody.ok) setTools(tBody.data);
    if (planBody.ok) setPlan(planBody.data);
    if (stageBody.ok) setStages(stageBody.data);
    if (roleBody.ok) setRoles(roleBody.data);
    if (revBody.ok) setRevisions(revBody.data);
    if (batchBody.ok) setBatches(batchBody.data);
  };

  useEffect(() => { void refreshSessions(); }, [refreshSessions]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const create = await fetch("/api/agent/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, title: `${systemName} Builder Session` }) });
    const body = await create.json();
    if (!body.ok) throw new Error(body.error ?? "session_create_failed");
    setSessionId(body.data.id);
    return body.data.id as string;
  };

  const runPrompt = async () => {
    const sid = await ensureSession();
    setRunStatus("planning");
    setEvents([]); setApprovals([]); setTools([]); setPlan(null); setProposals([]); setStages([]); setRoles([]); setRevisions([]); setBatches([]);
    const createRun = await fetch("/api/agent/runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: sid, systemId, message: prompt }) });
    const runBody = await createRun.json();
    if (!runBody.ok) return setRunStatus("failed");
    const run = runBody.data as { run: Run };
    setActiveRunId(run.run.id);

    const streamRes = await fetch(`/api/agent/runs/${run.run.id}/stream`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: prompt, systemName, systemDescription }) });
    if (!streamRes.body) return setRunStatus("failed");

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        if (!chunk.startsWith("data:")) continue;
        const payload = JSON.parse(chunk.slice(5).trim()) as Event;
        setEvents((prev) => [...prev, payload]);
        if (payload.status) setRunStatus(payload.status);
      }
      await refreshRunArtifacts(run.run.id);
    }
    await refreshRunArtifacts(run.run.id);
  };

  const decideApproval = async (requestId: string, decision: "approved" | "rejected") => {
    await fetch(`/api/agent/approvals/${requestId}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
    await refreshRunArtifacts(activeRunId);
  };

  return (
    <Panel title="Builder Agent">
      <p className="badge">System attached: {systemName}</p>
      <p className="badge">Run status: {runStatus}</p>
      <p className="badge">Current stage: {stages.at(-1)?.stage ?? "n/a"}</p>
      <div className="nav-inline" style={{ flexWrap: "wrap" }}>{sessions.map((s) => <Button key={s.id} onClick={() => setSessionId(s.id)}>{s.id === sessionId ? `• ${s.title}` : s.title}</Button>)}</div>
      <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the builder agent" />
      <Button onClick={runPrompt} disabled={runStatus === "tooling" || runStatus === "planning" || runStatus === "applying"}>Run</Button>

      <Card><h4>Current plan</h4>{plan ? <><p>{plan.summary} ({Math.round(plan.confidence * 100)}% confidence)</p><ul>{plan.steps.map((step) => <li key={step.id}>{step.title} · tools: {step.toolNames.join(", ")}</li>)}</ul></> : <p>No plan yet.</p>}</Card>
      <Card><h4>Plan revisions</h4>{revisions.length ? revisions.map((rev) => <p key={rev.id}>v{rev.version}: {rev.summary}{rev.critique ? ` · critique: ${rev.critique}` : ""}</p>) : <p>No revisions yet.</p>}</Card>
      <Card><h4>Specialist roles</h4>{roles.length ? roles.map((role) => <p key={role.id}>{role.role} @ {role.stage} · {role.summary}</p>) : <p>No role activity yet.</p>}</Card>
      <Card><h4>Tool activity</h4>{tools.length ? tools.map((tool) => <p key={tool.id}>{tool.toolName} · {tool.status}</p>) : <p>No tool calls yet.</p>}</Card>
      <Card><h4>Proposal batches</h4>{batches.length ? batches.map((batch) => <p key={batch.id}>{batch.stage} · {batch.summary} · {batch.status} ({batch.proposalIds.length} proposals)</p>) : <p>No batches yet.</p>}</Card>
      <Card>
        <h4>Pending approvals</h4>
        {approvals.filter((a) => a.status === "pending").map((approval) => (
          <div key={approval.id} style={{ marginBottom: 8 }}>
            <p>{approval.reason}</p>
            <div className="nav-inline"><Button onClick={() => decideApproval(approval.id, "approved")}>Approve</Button><Button onClick={() => decideApproval(approval.id, "rejected")}>Reject</Button></div>
          </div>
        ))}
        {approvals.filter((a) => a.status === "pending").length === 0 && <p>No pending approvals.</p>}
      </Card>
      <Card><h4>Action timeline</h4>{proposals.length ? proposals.map((p) => <p key={p.id}>{p.actionType} · {p.status} · {p.riskClass}</p>) : <p>No actions yet.</p>}</Card>
      <Card><h4>Assistant stream</h4><p>{assistantText || "No output yet."}</p></Card>
      <Card><h4>Run events</h4><div className="validation-list">{events.slice(-16).map((e) => <p key={e.id}>{e.sequence}. {e.type}{e.text ? ` · ${e.text.slice(0, 96)}` : ""}</p>)}</div></Card>
    </Panel>
  );
}
